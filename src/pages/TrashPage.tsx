import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Folder, Loader2, RotateCcw, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import ThemeToggle from "../components/ThemeToggle";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { ApiError, type FileMetadata, type FolderMetadata } from "../lib/api";
import { useEmptyTrash, useRestoreAll, useRestoreFile, useRestoreFolder, useTrash } from "../hooks/useTrash";
import { fileIcon } from "../lib/fileIcon";
import { formatBytes } from "../lib/format";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

const TYPE_FILTERS = [
  { label: "Everything", value: "" },
  { label: "Files", value: "file" },
  { label: "Folders", value: "folder" },
] as const;

export default function TrashPage() {
  const navigate = useNavigate();
  const { clearSession } = useAuth();
  const { showToast } = useToast();

  const [nameInput, setNameInput] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "file" | "folder">("");
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false);
  const [emptyError, setEmptyError] = useState<string | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trashQuery = useTrash({
    name: nameFilter || undefined,
    type: typeFilter || undefined,
  });

  const restoreFileMutation = useRestoreFile();
  const restoreFolderMutation = useRestoreFolder();
  const restoreAllMutation = useRestoreAll();
  const emptyTrashMutation = useEmptyTrash();

  const handleSearchChange = (value: string) => {
    setNameInput(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setNameFilter(value), 350);
  };

  const handleRestoreFile = (file: FileMetadata) => {
    restoreFileMutation.mutate(file.id, {
      onSuccess: () => showToast(`"${file.name}" restored`),
      onError: (err) => showToast(errorMessage(err, "Could not restore the file"), "error"),
    });
  };

  const handleRestoreFolder = (folder: FolderMetadata) => {
    restoreFolderMutation.mutate(folder.id, {
      onSuccess: () => showToast(`"${folder.name}" restored`),
      onError: (err) => showToast(errorMessage(err, "Could not restore the folder"), "error"),
    });
  };

  const handleRestoreAll = () => {
    restoreAllMutation.mutate(undefined, {
      onSuccess: (result) => {
        const failed = result.failed.length;
        if (failed > 0) {
          showToast(`Restored ${result.succeeded.length}, ${failed} could not be restored`, "error");
        } else {
          showToast("Trash restored");
        }
      },
      onError: (err) => showToast(errorMessage(err, "Could not restore the trash"), "error"),
    });
  };

  const handleEmptyTrash = () => {
    setEmptyError(null);
    emptyTrashMutation.mutate(undefined, {
      onSuccess: (result) => {
        showToast(`Permanently deleted ${result.deletedFiles + result.deletedFolders} item(s)`);
        setEmptyDialogOpen(false);
      },
      onError: (err) => setEmptyError(errorMessage(err, "Could not empty the trash")),
    });
  };

  const folders = trashQuery.data?.folders ?? [];
  const files = trashQuery.data?.files ?? [];
  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] backdrop-blur sm:px-8 sm:py-5">
        <span className="text-[20px] font-bold tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
          klaody
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => clearSession()}
            className="text-[13px] text-[var(--color-ink-muted)] inline-flex px-4 py-1.5 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] hover:text-[var(--color-ink)]"
          >
            Sign out
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/files")}
            className="flex shrink-0 items-center gap-1.5 rounded px-1.5 py-1.5 text-[13px] text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/40 hover:text-[var(--color-ink)]"
          >
            <ArrowLeft className="h-[13px] w-[13px]" />
            Files
          </button>
          <h1 className="order-first w-full text-[20px] font-semibold sm:order-none sm:w-auto sm:flex-1">
            Trash
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreAll}
              disabled={isEmpty || restoreAllMutation.isPending}
              className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3.5 py-2 text-[13px] font-medium hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {restoreAllMutation.isPending ? (
                <Loader2 className="h-[14px] w-[14px] animate-spin" />
              ) : (
                <RotateCcw className="h-[14px] w-[14px]" />
              )}
              Restore all
            </button>
            <button
              type="button"
              onClick={() => setEmptyDialogOpen(true)}
              disabled={isEmpty}
              className="flex items-center gap-1.5 rounded-md border border-[var(--color-danger-border)] px-3.5 py-2 text-[13px] font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-[14px] w-[14px]" />
              Empty trash
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[160px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[var(--color-ink-muted)]" />
            <input
              type="text"
              value={nameInput}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search trash"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-9 pr-3 text-[16px] outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent-soft)] sm:py-2 sm:text-[13px]"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "" | "file" | "folder")}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-accent)]"
          >
            {TYPE_FILTERS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-5">
          {trashQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-[14px] text-[var(--color-ink-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : trashQuery.error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
              <AlertCircle className="h-6 w-6 text-[var(--color-danger)]" />
              <p className="text-[14px] text-[var(--color-danger)]">
                {errorMessage(trashQuery.error, "Could not load the trash")}
              </p>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
              <Trash2 className="h-8 w-8 text-[var(--color-ink-muted)]" />
              <h2 className="mt-4 text-[18px]">Trash is empty</h2>
              <p className="mt-1.5 text-[14px] text-[var(--color-ink-muted)]">
                Items you delete will show up here for you to restore.
              </p>
            </div>
          ) : (
            <ul>
              {folders.map((folder) => (
                <li
                  key={`folder-${folder.id}`}
                  className="flex items-center gap-1 border-b border-[var(--color-border)] py-3.5 last:border-0"
                >
                  <Folder className="h-5 w-5 shrink-0 text-[var(--color-ink-muted)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{folder.name}</span>
                    <span className="block truncate text-[12px] text-[var(--color-ink-muted)]">
                      Trashed {folder.deletedAt ? format(new Date(folder.deletedAt), "MMM d, yyyy") : "—"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRestoreFolder(folder)}
                    disabled={restoreFolderMutation.isPending}
                    aria-label={`Restore ${folder.name}`}
                    title="Restore"
                    className="shrink-0 rounded-full p-2.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)] disabled:opacity-50"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                </li>
              ))}
              {files.map((file) => {
                const Icon = fileIcon(file.mimeType);
                return (
                  <li
                    key={`file-${file.id}`}
                    className="flex items-center gap-1 border-b border-[var(--color-border)] py-3.5 last:border-0"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-[var(--color-ink-muted)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px]">{file.name}</span>
                      <span className="block truncate text-[12px] text-[var(--color-ink-muted)]">
                        {formatBytes(file.size)} · Trashed{" "}
                        {file.deletedAt ? format(new Date(file.deletedAt), "MMM d, yyyy") : "—"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRestoreFile(file)}
                      disabled={restoreFileMutation.isPending}
                      aria-label={`Restore ${file.name}`}
                      title="Restore"
                      className="shrink-0 rounded-full p-2.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)] disabled:opacity-50"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      {emptyDialogOpen && (
        <ConfirmDialog
          title="Empty trash"
          message="Permanently delete everything in the trash? This includes the stored file contents and cannot be undone."
          confirmLabel="Delete forever"
          isSubmitting={emptyTrashMutation.isPending}
          error={emptyError}
          onCancel={() => {
            setEmptyDialogOpen(false);
            setEmptyError(null);
          }}
          onConfirm={handleEmptyTrash}
        />
      )}
    </div>
  );
}
