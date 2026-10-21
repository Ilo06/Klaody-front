import { createPortal } from "react-dom";
import { AlertCircle } from "lucide-react";
import Modal from "./Modal";
import { Skeleton } from "./Skeleton";
import { ApiError } from "../lib/api";
import { formatBytes } from "../lib/format";
import { useStorageBreakdown, type BreakdownKey } from "../lib/storageBreakdown";

// Distinct, theme-safe colors (each also has a label + percentage, so color is never the only cue).
const COLORS: Record<BreakdownKey, string> = {
  images: "#4f7cac",
  videos: "#8a6fb3",
  audio: "#c9a227",
  pdf: "#c05a4a",
  documents: "#4d9a7e",
  archives: "#9a7b5a",
  other: "#8c8c8c",
};

function formatPercent(value: number): string {
  return value > 0 && value < 0.1 ? "<0.1%" : `${value.toFixed(1)}%`;
}

export default function StorageBreakdownModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading, error } = useStorageBreakdown(true);

  return createPortal(
    <Modal title="Storage by type" onClose={onClose}>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : error ? (
        <p className="flex items-center gap-1.5 text-[13px] text-[var(--color-danger)]">
          <AlertCircle className="h-[13px] w-[13px] shrink-0" />
          {error instanceof ApiError ? error.message : "Could not load the breakdown"}
        </p>
      ) : !data || data.totalFiles === 0 ? (
        <p className="text-[14px] text-[var(--color-ink-muted)]">No files yet.</p>
      ) : (
        <div>
          <p className="text-[13px] text-[var(--color-ink-muted)]">
            {formatBytes(data.totalBytes)} across {data.totalFiles} file{data.totalFiles === 1 ? "" : "s"}
          </p>

          <div
            className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-[var(--color-border)]"
            role="img"
            aria-label={data.categories.map((c) => `${c.label} ${formatPercent(c.percentage)}`).join(", ")}
          >
            {data.categories.map((category) => (
              <div
                key={category.key}
                title={`${category.label}: ${formatPercent(category.percentage)}`}
                style={{ width: `${category.percentage}%`, backgroundColor: COLORS[category.key] }}
              />
            ))}
          </div>

          <ul className="mt-5 space-y-3">
            {data.categories.map((category) => (
              <li key={category.key} className="flex items-center gap-3 text-[14px]">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[category.key] }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{category.label}</span>
                  <span className="block text-[12px] text-[var(--color-ink-muted)]">
                    {category.count} file{category.count === 1 ? "" : "s"} · {formatBytes(category.bytes)}
                  </span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">{formatPercent(category.percentage)}</span>
              </li>
            ))}
          </ul>

          {data.trash.count > 0 && (
            <p className="mt-5 border-t border-[var(--color-border)] pt-3 text-[12px] text-[var(--color-ink-muted)]">
              Not counted: {data.trash.count} item{data.trash.count === 1 ? "" : "s"} in the trash (
              {formatBytes(data.trash.bytes)}), still using disk space until the trash is emptied.
            </p>
          )}
        </div>
      )}
    </Modal>,
    document.body,
  );
}
