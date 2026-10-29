import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckSquare, Folder, Loader2, LogOut, RotateCcw, Search, Trash2 } from "lucide-react";
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
import Logo from "../components/Logo";

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
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur sm:px-8 sm:py-5">
        <button
          type="button"
          onClick={() => navigate("/files")}
          aria-label="Back to files"
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] sm:hidden"
        >
          <ArrowLeft className="h-[16px] w-[16px]" />
        </button>
        <Logo className="text-[19px] sm:text-[20px]" />
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => clearSession()}
            className="text-[13px] text-[var(--color-ink-muted)] inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border sm:h-auto sm:w-auto sm:rounded-md sm:px-4 sm:py-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] hover:text-[var(--color-ink)]"
          >
            <LogOut className="h-[14px] w-[14px] sm:hidden" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-4 sm:px-8 sm:pt-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/files")}
            className="hidden shrink-0 items-center gap-1.5 rounded px-1.5 py-1.5 text-[13px] text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/40 hover:text-[var(--color-ink)] sm:flex"
          >
            <ArrowLeft className="h-[13px] w-[13px]" />
            Files
          </button>
          <h1 className="order-first w-full px-1 text-[22px] font-semibold sm:order-none sm:w-auto sm:flex-1 sm:px-0 sm:text-[20px]">
            Trash
          </h1>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              onClick={handleRestoreAll}
              disabled={isEmpty || restoreAllMutation.isPending}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-[13px] font-medium hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-auto sm:flex-none sm:justify-start sm:rounded-md sm:bg-transparent"
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
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-danger-border)] px-3.5 py-2 text-[13px] font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-auto sm:flex-none sm:justify-start sm:rounded-md"
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
              className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 sm:mt-6 sm:gap-3 sm:rounded-md sm:px-4 sm:py-2.5"
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
              className="mt-3 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-3"
            >
              <div className="relative min-w-[160px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[var(--color-ink-muted)]" />
                <input
                  type="text"
                  value={nameInput}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search trash"
                  className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-0 pl-9 pr-3 text-[13px] placeholder:text-[13px] outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent-soft)] sm:h-auto sm:rounded-md sm:py-2 sm:text-[12px]"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as "" | "file" | "folder")}
                className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-0 text-[13px] outline-none focus:border-[var(--color-accent)] sm:h-auto sm:rounded-md sm:py-2"
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-9 sm:rounded-md sm:bg-transparent"
              >
                <CheckSquare className="h-[14px] w-[14px]" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-1 shadow-[0_1px_2px_rgba(40,52,78,0.05)] sm:mt-5 sm:rounded-lg sm:px-5 sm:shadow-none">
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
              className="flex flex-col items-center justify-center gap-2 py-14 text-center sm:py-20"
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
              className="flex flex-col items-center justify-center px-4 py-16 text-center sm:py-24"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] sm:h-auto sm:w-auto sm:rounded-none sm:bg-transparent sm:text-[var(--color-ink-muted)]">
                <Trash2 className="h-7 w-7 sm:h-8 sm:w-8" />
              </span>
              <h2 className="mt-5 text-[18px] sm:mt-4">Trash is empty</h2>
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
                    className="flex items-center gap-1 border-b border-[var(--color-border)] px-2 py-2.5 last:border-0 active:bg-[var(--color-border)]/30 sm:px-0 sm:py-3.5 sm:active:bg-transparent"
                  >
                    {selectionMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFolderSelected(folder)}
                        aria-label={`Select ${folder.name}`}
                        className="mr-3 h-[18px] w-[18px] shrink-0 sm:h-4 sm:w-4 accent-[var(--color-accent)]"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => (selectionMode ? toggleFolderSelected(folder) : undefined)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] sm:h-auto sm:w-auto sm:rounded-none sm:bg-transparent sm:text-[var(--color-ink-muted)]">
                        <Folder className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium sm:text-[15px] sm:font-normal">{folder.name}</span>
                        <span className="block truncate text-[11px] text-[var(--color-ink-muted)] sm:text-[12px]">
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
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-muted)] active:bg-[var(--color-border)]/60 disabled:opacity-50 sm:h-auto sm:w-auto sm:p-2.5 sm:hover:bg-[var(--color-border)]/60 sm:hover:text-[var(--color-ink)]"
                      >
                        <RotateCcw className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
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
                    className="flex items-center gap-1 border-b border-[var(--color-border)] px-2 py-2.5 last:border-0 active:bg-[var(--color-border)]/30 sm:px-0 sm:py-3.5 sm:active:bg-transparent"
                  >
                    {selectionMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFileSelected(file)}
                        aria-label={`Select ${file.name}`}
                        className="mr-3 h-[18px] w-[18px] shrink-0 sm:h-4 sm:w-4 accent-[var(--color-accent)]"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => (selectionMode ? toggleFileSelected(file) : undefined)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-border)]/50 text-[var(--color-ink-muted)] sm:h-auto sm:w-auto sm:rounded-none sm:bg-transparent">
                        <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium sm:text-[15px] sm:font-normal">{file.name}</span>
                        <span className="block truncate text-[11px] text-[var(--color-ink-muted)] sm:text-[12px]">
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
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-muted)] active:bg-[var(--color-border)]/60 disabled:opacity-50 sm:h-auto sm:w-auto sm:p-2.5 sm:hover:bg-[var(--color-border)]/60 sm:hover:text-[var(--color-ink)]"
                      >
                        <RotateCcw className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
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
