import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface FabProps {
  onClick: () => void;
  label: string;
  icon: ReactNode;
}

/** Floating action button, mobile only — desktop gets inline toolbar buttons instead. */
export default function Fab({ onClick, label, icon }: FabProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.12 }}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-lg hover:bg-[var(--color-accent-hover)] sm:hidden"
    >
      {icon}
    </motion.button>
  );
}
