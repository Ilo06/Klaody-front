import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./api";

export type BreakdownKey = "images" | "videos" | "audio" | "pdf" | "documents" | "archives" | "other";

export interface BreakdownCategory {
  key: BreakdownKey;
  label: string;
  bytes: number;
  count: number;
  /** 0-100, one decimal. */
  percentage: number;
}

export interface StorageBreakdown {
  totalBytes: number;
  totalFiles: number;
  categories: BreakdownCategory[];
  trash: { bytes: number; count: number };
}

export async function getStorageBreakdown(): Promise<StorageBreakdown> {
  const { data } = await apiClient.get<StorageBreakdown>("/storage/breakdown");
  return data;
}

/** Only fetched while the breakdown modal is open (`enabled`). */
export function useStorageBreakdown(enabled: boolean) {
  return useQuery<StorageBreakdown>({
    queryKey: ["storage", "breakdown"],
    queryFn: getStorageBreakdown,
    enabled,
    staleTime: 15_000,
  });
}
