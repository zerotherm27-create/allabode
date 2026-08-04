"use client";

import { motion, useReducedMotion } from "motion/react";

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.15 }}
    >
      {children}
    </motion.div>
  );
}
