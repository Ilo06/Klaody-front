import { useState, type FormEvent } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import Modal from "./Modal";

interface NameModalProps {
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export default function NameModal({
  title,
  label,
  initialValue = "",
  confirmLabel = "Save",
  onCancel,
  onConfirm,
  isSubmitting,
  error,
}: NameModalProps) {
  const [value, setValue] = useState(initialValue);
  const trimmed = value.trim();
  const isValid = trimmed.length > 0 && trimmed.length <= 255;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isValid) onConfirm(trimmed);
  };

  return (
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={handleSubmit}>
        <label htmlFor="name-modal-input" className="mb-2 block text-[13px] font-medium text-[var(--color-ink)]">
          {label}
        </label>
        <input
          id="name-modal-input"
          type="text"
          autoFocus
          value={value}
          maxLength={255}
          onChange={(event) => setValue(event.target.value)}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-[16px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent-soft)] sm:py-2.5 sm:text-[14px]"
        />
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
            type="submit"
            disabled={!isValid || isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-3 text-[15px] font-semibold text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2 sm:text-[14px]"
          >
            {isSubmitting && <Loader2 className="h-[14px] w-[14px] animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
