"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/icon";
import { APEX_ORIGIN, MICROSITE_NAV } from "@/components/team/microsite/links";

const navLink =
  "inline-flex min-h-[44px] items-center px-3 text-sm font-medium text-slate transition-colors hover:text-navy";

/**
 * The specialist microsite's own header: solid, sticky, hairline bottom rule.
 * Logo goes to the main site; nav items are in-page anchors (plus the absolute
 * "Our team" URL). Below lg the links move into a disclosure drawer.
 */
export function MicrositeHeader() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Escape closes the drawer and returns focus to the toggle; opening moves
  // focus to the first link so keyboard users land inside it.
  useEffect(() => {
    if (!open) return;
    drawerRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    function onResize() {
      if (window.matchMedia("(min-width: 1024px)").matches) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface">
      <div className="container-site flex h-[4.5rem] items-center justify-between gap-6">
        <div className="flex [&>a]:min-h-11">
          <Logo variant="color" className="h-10 sm:h-11" href={`${APEX_ORIGIN}/`} />
        </div>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {MICROSITE_NAV.map((item) => (
              <li key={item.label}>
                <a href={item.href} className={navLink}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#contact"
            className="label-caps hidden min-h-[44px] items-center border border-gold-ink px-5 text-gold-ink transition-colors duration-[var(--dur-mid)] hover:bg-gold-ink hover:text-white sm:inline-flex"
          >
            Inquire now
          </a>
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="microsite-drawer"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center border border-line text-navy transition-colors hover:bg-surface-gray lg:hidden"
          >
            <Icon name={open ? "close" : "menu"} size={24} />
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      <div
        id="microsite-drawer"
        ref={drawerRef}
        hidden={!open}
        className="border-t border-line bg-surface lg:hidden"
      >
        <nav aria-label="Primary mobile" className="container-site py-3">
          <ul className="flex flex-col">
            {MICROSITE_NAV.map((item) => (
              <li key={item.label} className="border-b border-line last:border-b-0">
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[48px] items-center justify-between text-base font-medium text-navy"
                >
                  {item.label}
                  <Icon name="chevron_right" size={20} className="text-slate" />
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className="label-caps mb-2 mt-3 flex min-h-[48px] items-center justify-center border border-gold-ink text-gold-ink sm:hidden"
          >
            Inquire now
          </a>
        </nav>
      </div>
    </header>
  );
}
