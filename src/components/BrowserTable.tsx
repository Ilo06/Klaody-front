import { useState } from "react";
import { format } from "date-fns";
import { Download, Folder, FolderInput, Link2, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
  selectedFileIds?: Set<number>;
  selectedFolderIds?: Set<number>;
  onToggleFileSelected?: (file: FileMetadata) => void;
  onToggleFolderSelected?: (folder: FolderMetadata) => void;
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
}: BrowserTableProps) {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);

  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <Folder className="h-8 w-8 text-[var(--color-ink-muted)]" />
        <h2 className="mt-4 text-[18px]">This folder is empty</h2>
        <p className="mt-1.5 text-[14px] text-[var(--color-ink-muted)]">
          Upload files or create a folder to get started.
        </p>
      </div>
    );
  }

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
        {folders.map((folder) => {
          const isSelected = selectedFolderIds?.has(folder.id) ?? false;
          return (
            <li
              key={`folder-${folder.id}`}
              className="flex items-center gap-1 border-b border-[var(--color-border)] last:border-0"
            >
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleFolderSelected?.(folder)}
                  aria-label={`Select ${folder.name}`}
                  className="ml-1 mr-3 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                />
              )}
              <button
                type="button"
                onClick={() => (selectionMode ? onToggleFolderSelected?.(folder) : onOpenFolder(folder))}
                className="flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left"
              >
                <Folder className="h-5 w-5 shrink-0 text-[var(--color-ink-muted)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]">{folder.name}</span>
                  <span className="block truncate text-[12px] text-[var(--color-ink-muted)]">
                    Created {format(new Date(folder.createdAt), "MMM d, yyyy")}
                  </span>
                </span>
              </button>
              {!selectionMode && (
                <button
                  type="button"
                  onClick={() => setActiveSheet({ kind: "folder", folder })}
                  aria-label={`More actions for ${folder.name}`}
                  className="shrink-0 rounded-full p-2.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              )}
            </li>
          );
        })}
        {files.map((file) => {
          const Icon = fileIcon(file.mimeType);
          const isSelected = selectedFileIds?.has(file.id) ?? false;
          return (
            <li
              key={`file-${file.id}`}
              className="flex items-center gap-1 border-b border-[var(--color-border)] last:border-0"
            >
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleFileSelected?.(file)}
                  aria-label={`Select ${file.name}`}
                  className="ml-1 mr-3 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                />
              )}
              <button
                type="button"
                onClick={() => (selectionMode ? onToggleFileSelected?.(file) : setPreviewFile(file))}
                aria-label={selectionMode ? `Select ${file.name}` : `Preview ${file.name}`}
                className="flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left"
              >
                <Icon className="h-5 w-5 shrink-0 text-[var(--color-ink-muted)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]">{file.name}</span>
                  <span className="block truncate text-[12px] text-[var(--color-ink-muted)]">
                    {formatBytes(file.size)} · {format(new Date(file.uploadedAt), "MMM d, yyyy")}
                  </span>
                </span>
              </button>
              {!selectionMode && (
                <button
                  type="button"
                  onClick={() => setActiveSheet({ kind: "file", file })}
                  aria-label={`More actions for ${file.name}`}
                  className="shrink-0 rounded-full p-2.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {activeSheet?.kind === "folder" && (
        <ActionSheet
          title={activeSheet.folder.name}
          actions={folderActions(activeSheet.folder)}
          onClose={() => setActiveSheet(null)}
        />
      )}
      {activeSheet?.kind === "file" && (
        <ActionSheet
          title={activeSheet.file.name}
          actions={fileActions(activeSheet.file)}
          onClose={() => setActiveSheet(null)}
        />
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={() => onDownloadFile(previewFile)}
          actions={fileActions(previewFile).filter((action) => action.label !== "Download")}
        />
      )}
    </>
  );
}