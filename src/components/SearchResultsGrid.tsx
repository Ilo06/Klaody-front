import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, FolderInput, ImageOff, Link2, MoreVertical, Pencil, SearchX, Trash2 } from "lucide-react";
import ActionSheet, { type ActionSheetItem } from "./ActionSheet";
import FilePreviewModal from "./FilePreviewModal";
import { fetchFileBlob, fetchImagePreviewBlob, type FileMetadata } from "../lib/api";
import { BENTO_GRID, bentoSpan, isHeroTile } from "../lib/bento";
import { formatBytes } from "../lib/format";

// Low-resolution thumbnail buckets (the backend snaps `width` up to 240 / 360 / 480 / ...).
const THUMB_WIDTH = 240;
const HERO_THUMB_WIDTH = 480;

interface SearchResultsGridProps {
  files: FileMetadata[];
  onDownloadFile: (file: FileMetadata) => void;
  onRenameFile: (file: FileMetadata) => void;
  onMoveFile: (file: FileMetadata) => void;
  onDeleteFile: (file: FileMetadata) => void;
  onShareFile: (file: FileMetadata) => void;
  /** When true, tapping a tile toggles its selection instead of opening the preview. */
  selectionMode?: boolean;
  selectedFileIds?: Set<string>;
  onToggleFileSelected?: (file: FileMetadata) => void;
}

/** Flips to true once the element gets near the viewport, so we only fetch thumbnails that are about to be seen. */
function useNearViewport<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen]);

  return { ref, seen };
}

/** Reduced-size copy of the image, cached by react-query so re-running a search doesn't refetch it. */
function useThumbnail(file: FileMetadata, width: number, enabled: boolean) {
  const query = useQuery({
    queryKey: ["thumbnail", file.id, width],
    queryFn: () => fetchImagePreviewBlob(file.id, width).catch(() => fetchFileBlob(file.id)),
    enabled,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
  });
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(query.data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [query.data]);

  return { url, failed: query.isError };
}

interface TileProps {
  file: FileMetadata;
  index: number;
  selectionMode: boolean;
  selected: boolean;
  onOpen: () => void;
  onMenu: () => void;
}

function Tile({ file, index, selectionMode, selected, onOpen, onMenu }: TileProps) {
  const { ref, seen } = useNearViewport<HTMLDivElement>();
  const { url, failed } = useThumbnail(file, isHeroTile(index) ? HERO_THUMB_WIDTH : THUMB_WIDTH, seen);
  const [loaded, setLoaded] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: Math.min(index, 12) * 0.03, ease: "easeOut" }}
      className={`group relative overflow-hidden rounded-lg border bg-[var(--color-border)]/50 ${bentoSpan(index)} ${
        selected ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]" : "border-[var(--color-border)]"
      }`}
    >
      {/* Skeleton shows until the image has actually decoded. */}
      {!loaded && !failed && <div className="absolute inset-0 animate-pulse bg-[var(--color-border)]/70" />}

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center text-[var(--color-ink-muted)]">
          <ImageOff className="h-6 w-6" aria-hidden="true" />
        </div>
      )}

      {url && (
        <img
          src={url}
          alt={file.name}
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] ${
            loaded ? "opacity-100" : "opacity-0"
          } ${selected ? "scale-[0.96] rounded-md" : ""}`}
        />
      )}

      <button
        type="button"
        onClick={onOpen}
        aria-label={selectionMode ? `Select ${file.name}` : `Preview ${file.name}`}
        className="absolute inset-0 z-[1] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      />

      {/* Caption: hidden on mobile, shown on hover/focus on desktop. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] hidden bg-black/55 px-2.5 py-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 sm:block">
        <p className="truncate text-[12px] font-medium">{file.name}</p>
        <p className="truncate text-[11px] text-white/70">{formatBytes(file.size)}</p>
      </div>

      {selectionMode ? (
        <span
          aria-hidden="true"
          className={`absolute left-2 top-2 z-[2] flex h-5 w-5 items-center justify-center rounded-full border ${
            selected
              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
              : "border-white/80 bg-black/30 text-transparent"
          }`}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : (
        <button
          type="button"
          onClick={onMenu}
          aria-label={`More actions for ${file.name}`}
          className="absolute right-1.5 top-1.5 z-[2] cursor-pointer rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition-opacity hover:bg-black/70 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}

export default function SearchResultsGrid({
  files,
  onDownloadFile,
  onRenameFile,
  onMoveFile,
  onDeleteFile,
  onShareFile,
  selectionMode = false,
  selectedFileIds,
  onToggleFileSelected,
}: SearchResultsGridProps) {
  // Only the id is stored: the open file is looked up in `files` so ←/→ can walk the results
  // (best match first) and the preview closes by itself if the file leaves the list.
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sheetFile, setSheetFile] = useState<FileMetadata | null>(null);

  if (files.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-16 text-center sm:py-24"
      >
        <SearchX className="h-8 w-8 text-[var(--color-ink-muted)]" />
        <h2 className="mt-4 text-[18px]">No matching images</h2>
        <p className="mt-1.5 text-[14px] text-[var(--color-ink-muted)]">
          Try another word, or wait a few seconds if you just uploaded the image.
        </p>
      </motion.div>
    );
  }

  const previewIndex = previewId === null ? -1 : files.findIndex((file) => file.id === previewId);
  const previewFile = previewIndex >= 0 ? files[previewIndex] : null;

  const fileActions = (file: FileMetadata): ActionSheetItem[] => [
    { label: "Download", icon: Download, onClick: () => onDownloadFile(file) },
    { label: "Share", icon: Link2, onClick: () => onShareFile(file) },
    { label: "Rename", icon: Pencil, onClick: () => onRenameFile(file) },
    { label: "Move", icon: FolderInput, onClick: () => onMoveFile(file) },
    { label: "Delete", icon: Trash2, danger: true, onClick: () => onDeleteFile(file) },
  ];

  return (
    <>
      <div className={BENTO_GRID}>
        {files.map((file, index) => (
          <Tile
            key={file.id}
            file={file}
            index={index}
            selectionMode={selectionMode}
            selected={selectedFileIds?.has(file.id) ?? false}
            onOpen={() => (selectionMode ? onToggleFileSelected?.(file) : setPreviewId(file.id))}
            onMenu={() => setSheetFile(file)}
          />
        ))}
      </div>

      <AnimatePresence>
        {sheetFile && (
          <ActionSheet
            key="file-sheet"
            title={sheetFile.name}
            actions={fileActions(sheetFile)}
            onClose={() => setSheetFile(null)}
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