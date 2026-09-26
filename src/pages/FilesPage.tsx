import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpDown,
  FolderPlus,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import Breadcrumbs from "../components/Breadcrumbs";
import BrowserTable from "../components/BrowserTable";
import UploadDropzone, { type UploadDropzoneHandle } from "../components/UploadDropzone";
import NameModal from "../components/NameModal";
import MoveModal from "../components/MoveModal";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
import ActionSheet from "../components/ActionSheet";
import ShareModal from "../components/ShareModal";
import Fab from "../components/Fab";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import {
  ApiError,
  downloadFile,
  getShareUrl,
  type FileMetadata,
  type FolderMetadata,
  type ShareResponse,
} from "../lib/api";
import {
  useAllFolders,
  useCreateFolder,
  useCreateShareLink,
  useDeleteFile,
  useDeleteFolder,
  useFiles,
  useFolders,
  useMoveFile,
  useMoveFolder,
  useRenameFile,
  useRenameFolder,
} from "../hooks/useFileBrowser";

type ModalState =
  | { type: "new-folder" }
  | { type: "rename-file"; file: FileMetadata }
  | { type: "rename-folder"; folder: FolderMetadata }
  | { type: "move-file"; file: FileMetadata }
  | { type: "move-folder"; folder: FolderMetadata }
  | { type: "delete-file"; file: FileMetadata }
  | { type: "delete-folder"; folder: FolderMetadata }
  | { type: "share-file"; file: FileMetadata }
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
  const parsedFolderId = folderIdParam ? Number(folderIdParam) : null;
  const currentFolderId = Number.isNaN(parsedFolderId) ? null : parsedFolderId;

  const navigate = useNavigate();
  const { clearSession } = useAuth();
  const { showToast } = useToast();
  const uploadRef = useRef<UploadDropzoneHandle>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const nameFilter = searchParams.get("name") ?? "";
  const mimeTypeFilter = searchParams.get("mimeType") ?? "";
  const sortBy = (searchParams.get("sortBy") as "name" | "size" | "uploadedAt") || "uploadedAt";
  const order = (searchParams.get("order") as "asc" | "desc") || "desc";

  const [searchInput, setSearchInput] = useState(nameFilter);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modal, setModal] = useState<ModalState>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [shareResult, setShareResult] = useState<ShareResponse | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const allFoldersQuery = useAllFolders();
  const foldersById = useMemo(() => {
    const map = new Map<number, FolderMetadata>();
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
    name: nameFilter || undefined,
    mimeType: mimeTypeFilter || undefined,
    sortBy,
    order,
  });

  const createFolderMutation = useCreateFolder();
  const renameFileMutation = useRenameFile();
  const renameFolderMutation = useRenameFolder();
  const moveFileMutation = useMoveFile();
  const moveFolderMutation = useMoveFolder();
  const deleteFileMutation = useDeleteFile();
  const deleteFolderMutation = useDeleteFolder();
  const createShareLinkMutation = useCreateShareLink();

  const goToFolder = (folderId: number | null) => {
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
    searchDebounce.current = setTimeout(() => updateFilter("name", value), 350);
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

  const handleMove = (destinationId: number | null) => {
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

  const handleDownload = async (file: FileMetadata) => {
    try {
      await downloadFile(file.id, file.name);
    } catch (err) {
      showToast(errorMessage(err, "Could not download the file"), "error");
    }
  };

  const isLoading = foldersQuery.isLoading || filesQuery.isLoading;
  const loadError = foldersQuery.error ?? filesQuery.error;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] backdrop-blur sm:px-8 sm:py-5">
        <span className="text-[23px] font-bold tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
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

      <main className="mx-auto max-w-5xl px-5 pb-28 pt-6 sm:px-8 sm:pb-24 sm:pt-8">
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

        <div className="mt-6">
          <UploadDropzone ref={uploadRef} folderId={currentFolderId} onUploaded={() => filesQuery.refetch()} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[160px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[var(--color-ink-muted)]" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search by name"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-9 pr-3 text-[16px] outline-none focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent-soft)] sm:py-2 sm:text-[13px]"
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-label="Filters"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] sm:hidden"
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
        </div>

        <div className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-5">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-[14px] text-[var(--color-ink-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
              <AlertCircle className="h-6 w-6 text-[var(--color-danger)]" />
              <p className="text-[14px] text-[var(--color-danger)]">
                {errorMessage(loadError, "Could not load this folder")}
              </p>
            </div>
          ) : (
            <BrowserTable
              folders={foldersQuery.data ?? []}
              files={filesQuery.data ?? []}
              onOpenFolder={(folder) => goToFolder(folder.id)}
              onRenameFolder={(folder) => setModal({ type: "rename-folder", folder })}
              onMoveFolder={(folder) => setModal({ type: "move-folder", folder })}
              onDeleteFolder={(folder) => setModal({ type: "delete-folder", folder })}
              onDownloadFile={handleDownload}
              onRenameFile={(file) => setModal({ type: "rename-file", file })}
              onMoveFile={(file) => setModal({ type: "move-file", file })}
              onDeleteFile={(file) => setModal({ type: "delete-file", file })}
              onShareFile={(file) => setModal({ type: "share-file", file })}
            />
          )}
        </div>
      </main>

      <Fab onClick={() => setFabOpen(true)} label="Add" icon={<Plus className="h-6 w-6" />} />

      {/* Persistent, bottom-anchored on every breakpoint — unlike Fab, which is mobile-only. */}
      <button
        type="button"
        onClick={() => navigate("/trash")}
        aria-label="Trash"
        className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-5 z-40 flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[13px] font-medium text-[var(--color-ink-muted)] shadow-lg transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]"
      >
        <Trash2 className="h-[14px] w-[14px]" />
        Trash
      </button>

      {fabOpen && (
        <ActionSheet
          title="Add"
          onClose={() => setFabOpen(false)}
          actions={[
            { label: "Upload files", icon: UploadCloud, onClick: () => uploadRef.current?.open() },
            { label: "New folder", icon: FolderPlus, onClick: () => setModal({ type: "new-folder" }) },
          ]}
        />
      )}

      {filtersOpen && (
        <Modal title="Filters" onClose={() => setFiltersOpen(false)}>
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

      {modal?.type === "new-folder" && (
        <NameModal
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
          file={modal.file}
          shareUrl={shareResult ? getShareUrl(shareResult.token) : null}
          isSubmitting={createShareLinkMutation.isPending}
          error={modalError}
          onCancel={closeModal}
          onCreate={handleCreateShare}
        />
      )}
    </div>
  );
}