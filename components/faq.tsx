"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

export type FaqItem = { q: string; a: string };

export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

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
                  className={`shrink-0 text-gold transition-transform duration-[var(--dur-mid)] ease-[var(--ease-out)] ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  <Icon name="expand_more" size={24} />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              hidden={!isOpen}
              className="pb-6 pr-10 text-slate leading-relaxed"
            >
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
