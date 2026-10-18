import { useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Folder, FolderInput, Link2, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import ActionSheet, { type ActionSheetItem } from "./ActionSheet";
import FilePreviewModal from "./FilePreviewModal";
import type { FileMetadata, FolderMetadata } from "../lib/api";
import { fileIcon } from "../lib/fileIcon";
import { formatBytes } from "../lib/format";

interface BrowserTableProps {
  folders: FolderMetadata[];
  files: FileMetadata[];
  onOpenFolder: (folder: FolderMetadata) => void;
  onRenameFolder: (folder: FolderMetadata) => void;
  onMoveFolder: (folder: FolderMetadata) => void;
  onDeleteFolder: (folder: FolderMetadata) => void;
  onDownloadFile: (file: FileMetadata) => void;
  onRenameFile: (file: FileMetadata) => void;
  onMoveFile: (file: FileMetadata) => void;
  onDeleteFile: (file: FileMetadata) => void;
  onShareFile: (file: FileMetadata) => void;
  /** When true, rows show a checkbox and tapping a row toggles selection instead of opening/previewing it. */
  selectionMode?: boolean;
  selectedFileIds?: Set<string>;
  selectedFolderIds?: Set<string>;
  onToggleFileSelected?: (file: FileMetadata) => void;
  onToggleFolderSelected?: (folder: FolderMetadata) => void;
  /** Replaces the default "This folder is empty" message (e.g. for an empty search result). */
  emptyState?: { title: string; hint: string };
}

type ActiveSheet = { kind: "folder"; folder: FolderMetadata } | { kind: "file"; file: FileMetadata } | null;

export default function BrowserTable({
  folders,
  files,
  onOpenFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
  onDownloadFile,
  onRenameFile,
  onMoveFile,
  onDeleteFile,
  onShareFile,
  selectionMode = false,
  selectedFileIds,
  selectedFolderIds,
  onToggleFileSelected,
  onToggleFolderSelected,
  emptyState = { title: "This folder is empty", hint: "Upload files or create a folder to get started." },
}: BrowserTableProps) {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  // Only the id is stored: the open file is looked up in `files`, so ←/→ can walk the list and the
  // preview closes by itself if the file leaves it (deleted, moved...).
  const [previewId, setPreviewId] = useState<string | null>(null);

  if (folders.length === 0 && files.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center px-4 py-16 text-center sm:py-24"
      >
        <Folder className="h-8 w-8 text-[var(--color-ink-muted)]" />
        <h2 className="mt-4 text-[18px]">{emptyState.title}</h2>
        <p className="mt-1.5 text-[14px] text-[var(--color-ink-muted)]">{emptyState.hint}</p>
      </motion.div>
    );
  }

  const previewIndex = previewId === null ? -1 : files.findIndex((file) => file.id === previewId);
  const previewFile = previewIndex >= 0 ? files[previewIndex] : null;

  // Small, capped stagger so long lists don't take forever to finish animating in.
  const rowDelay = (index: number) => Math.min(index, 10) * 0.025;

  const folderActions = (folder: FolderMetadata): ActionSheetItem[] => [
    { label: "Rename", icon: Pencil, onClick: () => onRenameFolder(folder) },
    { label: "Move", icon: FolderInput, onClick: () => onMoveFolder(folder) },
    { label: "Delete", icon: Trash2, danger: true, onClick: () => onDeleteFolder(folder) },
  ];

  const fileActions = (file: FileMetadata): ActionSheetItem[] => [
    { label: "Download", icon: Download, onClick: () => onDownloadFile(file) },
    { label: "Share", icon: Link2, onClick: () => onShareFile(file) },
    { label: "Rename", icon: Pencil, onClick: () => onRenameFile(file) },
    { label: "Move", icon: FolderInput, onClick: () => onMoveFile(file) },
    { label: "Delete", icon: Trash2, danger: true, onClick: () => onDeleteFile(file) },
  ];

  return (
    <>
      <ul>
        {folders.map((folder, index) => {
          const isSelected = selectedFolderIds?.has(folder.id) ?? false;
          return (
            <motion.li
              key={`folder-${folder.id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: rowDelay(index), ease: "easeOut" }}
              className="flex items-center gap-1 border-b border-[var(--color-border)] transition-colors last:border-0 hover:bg-[var(--color-border)]/30"
            >
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleFolderSelected?.(folder)}
                  aria-label={`Select ${folder.name}`}
                  className="ml-0.5 mr-2.5 h-4 w-4 shrink-0 sm:ml-1 sm:mr-3 accent-[var(--color-accent)]"
                />
              )}
              <button
                type="button"
                onClick={() => (selectionMode ? onToggleFolderSelected?.(folder) : onOpenFolder(folder))}
                className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left sm:gap-3 sm:py-3.5"
              >
                <Folder className="h-4 w-4 shrink-0 sm:h-5 sm:w-5 text-[var(--color-ink-muted)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] sm:text-[15px]">{folder.name}</span>
                  <span className="block truncate text-[11px] text-[var(--color-ink-muted)] sm:text-[12px]">
                    Created {format(new Date(folder.createdAt), "MMM d, yyyy")}
                  </span>
                </span>
              </button>
              {!selectionMode && (
                <button
                  type="button"
                  onClick={() => setActiveSheet({ kind: "folder", folder })}
                  aria-label={`More actions for ${folder.name}`}
                  className="shrink-0 rounded-full p-1.5 text-[var(--color-ink-muted)] sm:p-2.5 hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
                >
                  <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
            </motion.li>
          );
        })}
        {files.map((file, index) => {
          const Icon = fileIcon(file.mimeType);
          const isSelected = selectedFileIds?.has(file.id) ?? false;
          return (
            <motion.li
              key={`file-${file.id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: rowDelay(folders.length + index), ease: "easeOut" }}
              className="flex items-center gap-1 border-b border-[var(--color-border)] transition-colors last:border-0 hover:bg-[var(--color-border)]/30"
            >
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleFileSelected?.(file)}
                  aria-label={`Select ${file.name}`}
                  className="ml-0.5 mr-2.5 h-4 w-4 shrink-0 sm:ml-1 sm:mr-3 accent-[var(--color-accent)]"
                />
              )}
              <button
                type="button"
                onClick={() => (selectionMode ? onToggleFileSelected?.(file) : setPreviewId(file.id))}
                aria-label={selectionMode ? `Select ${file.name}` : `Preview ${file.name}`}
                className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left sm:gap-3 sm:py-3.5"
              >
                <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5 text-[var(--color-ink-muted)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] sm:text-[15px]">{file.name}</span>
                  <span className="block truncate text-[11px] text-[var(--color-ink-muted)] sm:text-[12px]">
                    {formatBytes(file.size)} · {format(new Date(file.uploadedAt), "MMM d, yyyy")}
                    {file.indexStatus === "PENDING" && (
                      <span className="ml-2 inline-flex items-center gap-1" title="Not searchable by content yet">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        Indexing…
                      </span>
                    )}
                    {file.indexStatus === "FAILED" && (
                      <span className="ml-2" title="Content search could not index this image">
                        · Not indexed
                      </span>
                    )}
                  </span>
                </span>
              </button>
              {!selectionMode && (
                <button
                  type="button"
                  onClick={() => setActiveSheet({ kind: "file", file })}
                  aria-label={`More actions for ${file.name}`}
                  className="shrink-0 rounded-full p-1.5 text-[var(--color-ink-muted)] sm:p-2.5 hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
                >
                  <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
            </motion.li>
          );
        })}
      </ul>

      <AnimatePresence>
        {activeSheet?.kind === "folder" && (
          <ActionSheet
            key="folder-sheet"
            title={activeSheet.folder.name}
            actions={folderActions(activeSheet.folder)}
            onClose={() => setActiveSheet(null)}
          />
        )}
        {activeSheet?.kind === "file" && (
          <ActionSheet
            key="file-sheet"
            title={activeSheet.file.name}
            actions={fileActions(activeSheet.file)}
            onClose={() => setActiveSheet(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewFile && (
          <FilePreviewModal
            key="preview"
            file={previewFile}
            onClose={() => setPreviewId(null)}
            onDownload={() => onDownloadFile(previewFile)}
            actions={fileActions(previewFile).filter((action) => action.label !== "Download")}
            position={{ index: previewIndex, total: files.length }}
            onPrev={previewIndex > 0 ? () => setPreviewId(files[previewIndex - 1].id) : undefined}
            onNext={previewIndex < files.length - 1 ? () => setPreviewId(files[previewIndex + 1].id) : undefined}
          />
        )}
      </AnimatePresence>
    </>
  );
}