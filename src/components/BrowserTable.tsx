import { format } from "date-fns";
import {
  Download,
  FileAudio,
  FileText,
  FileVideo,
  Folder,
  FolderInput,
  Image as ImageIcon,
  Pencil,
  Trash2,
  type LucideIcon,
} from "lucide-react";
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

  return (
    <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
      <thead>
        <tr className="border-b border-[var(--color-border)] text-[12px] text-[var(--color-ink-muted)]">
          <th className="py-2.5 pr-3 font-medium">Name</th>
          <th className="hidden w-28 py-2.5 pr-3 font-medium sm:table-cell">Size</th>
          <th className="hidden w-36 py-2.5 pr-3 font-medium md:table-cell">Modified</th>
          <th className="w-32 py-2.5 text-right font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {folders.map((folder) => (
          <tr
            key={`folder-${folder.id}`}
            className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-border)]/20"
          >
            <td className="py-2.5 pr-3">
              <button
                type="button"
                onClick={() => onOpenFolder(folder)}
                className="flex w-full items-center gap-2.5 text-left hover:text-[var(--color-accent)]"
              >
                <Folder className="h-[17px] w-[17px] shrink-0 text-[var(--color-ink-muted)]" />
                <span className="truncate">{folder.name}</span>
              </button>
            </td>
            <td className="hidden py-2.5 pr-3 text-[var(--color-ink-muted)] sm:table-cell">—</td>
            <td className="hidden py-2.5 pr-3 text-[var(--color-ink-muted)] md:table-cell">
              {format(new Date(folder.createdAt), "MMM d, yyyy")}
            </td>
            <td className="py-2.5">
              <div className="flex items-center justify-end gap-1">
                <IconButton label="Rename" icon={Pencil} onClick={() => onRenameFolder(folder)} />
                <IconButton label="Move" icon={FolderInput} onClick={() => onMoveFolder(folder)} />
                <IconButton label="Delete" icon={Trash2} danger onClick={() => onDeleteFolder(folder)} />
              </div>
            </td>
          </tr>
        ))}
        {files.map((file) => {
          const Icon = fileIcon(file.mimeType);
          return (
            <tr
              key={`file-${file.id}`}
              className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-border)]/20"
            >
              <td className="py-2.5 pr-3">
                <span className="flex items-center gap-2.5">
                  <Icon className="h-[17px] w-[17px] shrink-0 text-[var(--color-ink-muted)]" />
                  <span className="truncate">{file.name}</span>
                </span>
              </td>
              <td className="hidden py-2.5 pr-3 text-[var(--color-ink-muted)] sm:table-cell">
                {formatBytes(file.size)}
              </td>
              <td className="hidden py-2.5 pr-3 text-[var(--color-ink-muted)] md:table-cell">
                {format(new Date(file.uploadedAt), "MMM d, yyyy")}
              </td>
              <td className="py-2.5">
                <div className="flex items-center justify-end gap-1">
                  <IconButton label="Download" icon={Download} onClick={() => onDownloadFile(file)} />
                  <IconButton label="Rename" icon={Pencil} onClick={() => onRenameFile(file)} />
                  <IconButton label="Move" icon={FolderInput} onClick={() => onMoveFile(file)} />
                  <IconButton label="Delete" icon={Trash2} danger onClick={() => onDeleteFile(file)} />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function IconButton({
  label,
  icon: Icon,
  onClick,
  danger,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-md p-1.5 text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-border)]/60 ${
        danger ? "hover:text-[var(--color-danger)]" : "hover:text-[var(--color-ink)]"
      }`}
    >
      <Icon className="h-[15px] w-[15px]" />
    </button>
  );
}
