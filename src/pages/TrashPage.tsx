import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckSquare, Folder, Loader2, RotateCcw, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import ThemeToggle from "../components/ThemeToggle";
import ConfirmDialog from "../components/ConfirmDialog";
import { SkeletonList } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { ApiError, type FileMetadata, type FolderMetadata } from "../lib/api";
import {
  useBulkRestore,
  useEmptyTrash,
  useRestoreAll,
  useRestoreFile,
  useRestoreFolder,
  useTrash,
} from "../hooks/useTrash";
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

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  const trashQuery = useTrash({
    name: nameFilter || undefined,
    type: typeFilter || undefined,
  });

  const restoreFileMutation = useRestoreFile();
  const restoreFolderMutation = useRestoreFolder();
  const restoreAllMutation = useRestoreAll();
  const bulkRestoreMutation = useBulkRestore();
  const emptyTrashMutation = useEmptyTrash();

  // The selection only makes sense for what's currently on screen.
  useEffect(() => {
    setSelectionMode(false);
    setSelectedFileIds(new Set());
    setSelectedFolderIds(new Set());
  }, [nameFilter, typeFilter]);

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedFileIds(new Set());
    setSelectedFolderIds(new Set());
  };

  const toggleFileSelected = (file: FileMetadata) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(file.id)) next.delete(file.id);
      else next.add(file.id);
      return next;
    });
  };

  const toggleFolderSelected = (folder: FolderMetadata) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folder.id)) next.delete(folder.id);
      else next.add(folder.id);
      return next;
    });
  };

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

  const handleBulkRestore = () => {
    bulkRestoreMutation.mutate(
      { fileIds: Array.from(selectedFileIds), folderIds: Array.from(selectedFolderIds) },
      {
        onSuccess: (result) => {
          const failed = result.failed.length;
          showToast(
            failed > 0
              ? `Restored ${result.succeeded.length}, ${failed} could not be restored`
              : `Restored ${result.succeeded.length} item(s)`,
            failed > 0 ? "error" : "success",
          );
          exitSelectionMode();
        },
        onError: (err) => showToast(errorMessage(err, "Could not restore the selected items"), "error"),
      },
    );
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
  const selectedCount = selectedFileIds.size + selectedFolderIds.size;
  const allVisibleSelected =
    folders.length + files.length > 0 &&
    folders.every((folder) => selectedFolderIds.has(folder.id)) &&
    files.every((file) => selectedFileIds.has(file.id));

  const handleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedFileIds(new Set());
      setSelectedFolderIds(new Set());
    } else {
      setSelectedFileIds(new Set(files.map((file) => file.id)));
      setSelectedFolderIds(new Set(folders.map((folder) => folder.id)));
    }
  };

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

        <AnimatePresence mode="wait" initial={false}>
          {selectionMode ? (
            <motion.div
              key="selection-bar"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="text-[13px] font-medium text-[var(--color-accent)] hover:underline"
                >
                  {allVisibleSelected ? "Clear" : "Select all"}
                </button>
                <span className="text-[13px] text-[var(--color-ink-muted)]">{selectedCount} selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exitSelectionMode}
                  className="rounded-md px-3 py-1.5 text-[13px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkRestore}
                  disabled={selectedCount === 0 || bulkRestoreMutation.isPending}
                  className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3.5 py-1.5 text-[13px] font-medium hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkRestoreMutation.isPending ? (
                    <Loader2 className="h-[14px] w-[14px] animate-spin" />
                  ) : (
                    <RotateCcw className="h-[14px] w-[14px]" />
                  )}
                  Restore
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="filter-bar"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="mt-6 flex flex-wrap items-center gap-3"
            >
              <div className="relative min-w-[160px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[var(--color-ink-muted)]" />
                <input
                  type="text"
                  value={nameInput}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search trash"
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] h-9 py-0 pl-8 pr-3 text-[16px] placeholder:text-[13px] outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent-soft)] sm:h-auto sm:py-2 sm:pl-9 sm:text-[13px]"
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
              <button
                type="button"
                onClick={() => setSelectionMode(true)}
                disabled={isEmpty}
                aria-label="Select items"
                title="Select"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckSquare className="h-[14px] w-[14px]" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-5">
          <AnimatePresence mode="wait" initial={false}>
          {trashQuery.isLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <SkeletonList />
            </motion.div>
          ) : trashQuery.error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center gap-2 py-20 text-center"
            >
              <AlertCircle className="h-6 w-6 text-[var(--color-danger)]" />
              <p className="text-[14px] text-[var(--color-danger)]">
                {errorMessage(trashQuery.error, "Could not load the trash")}
              </p>
            </motion.div>
          ) : isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center px-4 py-24 text-center"
            >
              <Trash2 className="h-8 w-8 text-[var(--color-ink-muted)]" />
              <h2 className="mt-4 text-[18px]">Trash is empty</h2>
              <p className="mt-1.5 text-[14px] text-[var(--color-ink-muted)]">
                Items you delete will show up here for you to restore.
              </p>
            </motion.div>
          ) : (
            <motion.ul key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {folders.map((folder, index) => {
                const isSelected = selectedFolderIds.has(folder.id);
                return (
                  <motion.li
                    key={`folder-${folder.id}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(index, 10) * 0.025, ease: "easeOut" }}
                    className="flex items-center gap-1 border-b border-[var(--color-border)] py-3.5 last:border-0"
                  >
                    {selectionMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFolderSelected(folder)}
                        aria-label={`Select ${folder.name}`}
                        className="mr-3 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => (selectionMode ? toggleFolderSelected(folder) : undefined)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Folder className="h-5 w-5 shrink-0 text-[var(--color-ink-muted)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px]">{folder.name}</span>
                        <span className="block truncate text-[12px] text-[var(--color-ink-muted)]">
                          Trashed {folder.deletedAt ? format(new Date(folder.deletedAt), "MMM d, yyyy") : "—"}
                        </span>
                      </span>
                    </button>
                    {!selectionMode && (
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
                    )}
                  </motion.li>
                );
              })}
              {files.map((file, index) => {
                const Icon = fileIcon(file.mimeType);
                const isSelected = selectedFileIds.has(file.id);
                return (
                  <motion.li
                    key={`file-${file.id}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(folders.length + index, 10) * 0.025, ease: "easeOut" }}
                    className="flex items-center gap-1 border-b border-[var(--color-border)] py-3.5 last:border-0"
                  >
                    {selectionMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFileSelected(file)}
                        aria-label={`Select ${file.name}`}
                        className="mr-3 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => (selectionMode ? toggleFileSelected(file) : undefined)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-[var(--color-ink-muted)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px]">{file.name}</span>
                        <span className="block truncate text-[12px] text-[var(--color-ink-muted)]">
                          {formatBytes(file.size)} · Trashed{" "}
                          {file.deletedAt ? format(new Date(file.deletedAt), "MMM d, yyyy") : "—"}
                        </span>
                      </span>
                    </button>
                    {!selectionMode && (
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
                    )}
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {emptyDialogOpen && (
          <ConfirmDialog
            key="empty-trash"
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
      </AnimatePresence>
    </div>
  );
}
