"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/components/motion";

export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
