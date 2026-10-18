import { useEffect, useRef, useState, type TouchEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ChevronLeft, ChevronRight, Download, Loader2, MoreVertical, X } from "lucide-react";
import ActionSheet, { type ActionSheetItem } from "./ActionSheet";
import { ApiError, fetchFileBlob, fetchImagePreviewBlob, type FileMetadata } from "../lib/api";
import { fileIcon } from "../lib/fileIcon";
import PdfViewer from "./PdfViewer";

const MAX_TEXT_PREVIEW_BYTES = 1_000_000;

// Raster formats the server can downscale. GIF/SVG are left alone (animation / vector).
const RESIZABLE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
// Bucketed so previews of the same size share the server-side cache.
const PREVIEW_WIDTHS = [480, 720, 1080, 1600];
const DESKTOP_MODAL_WIDTH = 896; // sm:max-w-4xl

// Smallest bucket that still looks sharp in the modal on this screen (device pixel ratio capped at 2). */
function previewWidth(): number {
  const cssWidth = Math.min(window.innerWidth, DESKTOP_MODAL_WIDTH);
  const pixels = Math.ceil(cssWidth * Math.min(window.devicePixelRatio || 1, 2));
  return PREVIEW_WIDTHS.find((width) => width >= pixels) ?? PREVIEW_WIDTHS[PREVIEW_WIDTHS.length - 1];
}

// Phones/tablets can't render a PDF inside an <iframe>, so they get the pdf.js viewer instead. */
function needsPdfJs(): boolean {
  return window.matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isTextPreviewable(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    ["application/json", "application/xml", "application/javascript", "application/x-yaml"].includes(mimeType)
  );
}

// `fileId` ties a result to the file it was loaded for, so that when the user navigates to another
// file we never render the previous file's (already revoked) object URL for a frame.
type PreviewState =
  | { status: "loading" }
  | { status: "error"; fileId: string; message: string }
  | { status: "ready"; fileId: string; url: string; text?: string; tooLargeForText?: boolean };

interface FilePreviewModalProps {
  file: FileMetadata;
  onClose: () => void;
  onDownload: () => void;
  /** Row actions minus "Download" — that's already a dedicated header button here. */
  actions: ActionSheetItem[];
  /** Where this file sits in the list being browsed, shown as "3 / 12" in the header. */
  position?: { index: number; total: number };
  /** Go to the previous / next file. Leave undefined when there is none (start / end of the list). */
  onPrev?: () => void;
  onNext?: () => void;
}

// Horizontal swipe needed to change file, and how much more horizontal than vertical it must be.
const SWIPE_MIN_DISTANCE = 60;
const SWIPE_DIRECTION_RATIO = 1.5;

export default function FilePreviewModal({
  file,
  onClose,
  onDownload,
  actions,
  position,
  onPrev,
  onNext,
}: FilePreviewModalProps) {
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  const [sheetOpen, setSheetOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Keyboard: ← / → to browse, Esc to close. Left alone while the actions sheet is open
  // or while focus is on a control that uses the arrow keys itself (video/audio seek, inputs).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (sheetOpen || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT", "VIDEO", "AUDIO"].includes(target.tagName)) return;

      if (event.key === "ArrowLeft" && onPrev) {
        event.preventDefault();
        onPrev();
      } else if (event.key === "ArrowRight" && onNext) {
        event.preventDefault();
        onNext();
      } else if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, onPrev, onNext, onClose]);

  const handleTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * SWIPE_DIRECTION_RATIO) return;
    if (dx > 0) onPrev?.();
    else onNext?.();
  };

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setState({ status: "loading" });

    // Images: load a reduced-size preview, falling back to the original if that fails.
    // Download always goes through downloadFile(), i.e. the full-resolution original.
    const request = RESIZABLE_IMAGE_TYPES.includes(file.mimeType)
      ? fetchImagePreviewBlob(file.id, previewWidth()).catch(() => fetchFileBlob(file.id))
      : fetchFileBlob(file.id);

    request
      .then(async (blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);

        if (isTextPreviewable(file.mimeType)) {
          if (blob.size > MAX_TEXT_PREVIEW_BYTES) {
            setState({ status: "ready", fileId: file.id, url: objectUrl, tooLargeForText: true });
            return;
          }
          const text = await blob.text();
          if (!cancelled) setState({ status: "ready", fileId: file.id, url: objectUrl, text });
          return;
        }

        setState({ status: "ready", fileId: file.id, url: objectUrl });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            fileId: file.id,
            message: err instanceof ApiError ? err.message : "Could not load the preview",
          });
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id, file.mimeType]);

  const Icon = fileIcon(file.mimeType);
  // A result that belongs to a previous file counts as "still loading" for the current one.
  const view: PreviewState = state.status !== "loading" && state.fileId !== file.id ? { status: "loading" } : state;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--color-surface)] sm:items-center sm:justify-center sm:bg-black/50 sm:p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex h-full w-full flex-col overflow-hidden sm:h-[85vh] sm:max-h-[85vh] sm:w-[90vw] sm:max-w-4xl sm:rounded-xl sm:border sm:border-[var(--color-border)] sm:bg-[var(--color-surface)] sm:shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 sm:pb-3 sm:pt-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon className="h-[18px] w-[18px] shrink-0 text-[var(--color-ink-muted)]" />
            <span className="truncate text-[14px] sm:text-[15px]">{file.name}</span>
            {position && position.total > 1 && (
              <span className="shrink-0 text-[12px] tabular-nums text-[var(--color-ink-muted)]">
                {position.index + 1} / {position.total}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onDownload}
              aria-label="Download"
              title="Download"
              className="rounded-full p-2 text-[var(--color-ink-muted)] sm:p-2.5 hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
            >
              <Download className="h-[18px] w-[18px]" />
            </button>
            {actions.length > 0 && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-label="More actions"
                title="More actions"
                className="rounded-full p-2 text-[var(--color-ink-muted)] sm:p-2.5 hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
              >
                <MoreVertical className="h-[18px] w-[18px]" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="rounded-full p-2 text-[var(--color-ink-muted)] sm:p-2.5 hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 bg-[var(--color-bg)]">
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex min-w-0 flex-1 items-center justify-center overflow-auto p-2 sm:p-4"
        >
          <AnimatePresence mode="wait" initial={false}>
            {view.status === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-ink-muted)]" />
              </motion.div>
            )}

            {view.status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex flex-col items-center gap-2 text-center"
              >
                <AlertCircle className="h-6 w-6 text-[var(--color-danger)]" />
                <p className="text-[14px] text-[var(--color-danger)]">{view.message}</p>
              </motion.div>
            )}

            {view.status === "ready" && (
              <motion.div
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="flex h-full w-full items-center justify-center"
              >
                <PreviewContent
                  file={file}
                  url={view.url}
                  text={view.text}
                  tooLargeForText={view.tooLargeForText}
                  onDownload={onDownload}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Arrows: desktop only (touch users swipe). They sit over the content edges. */}
        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous file"
            title="Previous (←)"
            className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/90 text-[var(--color-ink-muted)] shadow-md backdrop-blur transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            aria-label="Next file"
            title="Next (→)"
            className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/90 text-[var(--color-ink-muted)] shadow-md backdrop-blur transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
        </div>
      </motion.div>

      {sheetOpen && <ActionSheet title={file.name} actions={actions} onClose={() => setSheetOpen(false)} />}
    </motion.div>
  );
}

function PreviewContent({
  file,
  url,
  text,
  tooLargeForText,
  onDownload,
}: {
  file: FileMetadata;
  url: string;
  text?: string;
  tooLargeForText?: boolean;
  onDownload: () => void;
}) {
  const Icon = fileIcon(file.mimeType);

  if (file.mimeType.startsWith("image/")) {
    return <img src={url} alt={file.name} className="max-h-full max-w-full object-contain" />;
  }

  if (file.mimeType.startsWith("video/")) {
    return <video src={url} controls className="max-h-full max-w-full" />;
  }

  if (file.mimeType.startsWith("audio/")) {
    return <audio src={url} controls className="w-full max-w-md" />;
  }

  if (file.mimeType === "application/pdf") {
    if (needsPdfJs()) return <PdfViewer url={url} onDownload={onDownload} />;
    return (
      <iframe
        src={url}
        title={file.name}
        className="h-full w-full rounded-md border border-[var(--color-border)] bg-white"
      />
    );
  }

  if (tooLargeForText) {
    return (
      <div className="flex flex-col items-center gap-2 text-center text-[var(--color-ink-muted)]">
        <Icon className="h-8 w-8" />
        <p className="text-[14px]">This file is too large to preview — use Download instead.</p>
      </div>
    );
  }

  if (text !== undefined) {
    return (
      <pre className="h-full w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left text-[13px] leading-relaxed text-[var(--color-ink)]">
        {text}
      </pre>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center text-[var(--color-ink-muted)]">
      <Icon className="h-8 w-8" />
      <p className="text-[14px]">No preview available for this file type.</p>
    </div>
  );
}