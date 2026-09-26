import { useStorageInfo } from "../hooks/useFileBrowser";
import { formatBytes } from "../lib/format";

/**
 * Small disk-usage pill meant to sit next to the Trash button. Renders
 * nothing while loading or on error — this is a non-critical accessory,
 * not worth showing a spinner or error state for.
 *
 * Shows a mini progress bar + "X GB free" on sm+ screens; on narrow
 * screens the label shrinks to a bare number so it never crowds the
 * Trash button it sits beside.
 */
export default function StorageIndicator() {
  const { data } = useStorageInfo();
  if (!data) return null;

  const usedBytes = Math.max(data.totalBytes - data.freeBytes, 0);
  const percentUsed = data.totalBytes > 0 ? Math.min(100, Math.round((usedBytes / data.totalBytes) * 100)) : 0;
  const usableLabel = `${data.usableGB.toFixed(data.usableGB < 10 ? 1 : 0)} GB`;

  return (
    <div
      title={`${formatBytes(usedBytes)} used of ${formatBytes(data.totalBytes)} · ${usableLabel} usable`}
      className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[12px] font-medium text-[var(--color-ink-muted)] shadow-lg sm:px-4 sm:text-[13px]"
    >
      <span className="h-1.5 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--color-border)] sm:w-12">
        <span
          className="block h-full rounded-full bg-[var(--color-accent)] transition-[width]"
          style={{ width: `${percentUsed}%` }}
        />
      </span>
      <span className="hidden whitespace-nowrap sm:inline">{usableLabel} free</span>
      <span className="whitespace-nowrap sm:hidden">{usableLabel}</span>
    </div>
  );
}