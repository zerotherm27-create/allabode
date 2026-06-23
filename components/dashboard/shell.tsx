"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/dashboard/notification-bell";

export type NavItem = { label: string; icon: string; href: string };

export function DashboardShell({
  role,
  nav,
  userName,
  children,
}: {
  role: "Owner" | "Tenant";
  nav: NavItem[];
  userName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/portal/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-surface-gray lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-navy text-white transition-transform duration-[var(--dur-mid)] ease-[var(--ease-out)] lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <span className="font-display text-base font-bold">
            All Abode
            <span className="text-gold">.</span>
          </span>
          <span className="label-caps ml-1 rounded bg-gold/15 px-2 py-0.5 text-[10px] text-gold-soft">
            {role}
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Dashboard">
          {nav.map((item, i) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={i === 0 ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                i === 0
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/appraisal"
            className="label-caps flex items-center justify-center gap-2 bg-gold py-2.5 text-navy transition-colors hover:bg-gold-bright"
          >
            <Icon name="analytics" size={18} />
            Request Appraisal
          </Link>
          <button
            type="button"
            onClick={logout}
            className="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon name="logout" size={20} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Scrim */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Main column */}
      <div className="flex min-h-screen flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-surface/90 px-4 backdrop-blur-md md:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="inline-flex size-10 items-center justify-center rounded-md text-navy hover:bg-surface-gray lg:hidden"
          >
            <Icon name="menu" size={24} />
          </button>

          <label className="relative hidden flex-1 sm:block sm:max-w-xs">
            <span className="sr-only">Search</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate">
              <Icon name="search" size={18} />
            </span>
            <input
              type="search"
              placeholder="Search…"
              className="h-10 w-full rounded-md border border-line bg-surface-gray pl-9 pr-3 text-sm text-ink placeholder:text-slate-soft focus:border-navy-700 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-navy-700/15"
            />
          </label>

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell role={role.toLowerCase() as "owner" | "tenant"} />
            <div className="flex items-center gap-2 rounded-md px-2 py-1">
              <span className="flex size-9 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
                {userName.charAt(0)}
              </span>
              <span className="hidden text-sm font-medium text-navy sm:block">
                {userName}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

/* ---- Reusable dashboard widgets ---- */

export function StatCard({
  icon,
  label,
  value,
  delta,
  tone = "up",
}: {
  icon: string;
  label: string;
  value: string;
  delta?: string;
  tone?: "up" | "down" | "flat";
}) {
  const toneColor =
    tone === "up" ? "text-available" : tone === "down" ? "text-sold" : "text-slate";
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="label-caps text-slate">{label}</span>
        <span className="flex size-9 items-center justify-center rounded-md bg-navy/5 text-navy-700">
          <Icon name={icon} size={20} />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-navy">{value}</p>
      {delta && (
        <p className={`mt-1 flex items-center gap-1 text-sm ${toneColor}`}>
          <Icon
            name={tone === "down" ? "trending_down" : "trending_up"}
            size={16}
          />
          {delta}
        </p>
      )}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-display text-base font-semibold text-navy">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
