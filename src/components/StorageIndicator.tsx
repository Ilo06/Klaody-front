import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useStorageInfo } from "../hooks/useFileBrowser";
import { formatBytes } from "../lib/format";
import StorageBreakdownModal from "./StorageBreakdownModal";

export default function StorageIndicator({ variant = "pill" }: { variant?: "pill" | "panel" }) {
  const { data } = useStorageInfo();
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  if (!data) return null;

  const usedBytes = Math.max(data.totalBytes - data.freeBytes, 0);
  const percentUsed = data.totalBytes > 0 ? Math.min(100, Math.round((usedBytes / data.totalBytes) * 100)) : 0;
  const usableLabel = `${data.usableGB.toFixed(data.usableGB < 10 ? 1 : 0)} GB`;

  const modal = (
    <AnimatePresence>
      {breakdownOpen && <StorageBreakdownModal key="breakdown" onClose={() => setBreakdownOpen(false)} />}
    </AnimatePresence>
  );

  if (variant === "panel") {
    return (
      <>
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-medium text-[var(--color-ink)]">Storage</span>
            <span className="text-[13px] text-[var(--color-ink-muted)]">{percentUsed}% used</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-[width]"
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <p className="mt-3 text-[13px] text-[var(--color-ink-muted)]">
            {formatBytes(usedBytes)} of {formatBytes(data.totalBytes)}
          </p>
          <button
            type="button"
            onClick={() => setBreakdownOpen(true)}
            aria-label="Show storage breakdown by file type"
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--color-accent)] active:opacity-70"
          >
            View breakdown
            <ArrowUpRight className="h-[13px] w-[13px]" />
          </button>
        </div>
        {modal}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setBreakdownOpen(true)}
        aria-label="Show storage breakdown by file type"
        title={`${formatBytes(usedBytes)} used of ${formatBytes(data.totalBytes)} · ${usableLabel} usable — click for breakdown by type`}
        className="flex min-w-0 cursor-pointer items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-[11px] font-medium text-[var(--color-ink-muted)] shadow-lg hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)] sm:px-4 sm:py-2.5 sm:text-[13px]"
      >
        <span className="h-1.5 w-6 shrink-0 overflow-hidden rounded-full bg-[var(--color-border)] sm:w-12">
          <span
            className="block h-full rounded-full bg-[var(--color-accent)] transition-[width]"
            style={{ width: `${percentUsed}%` }}
          />
        </span>
        <span className="hidden whitespace-nowrap sm:inline">{usableLabel} free</span>
        <span className="whitespace-nowrap sm:hidden">{usableLabel}</span>
      </button>
      {modal}
    </>
  );
}
