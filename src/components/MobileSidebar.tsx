import { useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, UserPlus, X } from "lucide-react";
import Logo from "./Logo";
import StorageIndicator from "./StorageIndicator";

interface MobileSidebarProps {
  isAdmin: boolean;
  onClose: () => void;
  onOpenTrash: () => void;
  onNewUser: () => void;
}

/** Slide-in drawer from the left. Mobile only (the trigger is `sm:hidden`). */
export default function MobileSidebar({ isAdmin, onClose, onOpenTrash, onNewUser }: MobileSidebarProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const itemClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[15px] text-[var(--color-ink)] hover:bg-[var(--color-border)]/30";

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
        className="flex h-full w-[78%] max-w-[300px] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 pb-3">
          <Logo className="text-[18px]" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              onClose();
              onOpenTrash();
            }}
          >
            <Trash2 className="h-[18px] w-[18px] shrink-0 text-[var(--color-ink-muted)]" />
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
              <UserPlus className="h-[18px] w-[18px] shrink-0 text-[var(--color-ink-muted)]" />
              New user
            </button>
          )}
        </nav>

        <div className="px-4">
          <StorageIndicator variant="panel" />
        </div>
      </motion.aside>
    </motion.div>
  );
}
