import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Folder, Loader2 } from "lucide-react";
import Modal from "./Modal";
import { Skeleton } from "./Skeleton";
import { useAllFolders, useFolders } from "../hooks/useFileBrowser";

interface MoveModalProps {
  title: string;
  initialFolderId: number | null;
  /** The item's own id, when moving a folder — you can't move a folder into itself. */
  disabledFolderId?: number;
  onCancel: () => void;
  onConfirm: (destinationId: number | null) => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export default function MoveModal({
  title,
  initialFolderId,
  disabledFolderId,
  onCancel,
  onConfirm,
  isSubmitting,
  error,
}: MoveModalProps) {
  const [browsingId, setBrowsingId] = useState<number | null>(initialFolderId);
  const allFoldersQuery = useAllFolders();
  const subfoldersQuery = useFolders(browsingId);

  const foldersById = useMemo(() => {
    const map = new Map<number, { id: number; name: string; parentId: number | null }>();
    for (const folder of allFoldersQuery.data ?? []) map.set(folder.id, folder);
    return map;
  }, [allFoldersQuery.data]);

  const currentFolder = browsingId !== null ? foldersById.get(browsingId) : undefined;
  // A folder being moved can't be browsed into (would be moving it into itself).
  const visibleSubfolders = (subfoldersQuery.data ?? []).filter((f) => f.id !== disabledFolderId);

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="mb-4 flex items-center justify-between text-[13px] text-[var(--color-ink-muted)]">
        <button
          type="button"
          disabled={browsingId === null}
          onClick={() => setBrowsingId(currentFolder?.parentId ?? null)}
          className="-m-2 flex items-center gap-1 p-2 disabled:opacity-40"
        >
          <ArrowLeft className="h-[13px] w-[13px]" />
          Up
        </button>
        <span className="truncate font-medium text-[var(--color-ink)]">
          {currentFolder ? currentFolder.name : "Files (root)"}
        </span>
      </div>

      <div className="max-h-[45vh] overflow-y-auto rounded-md border border-[var(--color-border)] sm:max-h-64">
        <AnimatePresence mode="wait" initial={false}>
          {subfoldersQuery.isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="space-y-3 p-3.5"
            >
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/5" />
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
              {visibleSubfolders.length === 0 && (
                <div className="p-4 text-[13px] text-[var(--color-ink-muted)]">No subfolders here.</div>
              )}
              {visibleSubfolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setBrowsingId(folder.id)}
                  className="flex w-full items-center gap-2.5 border-b border-[var(--color-border)] px-3.5 py-3.5 text-left text-[15px] last:border-0 hover:bg-[var(--color-border)]/30 sm:py-2.5 sm:text-[14px]"
                >
                  <Folder className="h-4 w-4 shrink-0 text-[var(--color-ink-muted)]" />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-[var(--color-danger)]">
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
          disabled={isSubmitting || browsingId === disabledFolderId}
          onClick={() => onConfirm(browsingId)}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-3 text-[15px] font-semibold text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2 sm:text-[14px]"
        >
          {isSubmitting && <Loader2 className="h-[14px] w-[14px] animate-spin" />}
          Move here
        </button>
      </div>
    </Modal>
  );
}