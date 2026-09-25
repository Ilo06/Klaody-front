import type { ReactNode } from "react";

interface FabProps {
  onClick: () => void;
  label: string;
  icon: ReactNode;
}

/** Floating action button, mobile only — desktop gets inline toolbar buttons instead. */
export default function Fab({ onClick, label, icon }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-lg transition-transform hover:bg-[var(--color-accent-hover)] active:scale-95 sm:hidden"
    >
      {icon}
    </button>
  );
}
