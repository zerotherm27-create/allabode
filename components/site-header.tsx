"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { mainNav, site } from "@/lib/site";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-cream/95 backdrop-blur-md">
      <div className="container-site flex h-16 items-center justify-between gap-4 md:h-20">
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-tight text-navy md:text-xl"
        >
          {site.shortName}
          <span className="text-gold">.</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative text-sm font-medium transition-colors hover:text-navy ${
                isActive(item.href) ? "text-navy" : "text-slate"
              }`}
            >
              {item.label}
              {isActive(item.href) && (
                <span className="absolute -bottom-[22px] left-0 h-0.5 w-full bg-gold" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button
            href="/list-your-property"
            variant="ghost"
            className="hidden md:inline-flex"
          >
            List Your Property
          </Button>
          <Button href="/appraisal" className="hidden sm:inline-flex">
            Request Appraisal
          </Button>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center text-navy lg:hidden"
          >
            <Icon name="menu" size={28} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-sm flex-col bg-cream shadow-[var(--shadow-lift)]">
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <span className="font-display text-lg font-bold text-navy">
                {site.shortName}
                <span className="text-gold">.</span>
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center text-navy"
              >
                <Icon name="close" size={28} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-3 py-4">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`rounded-md px-4 py-3 text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-surface-gray text-navy"
                      : "text-slate hover:bg-surface-gray hover:text-navy"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3 border-t border-line p-5">
              <Button href="/list-your-property" variant="ghost" onClick={close}>
                List Your Property
              </Button>
              <Button href="/appraisal" onClick={close}>
                Request Appraisal
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
