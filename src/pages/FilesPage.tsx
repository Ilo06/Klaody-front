import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpDown,
  CheckSquare,
  FolderPlus,
  LogOut,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UploadCloud,
  UserPlus,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { SkeletonList } from "../components/Skeleton";
import Breadcrumbs from "../components/Breadcrumbs";
import BrowserTable from "../components/BrowserTable";
import UploadDropzone, { type UploadDropzoneHandle } from "../components/UploadDropzone";
import NameModal from "../components/NameModal";
import MoveModal from "../components/MoveModal";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
import ActionSheet from "../components/ActionSheet";
import ShareModal from "../components/ShareModal";
import RegisterUserModal, { type RegisterUserValues } from "../components/RegisterUserModal";
import Fab from "../components/Fab";
import StorageIndicator from "../components/StorageIndicator";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import {
  ApiError,
  UUID_REGEX,
  downloadFile,
  getShareUrl,
  type FileMetadata,
  type FolderMetadata,
  type ShareResponse,
} from "../lib/api";
import {
  MIN_CONTENT_QUERY_LENGTH,
  useAllFolders,
  useBulkDelete,
  useCreateFolder,
  useCreateShareLink,
  useDeleteFile,
  useDeleteFolder,
  useFiles,
  useFolders,
  useImageSearch,
  useMoveFile,
  useMoveFolder,
  useRenameFile,
  useRenameFolder,
} from "../hooks/useFileBrowser";
import { useRegisterUser } from "../hooks/useUsers";
import Logo from "../components/Logo";

type ModalState =
  | { type: "new-folder" }
  | { type: "rename-file"; file: FileMetadata }
  | { type: "rename-folder"; folder: FolderMetadata }
  | { type: "move-file"; file: FileMetadata }
  | { type: "move-folder"; folder: FolderMetadata }
  | { type: "delete-file"; file: FileMetadata }
  | { type: "delete-folder"; folder: FolderMetadata }
  | { type: "share-file"; file: FileMetadata }
  | { type: "register-user" }
  | null;

const MIME_FILTERS = [
  { label: "All types", value: "" },
  { label: "Images", value: "image/*" },
  { label: "Videos", value: "video/*" },
  { label: "Audio", value: "audio/*" },
  { label: "PDFs", value: "application/pdf" },
];

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function FilterControls({
  mimeTypeFilter,
  sortBy,
  order,
  onMimeTypeChange,
  onSortByChange,
  onToggleOrder,
  stacked,
}: {
  mimeTypeFilter: string;
  sortBy: string;
  order: string;
  onMimeTypeChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onToggleOrder: () => void;
  stacked?: boolean;
}) {
  const fieldClass = stacked
    ? "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-[15px] outline-none focus:border-[var(--color-accent)]"
    : "rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-accent)]";

  return (
    <div className={stacked ? "flex flex-col gap-4" : "flex items-center gap-3"}>
      <select value={mimeTypeFilter} onChange={(event) => onMimeTypeChange(event.target.value)} className={fieldClass}>
        {MIME_FILTERS.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select value={sortBy} onChange={(event) => onSortByChange(event.target.value)} className={fieldClass}>
        <option value="uploadedAt">Date uploaded</option>
        <option value="name">Name</option>
        <option value="size">Size</option>
      </select>

      <button
        type="button"
        onClick={onToggleOrder}
        className={`flex items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] ${
          stacked ? "w-full py-3 text-[15px]" : "px-3 py-2 text-[13px]"
        }`}
      >
        <ArrowUpDown className="h-[14px] w-[14px]" />
        {order === "asc" ? "Ascending" : "Descending"}
      </button>
    </div>
  );
}

export default function FilesPage() {
  const { folderId: folderIdParam } = useParams<{ folderId?: string }>();
  const currentFolderId = folderIdParam && UUID_REGEX.test(folderIdParam) ? folderIdParam : null;

  const navigate = useNavigate();
  const { clearSession, isAdmin } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const uploadRef = useRef<UploadDropzoneHandle>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const nameFilter = searchParams.get("name") ?? "";
  const mimeTypeFilter = searchParams.get("mimeType") ?? "";
  const sortBy = (searchParams.get("sortBy") as "name" | "size" | "uploadedAt") || "uploadedAt";
  const order = (searchParams.get("order") as "asc" | "desc") || "desc";

  // Two ways to search: by file name (?name=) or by what the images show (?mode=content&q=).
  const contentMode = searchParams.get("mode") === "content";
  const contentQuery = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(contentMode ? contentQuery : nameFilter);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modal, setModal] = useState<ModalState>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [shareResult, setShareResult] = useState<ShareResponse | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);

  const allFoldersQuery = useAllFolders();
  const foldersById = useMemo(() => {
    const map = new Map<string, FolderMetadata>();
    for (const folder of allFoldersQuery.data ?? []) map.set(folder.id, folder);
    return map;
  }, [allFoldersQuery.data]);

  const breadcrumbPath = useMemo(() => {
    const path: FolderMetadata[] = [];
    let current = currentFolderId !== null ? foldersById.get(currentFolderId) : undefined;
    while (current) {
      path.unshift(current);
      current = current.parentId !== null ? foldersById.get(current.parentId) : undefined;
    }
    return path;
  }, [currentFolderId, foldersById]);

  const foldersQuery = useFolders(currentFolderId);
  const filesQuery = useFiles(currentFolderId, {
    name: contentMode ? undefined : nameFilter || undefined,
    mimeType: mimeTypeFilter || undefined,
    sortBy,
    order,
  });

  // Content search looks at every image the user owns, whatever the current folder.
  const contentSearching = contentMode && contentQuery.trim().length >= MIN_CONTENT_QUERY_LENGTH;
  const searchQuery = useImageSearch(contentSearching ? contentQuery : "");

  const createFolderMutation = useCreateFolder();
  const renameFileMutation = useRenameFile();
  const renameFolderMutation = useRenameFolder();
  const moveFileMutation = useMoveFile();
  const moveFolderMutation = useMoveFolder();
  const deleteFileMutation = useDeleteFile();
  const deleteFolderMutation = useDeleteFolder();
  const bulkDeleteMutation = useBulkDelete();
  const createShareLinkMutation = useCreateShareLink();
  const registerUserMutation = useRegisterUser();

  // The selection only makes sense for what's currently on screen.
  useEffect(() => {
    setSelectionMode(false);
    setSelectedFileIds(new Set());
    setSelectedFolderIds(new Set());
  }, [currentFolderId]);

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

  const visibleFolders = contentSearching ? [] : (foldersQuery.data ?? []);
  const visibleFiles = contentSearching ? (searchQuery.data ?? []) : (filesQuery.data ?? []);
  const selectedCount = selectedFileIds.size + selectedFolderIds.size;
  const allVisibleSelected =
    visibleFolders.length + visibleFiles.length > 0 &&
    visibleFolders.every((folder) => selectedFolderIds.has(folder.id)) &&
    visibleFiles.every((file) => selectedFileIds.has(file.id));

  const handleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedFileIds(new Set());
      setSelectedFolderIds(new Set());
    } else {
      setSelectedFileIds(new Set(visibleFiles.map((file) => file.id)));
      setSelectedFolderIds(new Set(visibleFolders.map((folder) => folder.id)));
    }
  };

  const handleBulkDelete = () => {
    setBulkDeleteError(null);
    bulkDeleteMutation.mutate(
      { fileIds: Array.from(selectedFileIds), folderIds: Array.from(selectedFolderIds) },
      {
        onSuccess: (result) => {
          const failed = result.failed.length;
          showToast(
            failed > 0
              ? `Moved ${result.succeeded.length} item(s) to trash, ${failed} failed`
              : `Moved ${result.succeeded.length} item(s) to trash`,
            failed > 0 ? "error" : "success",
          );
          setBulkDeleteOpen(false);
          exitSelectionMode();
        },
        onError: (err) => setBulkDeleteError(errorMessage(err, "Could not delete the selected items")),
      },
    );
  };

  const goToFolder = (folderId: string | null) => {
    navigate(folderId === null ? "/files" : `/files/${folderId}`);
  };

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    // Content search runs a model on the server, so wait a little longer before firing.
    searchDebounce.current = setTimeout(
      () => updateFilter(contentMode ? "q" : "name", value),
      contentMode ? 450 : 350,
    );
  };

  // Switches between "by name" and "by content", carrying the typed text over to the other mode.
  const toggleContentMode = () => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const next = new URLSearchParams(searchParams);
    next.delete("name");
    next.delete("q");
    if (contentMode) {
      next.delete("mode");
      if (searchInput) next.set("name", searchInput);
    } else {
      next.set("mode", "content");
      if (searchInput) next.set("q", searchInput);
    }
    setSearchParams(next, { replace: true });
  };

  const clearContentSearch = () => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    setSearchInput("");
    updateFilter("q", "");
  };

  const closeModal = () => {
    setModal(null);
    setModalError(null);
    setShareResult(null);
  };

  const handleCreateFolder = (name: string) => {
    setModalError(null);
    createFolderMutation.mutate(
      { name, parentId: currentFolderId },
      {
        onSuccess: () => {
          showToast("Folder created");
          closeModal();
        },
        onError: (err) => setModalError(errorMessage(err, "Could not create the folder")),
      },
    );
  };

  const handleRename = (name: string) => {
    if (!modal) return;
    setModalError(null);
    if (modal.type === "rename-file") {
      renameFileMutation.mutate(
        { id: modal.file.id, name },
        {
          onSuccess: () => {
            showToast("File renamed");
            closeModal();
          },
          onError: (err) => setModalError(errorMessage(err, "Could not rename the file")),
        },
      );
    } else if (modal.type === "rename-folder") {
      renameFolderMutation.mutate(
        { id: modal.folder.id, name },
        {
          onSuccess: () => {
            showToast("Folder renamed");
            closeModal();
          },
          onError: (err) => setModalError(errorMessage(err, "Could not rename the folder")),
        },
      );
    }
  };

  const handleMove = (destinationId: string | null) => {
    if (!modal) return;
    setModalError(null);
    if (modal.type === "move-file") {
      moveFileMutation.mutate(
        { id: modal.file.id, folderId: destinationId },
        {
          onSuccess: () => {
            showToast("File moved");
            closeModal();
          },
          onError: (err) => setModalError(errorMessage(err, "Could not move the file")),
        },
      );
    } else if (modal.type === "move-folder") {
      moveFolderMutation.mutate(
        { id: modal.folder.id, parentId: destinationId },
        {
          onSuccess: () => {
            showToast("Folder moved");
            closeModal();
          },
          onError: (err) => setModalError(errorMessage(err, "Could not move the folder")),
        },
      );
    }
  };

  const handleDelete = () => {
    if (!modal) return;
    setModalError(null);
    if (modal.type === "delete-file") {
      deleteFileMutation.mutate(modal.file.id, {
        onSuccess: () => {
          showToast("File moved to trash");
          closeModal();
        },
        onError: (err) => setModalError(errorMessage(err, "Could not delete the file")),
      });
    } else if (modal.type === "delete-folder") {
      deleteFolderMutation.mutate(modal.folder.id, {
        onSuccess: () => {
          showToast("Folder moved to trash");
          closeModal();
        },
        onError: (err) => setModalError(errorMessage(err, "Could not delete the folder")),
      });
    }
  };

  const handleCreateShare = (expiresIn: number | undefined) => {
    if (modal?.type !== "share-file") return;
    setModalError(null);
    createShareLinkMutation.mutate(
      { id: modal.file.id, expiresIn },
      {
        onSuccess: (data) => setShareResult(data),
        onError: (err) => setModalError(errorMessage(err, "Could not create the share link")),
      },
    );
  };

  const handleRegisterUser = (values: RegisterUserValues) => {
    setModalError(null);
    registerUserMutation.mutate(values, {
      onSuccess: () => {
        showToast(`Account created for ${values.email}`);
        closeModal();
      },
      onError: (err) => setModalError(errorMessage(err, "Could not create the account")),
    });
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      await downloadFile(file.id, file.name);
    } catch (err) {
      showToast(errorMessage(err, "Could not download the file"), "error");
    }
  };

  const isLoading = contentSearching ? searchQuery.isLoading : foldersQuery.isLoading || filesQuery.isLoading;
  const loadError = contentSearching ? searchQuery.error : (foldersQuery.error ?? filesQuery.error);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur sm:px-8 sm:py-5">
        <Logo className="text-[18px] sm:text-[20px]" />
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => clearSession()}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-[13px] text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] sm:h-auto sm:px-4 sm:py-1.5"
          >
            <LogOut className="h-[14px] w-[14px] sm:hidden" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-3 sm:px-8 sm:pb-24 sm:pt-8">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Breadcrumbs path={breadcrumbPath} onNavigate={goToFolder} />
          </div>
          <button
            type="button"
            onClick={() => setModal({ type: "new-folder" })}
            className="hidden shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3.5 py-2 text-[13px] font-medium hover:border-[var(--color-border-strong)] sm:flex"
          >
            <FolderPlus className="h-[15px] w-[15px]" />
            New folder
          </button>
        </div>

        <div className="mt-0 sm:mt-6">
          <UploadDropzone
            ref={uploadRef}
            folderId={currentFolderId}
            onUploaded={() => {
              filesQuery.refetch();
              queryClient.invalidateQueries({ queryKey: ["storage"] });
            }}
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {selectionMode ? (
            <motion.div
              key="selection-bar"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 sm:mt-6 sm:gap-3 sm:px-4 sm:py-2.5"
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
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={selectedCount === 0}
                  className="flex items-center gap-1.5 rounded-md border border-[var(--color-danger-border)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-[14px] w-[14px]" />
                  Delete
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
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-[14px] w-[14px] sm:left-3 -translate-y-1/2 text-[var(--color-ink-muted)]" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder={contentMode ? "Describe the image, e.g. car" : "Search by name"}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] h-9 py-0 pl-8 pr-3 text-[16px] placeholder:text-[13px] outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent-soft)] sm:h-auto sm:py-2 sm:pl-9 sm:text-[12px]"
                />
              </div>

              <button
                type="button"
                onClick={toggleContentMode}
                aria-pressed={contentMode}
                aria-label="Search by image content"
                title={contentMode ? "Searching by image content — click to search by name" : "Search by image content"}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
                  contentMode
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                <Sparkles className="h-[15px] w-[15px]" />
              </button>

              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                aria-label="Filters"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] sm:hidden"
              >
                <SlidersHorizontal className="h-[16px] w-[16px]" />
              </button>

              <div className="hidden sm:flex">
                <FilterControls
                  mimeTypeFilter={mimeTypeFilter}
                  sortBy={sortBy}
                  order={order}
                  onMimeTypeChange={(value) => updateFilter("mimeType", value)}
                  onSortByChange={(value) => updateFilter("sortBy", value)}
                  onToggleOrder={() => updateFilter("order", order === "asc" ? "desc" : "asc")}
                />
              </div>

              <button
                type="button"
                onClick={() => setSelectionMode(true)}
                disabled={visibleFolders.length + visibleFiles.length === 0}
                aria-label="Select items"
                title="Select"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckSquare className="h-[14px] w-[14px]" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {contentMode && !selectionMode && (
          <p className="mt-2 flex min-h-[18px] items-center gap-2 text-[12px] text-[var(--color-ink-muted)] sm:mt-3 sm:text-[13px]">
            {contentSearching ? (
              <>
                <span className="min-w-0 truncate">
                  {searchQuery.isFetching && !searchQuery.isLoading
                    ? "Searching…"
                    : `Images matching “${contentQuery.trim()}” in all folders`}
                </span>
                <button
                  type="button"
                  onClick={clearContentSearch}
                  className="shrink-0 font-medium text-[var(--color-accent)] hover:underline"
                >
                  Clear
                </button>
              </>
            ) : (
              <span>
                {searchInput.trim().length === 0
                  ? "Find images by what they show, in all folders."
                  : `Type at least ${MIN_CONTENT_QUERY_LENGTH} characters to search.`}
              </span>
            )}
          </p>
        )}

        <div className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 sm:mt-5 sm:rounded-lg sm:px-5">
          <AnimatePresence mode="wait" initial={false}>
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <SkeletonList />
              </motion.div>
            ) : loadError ? (
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
                  {errorMessage(loadError, "Could not load this folder")}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={contentSearching ? `search-${contentQuery.trim()}` : `content-${currentFolderId ?? "root"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <BrowserTable
                  folders={visibleFolders}
                  files={visibleFiles}
                  onOpenFolder={(folder) => goToFolder(folder.id)}
                  onRenameFolder={(folder) => setModal({ type: "rename-folder", folder })}
                  onMoveFolder={(folder) => setModal({ type: "move-folder", folder })}
                  onDeleteFolder={(folder) => setModal({ type: "delete-folder", folder })}
                  onDownloadFile={handleDownload}
                  onRenameFile={(file) => setModal({ type: "rename-file", file })}
                  onMoveFile={(file) => setModal({ type: "move-file", file })}
                  onDeleteFile={(file) => setModal({ type: "delete-file", file })}
                  onShareFile={(file) => setModal({ type: "share-file", file })}
                  selectionMode={selectionMode}
                  selectedFileIds={selectedFileIds}
                  selectedFolderIds={selectedFolderIds}
                  onToggleFileSelected={toggleFileSelected}
                  onToggleFolderSelected={toggleFolderSelected}
                  emptyState={
                    contentSearching
                      ? {
                          title: "No matching images",
                          hint: "Try another word, or wait a few seconds if you just uploaded the image.",
                        }
                      : undefined
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {!selectionMode && (
        <>
          <Fab onClick={() => setFabOpen(true)} label="Add" icon={<Plus className="h-6 w-6" />} />

          {/* Persistent, bottom-anchored on every breakpoint — unlike Fab, which is mobile-only. */}
          <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-20 z-40 flex items-center gap-2 sm:right-auto">
            <button
              type="button"
              onClick={() => navigate("/trash")}
              aria-label="Trash"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-[12px] font-medium text-[var(--color-ink-muted)] shadow-lg sm:px-4 sm:py-2.5 sm:text-[13px] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]"
            >
              <Trash2 className="h-[14px] w-[14px]" />
              <span className="hidden sm:inline">Trash</span>
            </button>
            <StorageIndicator />
            {isAdmin && (
              <button
                type="button"
                onClick={() => setModal({ type: "register-user" })}
                aria-label="New user"
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-[12px] font-medium text-[var(--color-ink-muted)] shadow-lg sm:px-4 sm:py-2.5 sm:text-[13px] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]"
              >
                <UserPlus className="h-[14px] w-[14px]" />
                <span className="hidden sm:inline">New user</span>
              </button>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {fabOpen && (
          <ActionSheet
            key="fab-sheet"
            title="Add"
            onClose={() => setFabOpen(false)}
            actions={[
              { label: "Upload files", icon: UploadCloud, onClick: () => uploadRef.current?.open() },
              { label: "New folder", icon: FolderPlus, onClick: () => setModal({ type: "new-folder" }) },
            ]}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {filtersOpen && (
          <Modal key="filters" title="Filters" onClose={() => setFiltersOpen(false)}>
            <FilterControls
              mimeTypeFilter={mimeTypeFilter}
              sortBy={sortBy}
              order={order}
              onMimeTypeChange={(value) => updateFilter("mimeType", value)}
              onSortByChange={(value) => updateFilter("sortBy", value)}
              onToggleOrder={() => updateFilter("order", order === "asc" ? "desc" : "asc")}
              stacked
            />
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="mt-6 w-full rounded-md bg-[var(--color-accent)] py-3 text-[15px] font-semibold text-[var(--color-accent-contrast)] hover:bg-[var(--color-accent-hover)]"
            >
              Done
            </button>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal?.type === "new-folder" && (
          <NameModal
            key="new-folder"
            title="New folder"
            label="Folder name"
            confirmLabel="Create"
            onCancel={closeModal}
            onConfirm={handleCreateFolder}
            isSubmitting={createFolderMutation.isPending}
            error={modalError}
          />
        )}

        {modal?.type === "rename-file" && (
          <NameModal
            key="rename-file"
            title="Rename file"
            label="File name"
            initialValue={modal.file.name}
            onCancel={closeModal}
            onConfirm={handleRename}
            isSubmitting={renameFileMutation.isPending}
            error={modalError}
          />
        )}

        {modal?.type === "rename-folder" && (
          <NameModal
            key="rename-folder"
            title="Rename folder"
            label="Folder name"
            initialValue={modal.folder.name}
            onCancel={closeModal}
            onConfirm={handleRename}
            isSubmitting={renameFolderMutation.isPending}
            error={modalError}
          />
        )}

        {modal?.type === "move-file" && (
          <MoveModal
            key="move-file"
            title={`Move "${modal.file.name}"`}
            initialFolderId={modal.file.folderId}
            onCancel={closeModal}
            onConfirm={handleMove}
            isSubmitting={moveFileMutation.isPending}
            error={modalError}
          />
        )}

        {modal?.type === "move-folder" && (
          <MoveModal
            key="move-folder"
            title={`Move "${modal.folder.name}"`}
            initialFolderId={modal.folder.parentId}
            disabledFolderId={modal.folder.id}
            onCancel={closeModal}
            onConfirm={handleMove}
            isSubmitting={moveFolderMutation.isPending}
            error={modalError}
          />
        )}

        {modal?.type === "delete-file" && (
          <ConfirmDialog
            key="delete-file"
            title="Delete file"
            message={`Move "${modal.file.name}" to the trash?`}
            onCancel={closeModal}
            onConfirm={handleDelete}
            isSubmitting={deleteFileMutation.isPending}
            error={modalError}
          />
        )}

        {modal?.type === "delete-folder" && (
          <ConfirmDialog
            key="delete-folder"
            title="Delete folder"
            message={`Move "${modal.folder.name}" and everything inside it to the trash?`}
            onCancel={closeModal}
            onConfirm={handleDelete}
            isSubmitting={deleteFolderMutation.isPending}
            error={modalError}
          />
        )}

        {modal?.type === "share-file" && (
          <ShareModal
            key="share-file"
            file={modal.file}
            shareUrl={shareResult ? getShareUrl(shareResult.token) : null}
            isSubmitting={createShareLinkMutation.isPending}
            error={modalError}
            onCancel={closeModal}
            onCreate={handleCreateShare}
          />
        )}

        {modal?.type === "register-user" && (
          <RegisterUserModal
            key="register-user"
            onCancel={closeModal}
            onSubmit={handleRegisterUser}
            isSubmitting={registerUserMutation.isPending}
            error={modalError}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bulkDeleteOpen && (
          <ConfirmDialog
            key="bulk-delete"
            title="Delete items"
            message={`Move ${selectedCount} item(s) to the trash?`}
            onCancel={() => {
              setBulkDeleteOpen(false);
              setBulkDeleteError(null);
            }}
            onConfirm={handleBulkDelete}
            isSubmitting={bulkDeleteMutation.isPending}
            error={bulkDeleteError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}