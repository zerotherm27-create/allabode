"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Desktop table row — background-color hover only (scaling a <tr> causes table reflow jank). */
export function MotionTr({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.tr
      className={className}
      whileHover={reduced ? undefined : { backgroundColor: "var(--color-surface-gray)" }}
    >
      {children}
    </motion.tr>
  );
}

/** Mobile stacked card — subtle scale hover. */
export function MotionCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div className={className} whileHover={reduced ? undefined : { scale: 1.01 }}>
      {children}
    </motion.div>
  );
}
