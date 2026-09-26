import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkMoveToTrash,
  createFolder,
  createShareLink,
  deleteFile,
  deleteFolder,
  listFiles,
  listFolders,
  moveFile,
  moveFolder,
  renameFile,
  renameFolder,
  type BulkItemsRequest,
  type FileMetadata,
  type FolderMetadata,
  type ListFilesParams,
} from "../lib/api";

export function useFiles(folderId: number | null, filters: Omit<ListFilesParams, "folderId">) {
  return useQuery<FileMetadata[]>({
    queryKey: ["files", folderId, filters],
    queryFn: () => listFiles({ folderId: folderId ?? "root", ...filters }),
  });
}
export function useCreateShareLink() {
  return useMutation({
    mutationFn: ({ id, expiresIn }: { id: number; expiresIn?: number }) => createShareLink(id, expiresIn),
  });
}

export function useFolders(parentId: number | null) {
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
    mutationFn: ({ name, parentId }: { name: string; parentId: number | null }) =>
      createFolder(name, parentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameFile(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useRenameFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameFolder(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, folderId }: { id: number; folderId: number | null }) => moveFile(id, folderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useMoveFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parentId }: { id: number; parentId: number | null }) => moveFolder(id, parentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteFile(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteFolder(id),
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