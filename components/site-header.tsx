"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { mainNav } from "@/lib/site";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

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
        <Logo />

        {/* Desktop nav — all 8 items flat, visible at xl */}
        <nav aria-label="Primary" className="hidden items-center gap-4 xl:flex">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`relative whitespace-nowrap text-sm font-medium transition-colors hover:text-navy ${
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

        <div className="flex items-center gap-2">
          <Button
            href="/appraisal"
            variant="ghost"
            className="hidden lg:inline-flex"
          >
            Request Appraisal
          </Button>
          <Button href="/list-your-property" variant="gold" className="hidden sm:inline-flex">
            List Your Property
          </Button>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="flex h-11 w-11 items-center justify-center text-navy xl:hidden"
          >
            <Icon name="menu" size={28} />
          </button>
        </div>
      </div>

      {/* Mobile / tablet drawer (shows below xl) */}
      {open && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
            onClick={close}
          />
          <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-sm flex-col bg-cream shadow-[var(--shadow-lift)]">
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <Logo />
              <button
                type="button"
                aria-label="Close menu"
                onClick={close}
                className="flex h-11 w-11 items-center justify-center text-navy"
              >
                <Icon name="close" size={28} />
              </button>
            </div>
            <nav
              aria-label="Mobile"
              className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
            >
              <Link
                href="/"
                onClick={close}
                aria-current={isActive("/") ? "page" : undefined}
                className={`rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                  pathname === "/" ? "bg-surface-gray text-navy" : "text-slate hover:bg-surface-gray hover:text-navy"
                }`}
              >
                Home
              </Link>
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`rounded-lg px-4 py-3 text-base font-medium transition-colors ${
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
              <Button href="/appraisal" variant="ghost" onClick={close}>
                Request Appraisal
              </Button>
              <Button href="/list-your-property" variant="gold" onClick={close}>
                List Your Property
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
