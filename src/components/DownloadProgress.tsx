import { AnimatePresence, motion } from "framer-motion";
import { Download } from "lucide-react";

export interface DownloadState {
  name: string;
  /** 0-100, or null while the total size is unknown (indeterminate bar). */
  percent: number | null;
}

/** Floating card with a progress bar, shown above the "Add" button while a file downloads. */
export default function DownloadProgress({ download }: { download: DownloadState | null }) {
  return (
    <AnimatePresence>
      {download && (
        <motion.div
          key="download-progress"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16, transition: { duration: 0.15 } }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-x-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5.5rem)] z-40 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-xl sm:hidden"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Download className="h-[16px] w-[16px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-[14px] font-medium text-[var(--color-ink)]">{download.name}</p>
                <span className="shrink-0 text-[12px] text-[var(--color-ink-muted)]">
                  {download.percent === null ? "Downloading…" : `${download.percent}%`}
                </span>
              </div>
              <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                {download.percent === null ? (
                  <motion.div
                    className="absolute inset-y-0 w-1/3 rounded-full bg-[var(--color-accent)]"
                    animate={{ x: ["-100%", "300%"] }}
                    transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity }}
                  />
                ) : (
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-150"
                    style={{ width: `${download.percent}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
