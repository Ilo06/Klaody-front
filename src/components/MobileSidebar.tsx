import { useEffect } from "react";
import { motion } from "framer-motion";
import { LogOut, Moon, Sun, Trash2, UserPlus, X } from "lucide-react";
import Logo from "./Logo";
import StorageIndicator from "./StorageIndicator";
import { useTheme } from "../context/ThemeContext";

interface MobileSidebarProps {
  isAdmin: boolean;
  onClose: () => void;
  onOpenTrash: () => void;
  onNewUser: () => void;
  onSignOut: () => void;
}

/** Slide-in drawer from the left. Mobile only (the trigger is `sm:hidden`). */
export default function MobileSidebar({ isAdmin, onClose, onOpenTrash, onNewUser, onSignOut }: MobileSidebarProps) {
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 bg-black/40 sm:hidden"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%", transition: { duration: 0.18 } }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex h-full w-[84%] max-w-[320px] flex-col rounded-r-3xl border-r border-[var(--color-border)] bg-[var(--color-bg)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] shadow-xl"
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
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              onClose();
              onOpenTrash();
            }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Trash2 className="h-[18px] w-[18px]" />
            </span>
            Trash
          </button>
          {isAdmin && (
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                onClose();
                onNewUser();
              }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <UserPlus className="h-[18px] w-[18px]" />
              </span>
              New user
            </button>
          )}
        </nav>

        {/* Icon-only actions, side by side, just above the storage card. */}
        <div className="mx-5 mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] transition-colors active:border-[var(--color-border-strong)] active:text-[var(--color-ink)]"
          >
            {isDark ? <Sun className="h-[16px] w-[16px]" /> : <Moon className="h-[16px] w-[16px]" />}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] transition-colors active:border-[var(--color-danger-border)] active:bg-[var(--color-danger-soft)] active:text-[var(--color-danger)]"
          >
            <LogOut className="h-[16px] w-[16px]" />
          </button>
        </div>

        <div className="px-5">
          <StorageIndicator variant="panel" />
        </div>
      </motion.aside>
    </motion.div>
  );
}
