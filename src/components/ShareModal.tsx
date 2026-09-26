import { useState } from "react";
import { AlertCircle, Check, Copy, Loader2 } from "lucide-react";
import Modal from "./Modal";
import type { FileMetadata } from "../lib/api";

const EXPIRY_OPTIONS = [
  { label: "Never", value: "" },
  { label: "1 hour", value: String(60 * 60) },
  { label: "1 day", value: String(60 * 60 * 24) },
  { label: "7 days", value: String(60 * 60 * 24 * 7) },
  { label: "30 days", value: String(60 * 60 * 24 * 30) },
];

interface ShareModalProps {
  file: FileMetadata;
  shareUrl: string | null;
  isSubmitting: boolean;
  error?: string | null;
  onCancel: () => void;
  onCreate: (expiresIn: number | undefined) => void;
}

export default function ShareModal({ file, shareUrl, isSubmitting, error, onCancel, onCreate }: ShareModalProps) {
  const [expiry, setExpiry] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal title={`Share "${file.name}"`} onClose={onCancel}>
      {shareUrl ? (
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[var(--color-ink)]">Public link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(event) => event.target.select()}
              className="w-full min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)] sm:py-2.5"
            />
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy link"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)] sm:h-10 sm:w-10"
            >
              {copied ? <Check className="h-[16px] w-[16px]" /> : <Copy className="h-[16px] w-[16px]" />}
            </button>
          </div>
          <p className="mt-3 text-[13px] text-[var(--color-ink-muted)]">
            Anyone with this link can download the file without signing in.
          </p>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-md bg-[var(--color-accent)] px-4 py-3 text-[15px] font-semibold text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)] sm:w-auto sm:py-2 sm:text-[14px]"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="share-expiry" className="mb-2 block text-[13px] font-medium text-[var(--color-ink)]">
            Link expires
          </label>
          <select
            id="share-expiry"
            value={expiry}
            onChange={(event) => setExpiry(event.target.value)}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-[16px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)] sm:py-2.5 sm:text-[14px]"
          >
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[var(--color-danger)]">
              <AlertCircle className="h-[13px] w-[13px] shrink-0" />
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-md px-4 py-3 text-[15px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] sm:w-auto sm:py-2 sm:text-[14px]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onCreate(expiry ? Number(expiry) : undefined)}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-3 text-[15px] font-semibold text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2 sm:text-[14px]"
            >
              {isSubmitting && <Loader2 className="h-[14px] w-[14px] animate-spin" />}
              Create link
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}