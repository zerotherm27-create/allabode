import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, Panel, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";
import { TICKET_STATUS_LABEL, TICKET_STATUS_COLOR, TICKET_PRIORITY_COLOR, OPEN_STATUSES } from "@/lib/tickets";

export const metadata: Metadata = { title: "My Tickets", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Dashboard",  icon: "dashboard",     href: "/dashboard/tenant" },
  { label: "My Lease",   icon: "description",   href: "/dashboard/tenant#lease" },
  { label: "Invoices",   icon: "request_quote", href: "/dashboard/tenant/invoices" },
  { label: "Tickets",    icon: "confirmation_number", href: "/dashboard/tenant/tickets" },
  { label: "Payments",   icon: "payments",      href: "/dashboard/tenant#payments" },
  { label: "Statements", icon: "receipt_long",  href: "/dashboard/tenant#statements" },
];

type Ticket = {
  id: string; ticket_number: string; subject: string; category: string;
  priority: string; status: string; created_at: string; updated_at: string;
};

export default async function TenantTicketsPage() {
  const { role, tenantId } = await getCurrentRole();
  if (role !== "tenant") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: ticketData }, { data: tenantRow }] = await Promise.all([
    supabase.from("tickets")
      .select("id,ticket_number,subject,category,priority,status,created_at,updated_at")
      .order("updated_at", { ascending: false }),
    supabase.from("tenants").select("name").eq("id", tenantId ?? "").maybeSingle(),
  ]);

  const tickets    = (ticketData ?? []) as Ticket[];
  const tenantName = (tenantRow as { name?: string } | null)?.name ?? "Tenant";
  const openCount  = tickets.filter((t) => OPEN_STATUSES.includes(t.status)).length;

  return (
    <DashboardShell role="Tenant" nav={nav} userName={tenantName}>
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">My Tickets</h1>
            <p className="mt-1 text-sm text-slate">
              {tickets.length} total{openCount > 0 ? ` · ${openCount} open` : ""}
            </p>
          </div>
          <Link
            href="/dashboard/tenant/tickets/new"
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Icon name="add" size={18} /> Submit request
          </Link>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {tickets.length === 0 ? (
            <Panel title="No tickets yet">
              <p className="py-4 text-center text-sm text-slate">
                Have a maintenance issue or question? Submit a request and we'll get back to you.
              </p>
              <div className="mt-2 flex justify-center">
                <Link
                  href="/dashboard/tenant/tickets/new"
                  className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  <Icon name="add" size={18} /> Submit your first request
                </Link>
              </div>
            </Panel>
          ) : (
            tickets.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/tenant/tickets/${t.id}`}
                className="block rounded-lg border border-line bg-surface p-5 transition-colors hover:border-navy-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="label-caps text-xs text-slate">{t.ticket_number}</span>
                      <span className={`text-xs font-medium capitalize ${TICKET_PRIORITY_COLOR[t.priority] ?? "text-slate"}`}>
                        · {t.priority}
                      </span>
                    </div>
                    <p className="mt-1 font-medium text-navy">{t.subject}</p>
                    <p className="mt-0.5 text-sm capitalize text-slate">{t.category.replace(/_/g, " ")}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TICKET_STATUS_COLOR[t.status] ?? "bg-surface-gray text-slate"}`}>
                      {TICKET_STATUS_LABEL[t.status] ?? t.status}
                    </span>
                    <p className="mt-1 text-xs text-slate">
                      {new Date(t.updated_at).toLocaleDateString("en-PH")}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="mt-8 rounded-lg border border-line bg-surface-gray p-4 text-center text-sm text-slate">
          Urgent issue?{" "}
          <Link href="/contact" className="font-medium text-navy-700 hover:text-gold">
            Call us directly
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
