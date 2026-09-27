import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export interface ActionSheetItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}

interface ActionSheetProps {
  title?: string;
  actions: ActionSheetItem[];
  onClose: () => void;
}

/**
 * A native-feeling action sheet: bottom-anchored on every breakpoint (not
 * just mobile) so row menus and the "+" menu read the same everywhere.
 */
export default function ActionSheet({ title, actions, onClose }: ActionSheetProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:px-4 sm:pb-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full overflow-hidden rounded-t-2xl border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-sm sm:rounded-xl sm:border"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Actions"}
      >
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-[var(--color-border-strong)] sm:hidden" />
        {title && (
          <p className="truncate px-5 pb-2 pt-4 text-[13px] font-medium text-[var(--color-ink-muted)]">{title}</p>
        )}
        <ul className={title ? "py-1" : "py-2"}>
          {actions.map((action) => (
            <li key={action.label}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  action.onClick();
                }}
                className={`flex w-full items-center gap-3 px-5 py-3.5 text-left text-[15px] hover:bg-[var(--color-border)]/30 ${
                  action.danger ? "text-[var(--color-danger)]" : "text-[var(--color-ink)]"
                }`}
              >
                <action.icon className="h-[18px] w-[18px] shrink-0" />
                {action.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-1 border-t border-[var(--color-border)] p-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg py-3 text-center text-[15px] font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-border)]/30"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}