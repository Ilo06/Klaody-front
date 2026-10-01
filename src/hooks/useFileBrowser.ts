import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkMoveToTrash,
  createFolder,
  createShareLink,
  deleteFile,
  deleteFolder,
  getStorageInfo,
  listFiles,
  listFolders,
  moveFile,
  searchImages,
  moveFolder,
  renameFile,
  renameFolder,
  type BulkItemsRequest,
  type FileMetadata,
  type FolderMetadata,
  type ImageSearchResult,
  type ListFilesParams,
  type StorageInfo,
} from "../lib/api";

/** Disk usage for the storage volume. Refreshed manually after uploads/emptying the trash. */
export function useStorageInfo() {
  return useQuery<StorageInfo>({
    queryKey: ["storage"],
    queryFn: getStorageInfo,
    staleTime: 30_000,
  });
}

/** How often to re-check a folder while some of its images are still being indexed. */
const INDEXING_POLL_MS = 3_000;

export function useFiles(folderId: string | null, filters: Omit<ListFilesParams, "folderId">) {
  return useQuery<FileMetadata[]>({
    queryKey: ["files", folderId, filters],
    queryFn: () => listFiles({ folderId: folderId ?? "root", ...filters }),
    
    refetchInterval: (query) =>
      query.state.data?.some((file) => file.indexStatus === "PENDING") ? INDEXING_POLL_MS : false,
  });
}

/** Shortest content-search query worth sending (each search runs a model inference on the server). */
export const MIN_CONTENT_QUERY_LENGTH = 2;

export function useImageSearch(query: string) {
  const q = query.trim();
  return useQuery<ImageSearchResult[]>({
    queryKey: ["files", "search", q],
    queryFn: ({ signal }) => searchImages(q, { limit: 50, signal }),
    enabled: q.length >= MIN_CONTENT_QUERY_LENGTH,
    staleTime: 30_000,
  });
}

export function useCreateShareLink() {
  return useMutation({
    mutationFn: ({ id, expiresIn }: { id: string; expiresIn?: number }) => createShareLink(id, expiresIn),
  });
}

export function useFolders(parentId: string | null) {
  return useQuery<FolderMetadata[]>({
    queryKey: ["folders", parentId],
    queryFn: () => listFolders({ parentId: parentId ?? "root" }),
  });
}

/**
 * Every non-trashed folder the user owns. Used to resolve breadcrumb ancestry
 * and to label folders in the move picker without a "get folder by id" route.
 */
export function useAllFolders() {
  return useQuery<FolderMetadata[]>({
    queryKey: ["folders", "all"],
    queryFn: () => listFolders(),
    staleTime: 30_000,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string | null }) =>
      createFolder(name, parentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameFile(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useRenameFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameFolder(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) => moveFile(id, folderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useMoveFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) => moveFolder(id, parentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFile(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

/** Bulk equivalent of `useDeleteFile`/`useDeleteFolder` — moves several items to the trash at once. */
export function useBulkDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: BulkItemsRequest) => bulkMoveToTrash(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}
