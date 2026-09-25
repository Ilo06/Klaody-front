import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertCircle, File as FileIcon, UploadCloud, X } from "lucide-react";
import { ApiError, isCancelledUpload, uploadFile } from "../lib/api";
import { formatBytes } from "../lib/format";
import { useToast } from "./Toast";

interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "error";
  error?: string;
  controller: AbortController;
}

export interface UploadDropzoneHandle {
  /** Opens the native file picker — used by the mobile "+" menu. */
  open: () => void;
}

interface UploadDropzoneProps {
  folderId: number | null;
  onUploaded: () => void;
}

/**
 * Drag-and-drop target for desktop/tablet. On mobile the visible drop area
 * is hidden (`hidden sm:flex`) — the hidden file input still renders at the
 * top level and can be opened imperatively, e.g. from the FAB's "+" menu.
 */
const UploadDropzone = forwardRef<UploadDropzoneHandle, UploadDropzoneProps>(function UploadDropzone(
  { folderId, onUploaded },
  ref,
) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const { showToast } = useToast();

  const removeUpload = (id: string) => {
    setUploads((current) => current.filter((upload) => upload.id !== id));
  };

  const uploadOne = useCallback(
    (file: File) => {
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      const controller = new AbortController();
      setUploads((current) => [
        ...current,
        { id, name: file.name, size: file.size, progress: 0, status: "uploading", controller },
      ]);

      uploadFile(file, folderId, {
        signal: controller.signal,
        onProgress: (percent) => {
          setUploads((current) => current.map((u) => (u.id === id ? { ...u, progress: percent } : u)));
        },
      })
        .then(() => {
          onUploaded();
          removeUpload(id);
        })
        .catch((err) => {
          if (isCancelledUpload(err)) return;
          const message = err instanceof ApiError ? err.message : "Upload failed";
          setUploads((current) => current.map((u) => (u.id === id ? { ...u, status: "error", error: message } : u)));
          showToast(`${file.name}: ${message}`, "error");
        });
    },
    [folderId, onUploaded, showToast],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach(uploadOne);
    },
    [uploadOne],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  useImperativeHandle(ref, () => ({ open }), [open]);

  const cancelUpload = (id: string) => {
    setUploads((current) => {
      current.find((upload) => upload.id === id)?.controller.abort();
      return current.filter((upload) => upload.id !== id);
    });
  };

  return (
    <div>
      {/* Rendered at the top level (not inside the sm:hidden drop area) so
          ref.open() can still trigger the native picker on mobile. */}
      <input {...getInputProps()} />

      <div
        {...getRootProps()}
        onClick={open}
        className={`hidden cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-[13px] transition-colors sm:flex ${
          isDragActive
            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
            : "border-[var(--color-border-strong)] text-[var(--color-ink-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink)]"
        }`}
      >
        <UploadCloud className="h-[16px] w-[16px]" />
        {isDragActive ? "Drop files to upload" : "Drag files here, or click to browse"}
      </div>

      {uploads.length > 0 && (
        <ul className="mt-3 space-y-2">
          {uploads.map((upload) => (
            <li
              key={upload.id}
              className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[13px]"
            >
              <FileIcon className="h-4 w-4 shrink-0 text-[var(--color-ink-muted)]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{upload.name}</span>
                  <span className="shrink-0 text-[var(--color-ink-muted)]">{formatBytes(upload.size)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                  <div
                    className={`h-full rounded-full transition-[width] ${
                      upload.status === "error" ? "bg-[var(--color-danger)]" : "bg-[var(--color-accent)]"
                    }`}
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
                {upload.status === "error" && (
                  <p className="mt-1 flex items-center gap-1 text-[var(--color-danger)]">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {upload.error}
                  </p>
                )}
              </div>
              {upload.status === "uploading" && (
                <button
                  type="button"
                  onClick={() => cancelUpload(upload.id)}
                  aria-label="Cancel upload"
                  className="shrink-0 rounded-full p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default UploadDropzone;
