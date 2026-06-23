"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";

const navGroups = [
  {
    group: null,
    items: [
      { label: "Overview", icon: "dashboard", href: "/admin" },
    ],
  },
  {
    group: "Property Management",
    items: [
      { label: "Properties", icon: "apartment",     href: "/admin/properties" },
      { label: "Units",      icon: "door_front",    href: "/admin/units"      },
      { label: "Owners",     icon: "person",        href: "/admin/owners"     },
      { label: "Tenants",    icon: "groups",        href: "/admin/tenants"    },
      { label: "Leases",     icon: "description",   href: "/admin/leases"     },
      { label: "Vendors",    icon: "handyman",      href: "/admin/vendors"    },
    ],
  },
  {
    group: "Tickets",
    items: [
      { label: "Tickets",   icon: "confirmation_number", href: "/admin/tickets" },
      { label: "Documents", icon: "folder",              href: "/admin/documents" },
    ],
  },
  {
    group: "Finance",
    items: [
      { label: "Invoices",   icon: "request_quote", href: "/admin/invoices"   },
      { label: "Receipts",   icon: "receipt",       href: "/admin/receipts"   },
      { label: "Expenses",   icon: "payments",      href: "/admin/expenses"   },
      { label: "Statements", icon: "receipt_long",  href: "/admin/statements" },
      { label: "Audit Log",  icon: "history",       href: "/admin/audit"      },
    ],
  },
  {
    group: "Marketing",
    items: [
      { label: "Listings",   icon: "home_work",     href: "/admin/listings"   },
      { label: "Inquiries",  icon: "forum",         href: "/admin/inquiries"  },
      { label: "Appraisals", icon: "analytics",     href: "/admin/appraisals" },
      { label: "PM Leads",   icon: "corporate_fare",href: "/admin/leads"      },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Site Settings", icon: "tune",       href: "/admin/settings"   },
    ],
  },
];

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
            src="/logo/logo-white-icon.png"
            alt="All Abode Property Solutions"
            width={120}
            height={38}
            className="h-8 w-auto"
          />
          <span className="label-caps ml-auto text-gold">Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navGroups.map(({ group, items }) => (
            <div key={group ?? "__top"}>
              {group && (
                <p className="px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                  {group}
                </p>
              )}
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon name={item.icon} size={20} />
                  {item.label}
                </Link>
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
    <div className="rounded-lg border border-line bg-surface p-5">
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
    </div>
  );
}
