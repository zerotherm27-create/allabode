"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DUR_MID, EASE_OUT } from "@/components/motion";
import { Icon } from "@/components/icon";

export type FaqItem = { q: string; a: string };

export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="mx-auto max-w-3xl divide-y divide-line border-y border-line">
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `faq-panel-${i}`;
        const btnId = `faq-btn-${i}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus)]"
              >
                <span className="font-display text-lg font-semibold text-navy">
                  {item.q}
                </span>
                <span
                  className={`shrink-0 text-gold-ink transition-transform duration-[var(--dur-mid)] ease-[var(--ease-out)] ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  <Icon name="expand_more" size={24} />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  initial={{ height: 0, opacity: reduced ? 1 : 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: reduced ? 1 : 0 }}
                  transition={{ duration: reduced ? 0 : DUR_MID, ease: EASE_OUT }}
                  className="overflow-hidden"
                >
                  <div className="pb-6 pr-10 text-slate leading-relaxed">{item.a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
