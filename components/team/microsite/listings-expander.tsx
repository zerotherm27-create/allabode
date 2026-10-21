"use client";

import { useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";

/**
 * "View all properties": the remaining cards are server-rendered and simply
 * revealed in place (no navigation, which a specialist subdomain would
 * redirect). The toggle sits in the section header on desktop and under the
 * grid on phones; both control the same region.
 */
export function ListingsExpander({
  first,
  rest,
  restCount,
}: {
  first: ReactNode;
  rest: ReactNode;
  restCount: number;
}) {
  const [open, setOpen] = useState(false);
  const regionId = useId();

  return (
    <>
      {first}
      {restCount > 0 && (
        <>
          <div id={regionId} hidden={!open}>
            {rest}
          </div>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={regionId}
              onClick={() => setOpen((v) => !v)}
              className="label-caps inline-flex min-h-[44px] items-center gap-2 border border-navy px-6 text-navy transition-colors duration-[var(--dur-mid)] hover:bg-navy hover:text-white"
            >
              {open ? "Show fewer properties" : `View all properties (${restCount} more)`}
              <Icon name="expand_more" size={18} className={open ? "rotate-180" : undefined} />
            </button>
          </div>
        </>
      )}
    </>
  );
}
