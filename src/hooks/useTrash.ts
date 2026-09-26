import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  emptyTrash,
  listTrash,
  restoreAll,
  restoreFile,
  restoreFolder,
  type ListTrashParams,
  type TrashListing,
} from "../lib/api";

export function useTrash(filters: ListTrashParams) {
  return useQuery<TrashListing>({
    queryKey: ["trash", filters],
    queryFn: () => listTrash(filters),
  });
}

// Restoring can bring an item back into whatever folder/root view it came
// from, so every affected list needs to be refetched alongside the trash.
function invalidateAfterRestore(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["trash"] });
  queryClient.invalidateQueries({ queryKey: ["files"] });
  queryClient.invalidateQueries({ queryKey: ["folders"] });
}

export function useRestoreFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => restoreFile(id),
    onSuccess: () => invalidateAfterRestore(queryClient),
  });
}

export function useRestoreFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => restoreFolder(id),
    onSuccess: () => invalidateAfterRestore(queryClient),
  });
}

export function useRestoreAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => restoreAll(),
    onSuccess: () => invalidateAfterRestore(queryClient),
  });
}

export function useEmptyTrash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => emptyTrash(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trash"] }),
  });
}
