import { AlertCircle, Loader2 } from "lucide-react";
import Modal from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  isSubmitting?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  isSubmitting,
  error,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-[14px] text-[var(--color-ink-muted)]">{message}</p>
      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-[var(--color-danger)]">
          <AlertCircle className="h-[13px] w-[13px] shrink-0" />
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-[14px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onConfirm}
          className="flex items-center gap-2 rounded-md bg-[var(--color-danger)] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-[14px] w-[14px] animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
