"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { mainNav, type NavItem } from "@/lib/site";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";

function isGroup(item: NavItem): item is { label: string; children: readonly { label: string; href: string }[] } {
  return "children" in item;
}

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
  const groupActive = (children: readonly { href: string }[]) =>
    children.some((c) => isActive(c.href));

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-cream/95 backdrop-blur-md">
      <div className="container-site flex h-16 items-center justify-between gap-4 md:h-20">
        <Logo />

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {mainNav.map((item) =>
            isGroup(item) ? (
              <div key={item.label} className="group relative">
                <button
                  type="button"
                  aria-haspopup="true"
                  className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-navy ${
                    groupActive(item.children) ? "text-navy" : "text-slate"
                  }`}
                >
                  {item.label}
                  <Icon
                    name="expand_more"
                    size={18}
                    className="transition-transform group-hover:rotate-180"
                  />
                </button>
                {/* Dropdown — shows on hover and on keyboard focus-within */}
                <div className="invisible absolute left-1/2 top-full z-50 w-60 -translate-x-1/2 pt-3 opacity-0 transition-all duration-[var(--dur-fast)] group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="overflow-hidden border border-line bg-surface shadow-[var(--shadow-card)]">
                    {item.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        aria-current={isActive(c.href) ? "page" : undefined}
                        className={`block px-5 py-3 text-sm transition-colors hover:bg-surface-gray ${
                          isActive(c.href)
                            ? "font-semibold text-navy"
                            : "text-slate hover:text-navy"
                        }`}
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`relative text-sm font-medium transition-colors hover:text-navy ${
                  isActive(item.href) ? "text-navy" : "text-slate"
                }`}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="absolute -bottom-[22px] left-0 h-0.5 w-full bg-gold" />
                )}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-3">
          <Button
            href="/appraisal"
            variant="ghost"
            className="hidden md:inline-flex"
          >
            Request Appraisal
          </Button>
          <Button href="/list-your-property" className="hidden sm:inline-flex">
            List Your Property
          </Button>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="flex h-11 w-11 items-center justify-center text-navy lg:hidden"
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
              {mainNav.map((item) =>
                isGroup(item) ? (
                  <div key={item.label} className="mt-2">
                    <p className="label-caps px-4 pb-1 pt-2 text-slate">
                      {item.label}
                    </p>
                    {item.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        onClick={close}
                        aria-current={isActive(c.href) ? "page" : undefined}
                        className={`block rounded-md px-4 py-3 text-base font-medium transition-colors ${
                          isActive(c.href)
                            ? "bg-surface-gray text-navy"
                            : "text-slate hover:bg-surface-gray hover:text-navy"
                        }`}
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                ) : (
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
                )
              )}
            </nav>
            <div className="mt-auto flex flex-col gap-3 border-t border-line p-5">
              <Button href="/appraisal" variant="ghost" onClick={close}>
                Request Appraisal
              </Button>
              <Button href="/list-your-property" onClick={close}>
                List Your Property
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
