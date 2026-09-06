"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DUR_FAST, EASE_OUT } from "@/components/motion";
import { Icon } from "@/components/icon";
import { site } from "@/lib/site";

export function HelpPopover() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Help"
        onClick={() => setOpen((o) => !o)}
        className="flex size-10 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-navy"
      >
        <Icon name="help" size={22} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-line bg-surface shadow-xl"
            initial={{ opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : -4 }}
            transition={{ duration: reduced ? 0 : DUR_FAST, ease: EASE_OUT }}
          >
            <div className="border-b border-line px-4 py-3">
              <span className="text-sm font-semibold text-navy">Help</span>
            </div>

            <Link
              href="/admin/setup"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b border-line px-4 py-3 hover:bg-surface-gray"
            >
              <Icon name="menu_book" size={18} className="text-navy-700" />
              <span className="text-sm text-navy">Setup Guide</span>
            </Link>

            <div className="flex items-center gap-3 border-b border-line px-4 py-3 text-slate">
              <Icon name="search" size={18} />
              <span className="text-sm">
                Press <kbd className="rounded border border-line bg-surface-gray px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd> to search anytime
              </span>
            </div>

            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate">Need help?</p>
              <a href={site.emailHref} className="flex items-center gap-3 py-1 text-sm text-navy-700 hover:text-gold">
                <Icon name="mail" size={16} /> {site.email}
              </a>
              <a href={site.phoneHref} className="flex items-center gap-3 py-1 text-sm text-navy-700 hover:text-gold">
                <Icon name="call" size={16} /> {site.phone}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
