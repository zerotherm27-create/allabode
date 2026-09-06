"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { pressable, Reveal } from "@/components/motion";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";
import { navGroups } from "@/lib/admin/nav-groups";
import { CommandPalette } from "@/components/admin/command-palette";
import { HelpPopover } from "@/components/admin/help-popover";

const MotionLink = motion.create(Link);

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion() ?? false;

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh bg-surface-gray">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy text-white transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <Image
            src="/logo/logo-2-white.png"
            alt="All Abode Property Solutions"
            width={180}
            height={48}
            className="h-10 w-auto"
          />
          <span className="label-caps ml-auto text-gold">Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navGroups.map(({ group, items }) => (
            <div key={group ?? "__top"}>
              {group && (
                <p className="px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                  {group}
                </p>
              )}
              {items.map((item) => (
                <MotionLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                  {...pressable(reduced)}
                >
                  <Icon name={item.icon} size={20} />
                  {item.label}
                </MotionLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
          >
            <Icon name="open_in_new" size={18} />
            View site
          </Link>
          <button
            type="button"
            onClick={logout}
            className="mt-1 flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
          >
            <Icon name="logout" size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-navy/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b border-line bg-surface px-5">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center text-navy lg:hidden"
          >
            <Icon name="menu" size={26} />
          </button>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate">
            <CommandPalette />
            <HelpPopover />
            <span className="hidden h-6 w-px bg-line sm:inline-block" />
            <Icon name="account_circle" size={22} className="text-navy-700" />
            <span className="hidden sm:inline">{email}</span>
          </div>
        </header>
        <main className="flex-1 p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent?: boolean;
}) {
  return (
    <Reveal as="div" y={12} className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-md ${
            accent ? "bg-gold/15 text-gold-bright" : "bg-navy/5 text-navy-700"
          }`}
        >
          <Icon name={icon} size={22} />
        </span>
      </div>
      <p className="mt-4 font-display text-2xl font-bold text-navy">{value}</p>
      <p className="mt-1 text-sm text-slate">{label}</p>
    </Reveal>
  );
}
