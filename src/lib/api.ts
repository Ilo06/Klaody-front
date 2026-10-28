import axios, { type AxiosProgressEvent } from "axios";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

// Must match AuthContext's TOKEN_KEY — duplicated here so this module has no
// dependency on the context tree and can be used from anywhere (hooks, utils).
const TOKEN_KEY = "klaody.token";

/** Matches any canonical UUID (v1–v8), used to validate ids coming from the URL. */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Dispatched on any 401 response so AuthContext can clear the session. */
export const AUTH_EXPIRED_EVENT = "klaody:auth-expired";

export interface LoginResponse {
  token: string;
  expiresIn: number;
}

/**
 * State of the background CLIP indexing that powers content search.
 * NONE = not an indexable image, PENDING = queued, DONE = searchable, FAILED = gave up after retries.
 */
export type IndexStatus = "NONE" | "PENDING" | "DONE" | "FAILED";

export interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  uploadedAt: string;
  deletedAt: string | null;
  /** Absent on endpoints that don't report it (e.g. the trash). */
  indexStatus?: IndexStatus;
}

/** A content-search hit: a normal file plus how close it is to the query (higher = closer). */
export interface ImageSearchResult extends FileMetadata {
  similarity: number;
}

export interface FolderMetadata {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface StorageInfo {
  totalBytes: number;
  freeBytes: number;
  availableBytes: number;
  reservedBytes: number;
  usableBytes: number;
  usableGB: number;
}

export interface FileUploadResponse {
  id: string;
  name: string;
  size: number;
  folderId: string | null;
  indexStatus?: IndexStatus;
}

export interface ListFilesParams {
  folderId?: string | "root";
  name?: string;
  mimeType?: string;
  minSize?: number;
  maxSize?: number;
  uploadedAfter?: string;
  uploadedBefore?: string;
  sortBy?: "name" | "size" | "uploadedAt";
  order?: "asc" | "desc";
}

export interface ListFoldersParams {
  parentId?: string | "root";
  name?: string;
  createdAfter?: string;
  createdBefore?: string;
  sortBy?: "name" | "createdAt";
  order?: "asc" | "desc";
}

/**
 * Thrown for any failed request. `status` is 0 for a network failure
 * (no response reached the client at all).
 */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface CurrentUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new ApiError(0, "Could not reach the server");
  }

  if (!response.ok) {
    let message = "Something went wrong";
    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // Response had no JSON body; fall back to the generic message.
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as LoginResponse;
}

// --- Authenticated client for everything past login -----------------------

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Let cancelled requests (e.g. an aborted upload) pass through unchanged
    // so callers can tell a deliberate cancel apart from a real failure.
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status ?? 0;
    if (status === 401) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }

    const message =
      (error.response?.data as { error?: string } | undefined)?.error ??
      (status === 0 ? "Could not reach the server" : "Something went wrong");
    return Promise.reject(new ApiError(status, message));
  },
);

export function isCancelledUpload(error: unknown): boolean {
  return axios.isCancel(error);
}

// --- Auth -------------------------------------------------------------------

export async function getMe(): Promise<CurrentUser> {
  const { data } = await apiClient.get<CurrentUser>("/auth/me");
  return data;
}

export async function registerUser(
  email: string,
  password: string,
  isAdmin: boolean,
): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/register", { email, password, isAdmin });
  return data;
}

// --- Files ------------------------------------------------------------------

export async function listFiles(params: ListFilesParams = {}): Promise<FileMetadata[]> {
  const { data } = await apiClient.get<FileMetadata[]>("/files", { params });
  return data;
}

export interface SearchImagesOptions {
  limit?: number;
  /** Overrides the server's default similarity threshold (-1..1). */
  minSimilarity?: number;
  signal?: AbortSignal;
}

/** Content search: images whose *content* matches the text (e.g. "car"), best match first. */
export async function searchImages(q: string, options: SearchImagesOptions = {}): Promise<ImageSearchResult[]> {
  const { limit, minSimilarity, signal } = options;
  const { data } = await apiClient.get<ImageSearchResult[]>("/files/search", {
    params: { q, limit, minSimilarity },
    signal,
  });
  return data;
}

/** Files larger than this are sent with the resumable chunked protocol instead of one multipart request. */
export const CHUNKED_UPLOAD_THRESHOLD = 200 * 1024 * 1024; // 200 MB
const MAX_PARALLEL_CHUNKS = 3;
const MAX_CHUNK_RETRIES = 3;

interface UploadSessionInfo {
  uploadId: string;
  chunkSize: number;
  totalChunks: number;
  receivedChunks: number[];
}

type UploadOptions = { signal?: AbortSignal; onProgress?: (percent: number) => void };

export async function uploadFile(
  file: File,
  folderId: string | null,
  options: UploadOptions = {},
): Promise<FileUploadResponse> {
  if (file.size > CHUNKED_UPLOAD_THRESHOLD) {
    return uploadFileChunked(file, folderId, options);
  }

  const formData = new FormData();
  formData.append("file", file);
  if (folderId !== null) formData.append("folderId", String(folderId));

  const { data } = await apiClient.post<FileUploadResponse>("/files", formData, {
    signal: options.signal,
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (options.onProgress && event.total) {
        options.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
  return data;
}

// Remembers the server-side session of an interrupted upload so the same file can resume.
function resumeKey(file: File, folderId: string | null): string {
  return `klaody.upload.${folderId ?? "root"}.${file.name}.${file.size}.${file.lastModified}`;
}

function readResumeId(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeResumeId(key: string, id: string | null) {
  try {
    if (id === null) localStorage.removeItem(key);
    else localStorage.setItem(key, id);
  } catch {
    // Storage unavailable: the upload still works, it just can't be resumed after a reload.
  }
}

async function uploadFileChunked(
  file: File,
  folderId: string | null,
  { signal, onProgress }: UploadOptions,
): Promise<FileUploadResponse> {
  const key = resumeKey(file, folderId);

  // 1) Resume a previous session if the server still knows it, otherwise start a new one.
  let session: UploadSessionInfo | null = null;
  const savedId = readResumeId(key);
  if (savedId) {
    try {
      const { data } = await apiClient.get<UploadSessionInfo>(`/files/uploads/${savedId}`, { signal });
      session = data;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      writeResumeId(key, null); // expired or deleted: start over
    }
  }
  if (!session) {
    const { data } = await apiClient.post<UploadSessionInfo>(
      "/files/uploads",
      { name: file.name, size: file.size, mimeType: file.type || undefined, folderId },
      { signal },
    );
    session = data;
    writeResumeId(key, session.uploadId);
  }

  const { uploadId, chunkSize, totalChunks } = session;
  const chunkBytes = (index: number) => Math.min(chunkSize, file.size - index * chunkSize);

  // 2) Progress: bytes confirmed + bytes in flight, capped at 99 until the server assembled the file.
  const loaded = new Array<number>(totalChunks).fill(0);
  for (const index of session.receivedChunks) loaded[index] = chunkBytes(index);
  const report = () => {
    if (!onProgress) return;
    const sent = loaded.reduce((a, b) => a + b, 0);
    onProgress(Math.min(99, Math.floor((sent / file.size) * 100)));
  };
  report();

  const received = new Set(session.receivedChunks);
  const pending: number[] = [];
  for (let i = 0; i < totalChunks; i++) if (!received.has(i)) pending.push(i);

  const sendChunk = async (index: number) => {
    const start = index * chunkSize;
    const blob = file.slice(start, start + chunkBytes(index));
    for (let attempt = 0; ; attempt++) {
      try {
        await apiClient.put(`/files/uploads/${uploadId}/chunks/${index}`, blob, {
          signal,
          headers: { "Content-Type": "application/octet-stream" },
          onUploadProgress: (event: AxiosProgressEvent) => {
            loaded[index] = Math.min(event.loaded, blob.size);
            report();
          },
        });
        loaded[index] = blob.size;
        report();
        return;
      } catch (error) {
        loaded[index] = 0;
        report();
        if (axios.isCancel(error)) throw error;
        const status = error instanceof ApiError ? error.status : 0;
        const retryable = status === 0 || status >= 500;
        if (!retryable || attempt >= MAX_CHUNK_RETRIES) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
  };

  try {
    // 3) Small worker pool over the missing chunks.
    let failure: unknown = null;
    const worker = async () => {
      while (failure === null) {
        const index = pending.shift();
        if (index === undefined) return;
        try {
          await sendChunk(index);
        } catch (error) {
          failure = error;
          return;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_CHUNKS, pending.length) }, worker));
    if (failure !== null) throw failure;

    // 4) Ask the server to assemble the file.
    const { data } = await apiClient.post<FileUploadResponse>(`/files/uploads/${uploadId}/complete`, null, { signal });
    writeResumeId(key, null);
    onProgress?.(100);
    return data;
  } catch (error) {
    if (axios.isCancel(error)) {
      // Deliberate cancel: drop the server session. Other failures keep it so a retry resumes.
      writeResumeId(key, null);
      await apiClient.delete(`/files/uploads/${uploadId}`).catch(() => undefined);
    }
    throw error;
  }
}

async function fetchFileResponse(id: string) {
  return apiClient.get<Blob>(`/files/${id}`, { responseType: "blob" });
}

//Fetches a file's bytes without triggering a save — for in-app preview
export async function fetchFileBlob(id: string): Promise<Blob> {
  const response = await fetchFileResponse(id);
  return response.data;
}

/**
 * Reduced-size copy of an image (resized server-side to `width` px, never upscaled) for the in-app
 * preview. The original is only ever fetched by `downloadFile`.
 */
export async function fetchImagePreviewBlob(id: string, width: number): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/files/${id}/preview`, {
    params: { width },
    responseType: "blob",
  });
  return data;
}

export async function downloadFile(id: string, fallbackName: string): Promise<void> {
  const response = await fetchFileResponse(id);
  const filename = parseFilenameFromDisposition(response.headers["content-disposition"]) ?? fallbackName;
  await triggerBrowserDownload(response.data, filename);
}

export async function renameFile(id: string, name: string): Promise<FileMetadata> {
  const { data } = await apiClient.patch<FileMetadata>(`/files/${id}/rename`, { name });
  return data;
}

export async function moveFile(id: string, folderId: string | null): Promise<FileMetadata> {
  const { data } = await apiClient.patch<FileMetadata>(`/files/${id}/move`, { folderId });
  return data;
}

export async function deleteFile(id: string): Promise<void> {
  await apiClient.delete(`/files/${id}`);
}

export interface ShareResponse {
  token: string;
  expiresAt: string | null;
}

export function getShareUrl(token: string): string {
  return `${API_BASE_URL}/share/${token}`;
}

export async function createShareLink(id: string, expiresIn?: number): Promise<ShareResponse> {
  const { data } = await apiClient.post<ShareResponse>(`/files/${id}/share`, expiresIn ? { expiresIn } : {});
  return data;
}

// --- Folders ------------------------------------------------------------------

export async function listFolders(params: ListFoldersParams = {}): Promise<FolderMetadata[]> {
  const { data } = await apiClient.get<FolderMetadata[]>("/folders", { params });
  return data;
}

export async function createFolder(name: string, parentId: string | null): Promise<FolderMetadata> {
  const { data } = await apiClient.post<FolderMetadata>("/folders", { name, parentId });
  return data;
}

export async function renameFolder(id: string, name: string): Promise<FolderMetadata> {
  const { data } = await apiClient.patch<FolderMetadata>(`/folders/${id}/rename`, { name });
  return data;
}

export async function moveFolder(id: string, parentId: string | null): Promise<FolderMetadata> {
  const { data } = await apiClient.patch<FolderMetadata>(`/folders/${id}/move`, { parentId });
  return data;
}

export async function deleteFolder(id: string): Promise<void> {
  await apiClient.delete(`/folders/${id}`);
}

// --- Trash --------------------------------------------------------------------

export interface ListTrashParams {
  type?: "file" | "folder";
  name?: string;
  deletedAfter?: string;
  deletedBefore?: string;
}

/** Only top-level trashed items: children of a trashed folder ride along with it. */
export interface TrashListing {
  files: FileMetadata[];
  folders: FolderMetadata[];
}

/** At most 1000 ids (files + folders combined); duplicates are ignored by the API. */
export interface BulkItemsRequest {
  fileIds?: string[];
  folderIds?: string[];
}

export interface BulkItemRef {
  type: "file" | "folder";
  id: string;
}

export interface BulkFailure extends BulkItemRef {
  status: 404 | 409;
  error: string;
}

/** Every item is attempted independently — check `failed` even on a 200. */
export interface BulkResult {
  succeeded: BulkItemRef[];
  failed: BulkFailure[];
}

export interface EmptyTrashResult {
  deletedFiles: number;
  deletedFolders: number;
}

export async function listTrash(params: ListTrashParams = {}): Promise<TrashListing> {
  const { data } = await apiClient.get<TrashListing>("/trash", { params });
  return data;
}

/** Bulk equivalent of `deleteFile`/`deleteFolder`. Folders are trashed recursively. */
export async function bulkMoveToTrash(items: BulkItemsRequest): Promise<BulkResult> {
  const { data } = await apiClient.post<BulkResult>("/trash", items);
  return data;
}

export async function restoreFile(id: string): Promise<FileMetadata> {
  const { data } = await apiClient.post<FileMetadata>(`/trash/files/${id}/restore`);
  return data;
}

export async function restoreFolder(id: string): Promise<FolderMetadata> {
  const { data } = await apiClient.post<FolderMetadata>(`/trash/folders/${id}/restore`);
  return data;
}

/** Bulk equivalent of `restoreFile`/`restoreFolder`. Folders are restored before their contents. */
export async function bulkRestore(items: BulkItemsRequest): Promise<BulkResult> {
  const { data } = await apiClient.post<BulkResult>("/trash/restore", items);
  return data;
}

/** Restores every top-level trashed item (each folder brings its contents back with it). */
export async function restoreAll(): Promise<BulkResult> {
  const { data } = await apiClient.post<BulkResult>("/trash/restore-all");
  return data;
}

/** Permanently deletes everything in the trash, file contents included. Cannot be undone. */
export async function emptyTrash(): Promise<EmptyTrashResult> {
  const { data } = await apiClient.delete<EmptyTrashResult>("/trash");
  return data;
}

// --- System ---------------------------------------------------------------

export async function getStorageInfo(): Promise<StorageInfo> {
  const { data } = await apiClient.get<StorageInfo>("/storage");
  return data;
}

// --- Helpers ------------------------------------------------------------------

function parseFilenameFromDisposition(disposition?: string): string | null {
  if (!disposition) return null;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8Match) return decodeURIComponent(utf8Match[1]);
  const quotedMatch = /filename="([^"]+)"/i.exec(disposition);
  if (quotedMatch) return quotedMatch[1];
  const bareMatch = /filename=([^;]+)/i.exec(disposition);
  return bareMatch ? bareMatch[1].trim() : null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Web: classic <a download> click.
 * Native app (Capacitor): the WebView can't save blobs that way, so the file is written to the app
 * cache and handed to the Android share sheet (the user picks "Save to…" or another app).
 */
async function triggerBrowserDownload(blob: Blob, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const safeName = filename.replace(/[\\/:*?"<>|]/g, "_");
    const data = await blobToBase64(blob);
    const saved = await Filesystem.writeFile({
      path: safeName,
      data,
      directory: Directory.Cache,
    });
    await Share.share({ title: safeName, url: saved.uri });
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}