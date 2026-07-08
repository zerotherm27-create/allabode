"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { mainNav, isDropdown, type NavDropdown } from "@/lib/site";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const isDropdownActive = (item: NavDropdown) =>
    item.children.some((child) => isActive(child.href));

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="mx-auto flex max-w-[var(--container-site)] items-center justify-between gap-4 rounded-2xl border border-line/70 bg-cream/85 px-4 py-2.5 shadow-[0_8px_24px_-16px_rgba(15,20,30,0.25)] backdrop-blur-md sm:px-5">
        <Logo />

        {/* Desktop nav — Radix NavigationMenu */}
        <nav aria-label="Primary" className="hidden lg:flex">
          <NavigationMenu viewport={false}>
            <NavigationMenuList className="gap-0.5">
              {mainNav.map((item) => {
                if (isDropdown(item)) {
                  return (
                    <NavigationMenuItem key={item.label} value={item.label.toLowerCase().replace(/\s+/g, "-")}>
                      <NavigationMenuTrigger
                        className={cn(
                          "rounded-full bg-transparent text-sm font-medium hover:bg-surface-gray hover:text-navy data-[state=open]:bg-surface-gray",
                          isDropdownActive(item) ? "text-navy" : "text-slate"
                        )}
                      >
                        {item.label}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="w-56 p-1.5">
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <NavigationMenuLink asChild>
                                <Link
                                  href={child.href}
                                  className={cn(
                                    "flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-surface-gray hover:text-navy",
                                    isActive(child.href)
                                      ? "font-semibold text-navy"
                                      : "text-slate"
                                  )}
                                >
                                  {child.label}
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  );
                }

                return (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={item.href}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        className={cn(
                          "inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors hover:bg-surface-gray hover:text-navy",
                          isActive(item.href) ? "text-navy" : "text-slate"
                        )}
                      >
                        {item.label}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        <div className="flex items-center gap-2">
          <Button href="/contact" variant="gold" className="!hidden rounded-full px-5 py-2 text-xs sm:!inline-flex">
            Contact All Abode
          </Button>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-navy lg:hidden"
          >
            <Icon name="menu" size={24} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={close} />
          <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-sm flex-col bg-cream shadow-[var(--shadow-lift)]">
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <Logo />
              <button
                type="button"
                aria-label="Close menu"
                onClick={close}
                className="flex h-11 w-11 items-center justify-center text-navy"
              >
                <Icon name="close" size={24} />
              </button>
            </div>
            <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
              {mainNav.map((item) => {
                if (isDropdown(item)) {
                  return (
                    <div key={item.label}>
                      <p className="label-caps px-4 pb-1 pt-3 text-slate">{item.label}</p>
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={close}
                          aria-current={isActive(child.href) ? "page" : undefined}
                          className={cn(
                            "block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                            isActive(child.href)
                              ? "bg-surface-gray text-navy"
                              : "text-slate hover:bg-surface-gray hover:text-navy"
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-4 py-3 text-base font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-surface-gray text-navy"
                        : "text-slate hover:bg-surface-gray hover:text-navy"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-line p-5">
              <Button href="/contact" variant="gold" onClick={close} className="w-full rounded-full">
                Contact All Abode
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
