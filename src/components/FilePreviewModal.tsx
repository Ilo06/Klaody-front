import { useEffect, useState } from "react";
import { AlertCircle, Download, Loader2, MoreVertical, X } from "lucide-react";
import ActionSheet, { type ActionSheetItem } from "./ActionSheet";
import { ApiError, fetchFileBlob, type FileMetadata } from "../lib/api";
import { fileIcon } from "../lib/fileIcon";

const MAX_TEXT_PREVIEW_BYTES = 1_000_000;

function isTextPreviewable(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    ["application/json", "application/xml", "application/javascript", "application/x-yaml"].includes(mimeType)
  );
}

type PreviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; url: string; text?: string; tooLargeForText?: boolean };

interface FilePreviewModalProps {
  file: FileMetadata;
  onClose: () => void;
  onDownload: () => void;
  /** Row actions minus "Download" — that's already a dedicated header button here. */
  actions: ActionSheetItem[];
}

export default function FilePreviewModal({ file, onClose, onDownload, actions }: FilePreviewModalProps) {
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setState({ status: "loading" });

    fetchFileBlob(file.id)
      .then(async (blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);

        if (isTextPreviewable(file.mimeType)) {
          if (blob.size > MAX_TEXT_PREVIEW_BYTES) {
            setState({ status: "ready", url: objectUrl, tooLargeForText: true });
            return;
          }
          const text = await blob.text();
          if (!cancelled) setState({ status: "ready", url: objectUrl, text });
          return;
        }

        setState({ status: "ready", url: objectUrl });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-surface)] sm:items-center sm:justify-center sm:bg-black/50 sm:p-6">
      <div className="flex h-full w-full flex-col overflow-hidden sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-xl sm:border sm:border-[var(--color-border)] sm:bg-[var(--color-surface)] sm:shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon className="h-[18px] w-[18px] shrink-0 text-[var(--color-ink-muted)]" />
            <span className="truncate text-[15px]">{file.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onDownload}
              aria-label="Download"
              title="Download"
              className="rounded-full p-2.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
            >
              <Download className="h-[18px] w-[18px]" />
            </button>
            {actions.length > 0 && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-label="More actions"
                title="More actions"
                className="rounded-full p-2.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
              >
                <MoreVertical className="h-[18px] w-[18px]" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="rounded-full p-2.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-[var(--color-bg)] p-4">
          {state.status === "loading" && (
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-ink-muted)]" />
          )}

          {state.status === "error" && (
            <div className="flex flex-col items-center gap-2 text-center">
              <AlertCircle className="h-6 w-6 text-[var(--color-danger)]" />
              <p className="text-[14px] text-[var(--color-danger)]">{state.message}</p>
            </div>
          )}

          {state.status === "ready" && (
            <PreviewContent
              file={file}
              url={state.url}
              text={state.text}
              tooLargeForText={state.tooLargeForText}
            />
          )}
        </div>
      </div>

      {sheetOpen && <ActionSheet title={file.name} actions={actions} onClose={() => setSheetOpen(false)} />}
    </div>
  );
}

function PreviewContent({
  file,
  url,
  text,
  tooLargeForText,
}: {
  file: FileMetadata;
  url: string;
  text?: string;
  tooLargeForText?: boolean;
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
