import axios, { type AxiosProgressEvent } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

// Must match AuthContext's TOKEN_KEY — duplicated here so this module has no
// dependency on the context tree and can be used from anywhere (hooks, utils).
const TOKEN_KEY = "klaody.token";

/** Dispatched on any 401 response so AuthContext can clear the session. */
export const AUTH_EXPIRED_EVENT = "klaody:auth-expired";

export interface LoginResponse {
  token: string;
  expiresIn: number;
}

export interface FileMetadata {
  id: number;
  name: string;
  mimeType: string;
  size: number;
  folderId: number | null;
  uploadedAt: string;
  deletedAt: string | null;
}

export interface FolderMetadata {
  id: number;
  name: string;
  parentId: number | null;
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
  id: number;
  name: string;
  size: number;
  folderId: number | null;
}

export interface ListFilesParams {
  folderId?: number | "root";
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
  parentId?: number | "root";
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
  id: number;
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

export async function uploadFile(
  file: File,
  folderId: number | null,
  options: { signal?: AbortSignal; onProgress?: (percent: number) => void } = {},
): Promise<FileUploadResponse> {
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

async function fetchFileResponse(id: number) {
  return apiClient.get<Blob>(`/files/${id}`, { responseType: "blob" });
}

//Fetches a file's bytes without triggering a save — for in-app preview
export async function fetchFileBlob(id: number): Promise<Blob> {
  const response = await fetchFileResponse(id);
  return response.data;
}

export async function downloadFile(id: number, fallbackName: string): Promise<void> {
  const response = await fetchFileResponse(id);
  const filename = parseFilenameFromDisposition(response.headers["content-disposition"]) ?? fallbackName;
  triggerBrowserDownload(response.data, filename);
}

export async function renameFile(id: number, name: string): Promise<FileMetadata> {
  const { data } = await apiClient.patch<FileMetadata>(`/files/${id}/rename`, { name });
  return data;
}

export async function moveFile(id: number, folderId: number | null): Promise<FileMetadata> {
  const { data } = await apiClient.patch<FileMetadata>(`/files/${id}/move`, { folderId });
  return data;
}

export async function deleteFile(id: number): Promise<void> {
  await apiClient.delete(`/files/${id}`);
}

export interface ShareResponse {
  token: string;
  expiresAt: string | null;
}

export function getShareUrl(token: string): string {
  return `${API_BASE_URL}/share/${token}`;
}

export async function createShareLink(id: number, expiresIn?: number): Promise<ShareResponse> {
  const { data } = await apiClient.post<ShareResponse>(`/files/${id}/share`, expiresIn ? { expiresIn } : {});
  return data;
}

// --- Folders ------------------------------------------------------------------

export async function listFolders(params: ListFoldersParams = {}): Promise<FolderMetadata[]> {
  const { data } = await apiClient.get<FolderMetadata[]>("/folders", { params });
  return data;
}

export async function createFolder(name: string, parentId: number | null): Promise<FolderMetadata> {
  const { data } = await apiClient.post<FolderMetadata>("/folders", { name, parentId });
  return data;
}

export async function renameFolder(id: number, name: string): Promise<FolderMetadata> {
  const { data } = await apiClient.patch<FolderMetadata>(`/folders/${id}/rename`, { name });
  return data;
}

export async function moveFolder(id: number, parentId: number | null): Promise<FolderMetadata> {
  const { data } = await apiClient.patch<FolderMetadata>(`/folders/${id}/move`, { parentId });
  return data;
}

export async function deleteFolder(id: number): Promise<void> {
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
  fileIds?: number[];
  folderIds?: number[];
}

export interface BulkItemRef {
  type: "file" | "folder";
  id: number;
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

export async function restoreFile(id: number): Promise<FileMetadata> {
  const { data } = await apiClient.post<FileMetadata>(`/trash/files/${id}/restore`);
  return data;
}

export async function restoreFolder(id: number): Promise<FolderMetadata> {
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

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
