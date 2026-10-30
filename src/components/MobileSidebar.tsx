import { useEffect } from "react";
import { motion } from "framer-motion";
import { Folder, LogOut, Moon, Sun, Trash2, UserPlus, X } from "lucide-react";
import Logo from "./Logo";
import StorageIndicator from "./StorageIndicator";
import { useTheme } from "../context/ThemeContext";

interface MobileSidebarProps {
  isAdmin?: boolean;
  onClose: () => void;
  /** Shown only when provided (hidden on the trash page itself). */
  onOpenTrash?: () => void;
  /** Shown only when provided (hidden on the files page itself). */
  onOpenFiles?: () => void;
  /** Shown only for admins, when provided. */
  onNewUser?: () => void;
  onSignOut: () => void;
}

/** Drawer from the left. Mobile only (the trigger is `sm:hidden`). */
export default function MobileSidebar({
  isAdmin = false,
  onClose,
  onOpenTrash,
  onOpenFiles,
  onNewUser,
  onSignOut,
}: MobileSidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const itemClass =
    "flex w-full items-center gap-3.5 rounded-2xl px-2.5 py-2.5 text-left text-[15px] font-medium text-[var(--color-ink)] active:bg-[var(--color-border)]/40";
  const iconTileClass =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 bg-black/40 sm:hidden"
      onClick={onClose}
    >
      {/* Light slide from the left: same fade, duration and easing as the "Add" action sheet. */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24, transition: { duration: 0.15 } }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex h-full w-[84%] max-w-[320px] transform-gpu flex-col rounded-r-3xl border-r border-[var(--color-border)] bg-[var(--color-bg)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] will-change-[transform,opacity]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 pb-4">
          <Logo className="text-[20px]" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] active:text-[var(--color-ink)]"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {onOpenFiles && (
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                onClose();
                onOpenFiles();
              }}
            >
              <span className={iconTileClass}>
                <Folder className="h-[18px] w-[18px]" />
              </span>
              Files
            </button>
          )}
          {onOpenTrash && (
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                onClose();
                onOpenTrash();
              }}
            >
              <span className={iconTileClass}>
                <Trash2 className="h-[18px] w-[18px]" />
              </span>
              Trash
            </button>
          )}
          {isAdmin && onNewUser && (
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                onClose();
                onNewUser();
              }}
            >
              <span className={iconTileClass}>
                <UserPlus className="h-[18px] w-[18px]" />
              </span>
              New user
            </button>
          )}
        </nav>

        {/* Icon-only actions, side by side, filling the full width above the storage block. */}
        <div className="mx-5 mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] transition-colors active:border-[var(--color-border-strong)] active:text-[var(--color-ink)]"
          >
            {isDark ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] transition-colors active:border-[var(--color-danger-border)] active:bg-[var(--color-danger-soft)] active:text-[var(--color-danger)]"
          >
            <LogOut className="h-[17px] w-[17px]" />
          </button>
        </div>

        <div className="px-5">
          <StorageIndicator variant="panel" />
        </div>
      </motion.aside>
    </motion.div>
  );
}
