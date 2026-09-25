import { useState } from "react";
import { format } from "date-fns";
import {
  Download,
  FileAudio,
  FileText,
  FileVideo,
  Folder,
  FolderInput,
  Image as ImageIcon,
  MoreVertical,
  Pencil,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import ActionSheet, { type ActionSheetItem } from "./ActionSheet";
import type { FileMetadata, FolderMetadata } from "../lib/api";
import { formatBytes } from "../lib/format";

function fileIcon(mimeType: string): LucideIcon {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.startsWith("video/")) return FileVideo;
  return FileText;
}

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
}

type ActiveSheet = { kind: "folder"; folder: FolderMetadata } | { kind: "file"; file: FileMetadata } | null;

/**
 * Renders folders and files as a single tap-friendly list rather than a
 * table: no columns to lose on a narrow screen, and each row exposes just
 * one "more" button that opens a bottom action sheet instead of a row of
 * small icon buttons.
 */
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
}: BrowserTableProps) {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);

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
    { label: "Rename", icon: Pencil, onClick: () => onRenameFile(file) },
    { label: "Move", icon: FolderInput, onClick: () => onMoveFile(file) },
    { label: "Delete", icon: Trash2, danger: true, onClick: () => onDeleteFile(file) },
  ];

  return (
    <>
      <ul>
        {folders.map((folder) => (
          <li
            key={`folder-${folder.id}`}
            className="flex items-center gap-1 border-b border-[var(--color-border)] last:border-0"
          >
            <button
              type="button"
              onClick={() => onOpenFolder(folder)}
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
            <button
              type="button"
              onClick={() => setActiveSheet({ kind: "folder", folder })}
              aria-label={`More actions for ${folder.name}`}
              className="shrink-0 rounded-full p-2.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </li>
        ))}
        {files.map((file) => {
          const Icon = fileIcon(file.mimeType);
          return (
            <li
              key={`file-${file.id}`}
              className="flex items-center gap-1 border-b border-[var(--color-border)] last:border-0"
            >
              <button
                type="button"
                onClick={() => onDownloadFile(file)}
                aria-label={`Download ${file.name}`}
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
              <button
                type="button"
                onClick={() => setActiveSheet({ kind: "file", file })}
                aria-label={`More actions for ${file.name}`}
                className="shrink-0 rounded-full p-2.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/60 hover:text-[var(--color-ink)]"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
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
    </>
  );
}
