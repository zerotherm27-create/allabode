import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";
import { createTicketFromPortal } from "@/app/admin/ticket-actions";
import { TICKET_CATEGORIES } from "@/lib/tickets";

export const metadata: Metadata = { title: "Submit Request", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Dashboard",  icon: "dashboard",           href: "/dashboard/tenant" },
  { label: "My Lease",   icon: "description",         href: "/dashboard/tenant#lease" },
  { label: "Invoices",   icon: "request_quote",       href: "/dashboard/tenant/invoices" },
  { label: "Tickets",    icon: "confirmation_number", href: "/dashboard/tenant/tickets" },
  { label: "Payments",   icon: "payments",            href: "/dashboard/tenant#payments" },
  { label: "Statements", icon: "receipt_long",        href: "/dashboard/tenant#statements" },
];

const inputCls = "w-full rounded-md border border-line bg-surface-gray px-3 py-2.5 text-sm text-ink placeholder:text-slate focus:border-navy-700 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-navy-700/15";

export default async function NewTenantTicketPage() {
  const { role, tenantId } = await getCurrentRole();
  if (role !== "tenant") redirect(homeForRole(role));

  const supabase = await createClient();
  const { data: tenantRow } = await supabase.from("tenants").select("name")
    .eq("id", tenantId ?? "").maybeSingle();
  const tenantName = (tenantRow as { name?: string } | null)?.name ?? "Tenant";

  return (
    <DashboardShell role="Tenant" nav={nav} userName={tenantName}>
      <div className="mx-auto max-w-xl">
        <Link href="/dashboard/tenant/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
          <Icon name="arrow_back" size={18} /> Back to tickets
        </Link>
        <h1 className="font-display text-2xl font-bold text-navy">Submit a request</h1>
        <p className="mt-1 text-sm text-slate">Report a maintenance issue, billing question, or other concern.</p>

        <form action={createTicketFromPortal} className="mt-6 flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">Category <span className="text-sold">*</span></label>
            <select name="category" className={inputCls} required>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">How urgent is this?</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["low", "normal", "high", "critical"] as const).map((p) => (
                <label key={p} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-line bg-surface-gray px-3 py-2 text-sm capitalize has-[:checked]:border-navy-700 has-[:checked]:bg-navy/5">
                  <input type="radio" name="priority" value={p} defaultChecked={p === "normal"} className="sr-only" />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">Subject <span className="text-sold">*</span></label>
            <input name="subject" required className={inputCls} placeholder="Brief summary of the issue" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">Description <span className="text-sold">*</span></label>
            <textarea name="description" required rows={5} className={inputCls} placeholder="Describe the issue in detail — location, when it started, any photos you can describe…" />
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy py-3 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Icon name="send" size={18} /> Submit request
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
