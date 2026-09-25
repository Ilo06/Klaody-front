import { ChevronRight, Home } from "lucide-react";
import type { FolderMetadata } from "../lib/api";

interface BreadcrumbsProps {
  path: FolderMetadata[];
  onNavigate: (folderId: number | null) => void;
}

export default function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-[13px] text-[var(--color-ink-muted)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Breadcrumb"
    >
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="flex shrink-0 items-center gap-1.5 rounded px-1.5 py-1.5 hover:bg-[var(--color-border)]/40 hover:text-[var(--color-ink)]"
      >
        <Home className="h-[13px] w-[13px]" />
        Files
      </button>
      {path.map((folder) => (
        <span key={folder.id} className="flex shrink-0 items-center gap-1">
          <ChevronRight className="h-[13px] w-[13px] shrink-0 text-[var(--color-border-strong)]" />
          <button
            type="button"
            onClick={() => onNavigate(folder.id)}
            className="max-w-[40vw] truncate rounded px-1.5 py-1.5 hover:bg-[var(--color-border)]/40 hover:text-[var(--color-ink)] sm:max-w-[200px]"
          >
            {folder.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
