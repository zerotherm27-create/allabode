import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell, Panel, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";
import { TICKET_STATUS_LABEL, TICKET_STATUS_COLOR, TICKET_PRIORITY_COLOR, OPEN_STATUSES } from "@/lib/tickets";

export const metadata: Metadata = { title: "Property Tickets", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Dashboard",   icon: "dashboard",           href: "/dashboard/owner" },
  { label: "Properties",  icon: "apartment",           href: "/dashboard/owner#properties" },
  { label: "Tickets",     icon: "confirmation_number", href: "/dashboard/owner/tickets" },
  { label: "Statements",  icon: "receipt_long",        href: "/dashboard/owner#statements" },
  { label: "Expenses",    icon: "payments",            href: "/dashboard/owner#expenses" },
];

type Ticket = {
  id: string; ticket_number: string; subject: string;
  category: string; priority: string; status: string;
  created_at: string; updated_at: string;
  tenants: { name: string } | null;
  units: { unit_label: string } | null;
  properties: { name: string } | null;
};

export default async function OwnerTicketsPage() {
  const { role, ownerId } = await getCurrentRole();
  if (role !== "owner") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: ticketData }, { data: ownerRow }] = await Promise.all([
    supabase.from("tickets")
      .select("id,ticket_number,subject,category,priority,status,created_at,updated_at,tenants(name),units(unit_label),properties(name)")
      .order("updated_at", { ascending: false }),
    supabase.from("owners").select("name").eq("id", ownerId ?? "").maybeSingle(),
  ]);

  const tickets   = (ticketData ?? []) as unknown as Ticket[];
  const ownerName = (ownerRow as { name?: string } | null)?.name ?? "Owner";
  const openCount = tickets.filter((t) => OPEN_STATUSES.includes(t.status)).length;

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

  return (
    <DashboardShell role="Owner" nav={nav} userName={ownerName}>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-navy">Property Tickets</h1>
        <p className="mt-1 text-sm text-slate">
          {tickets.length} total{openCount > 0 ? ` · ${openCount} open` : ""}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {tickets.length === 0 ? (
            <Panel title="No tickets">
              <p className="py-4 text-center text-sm text-slate">
                No tickets have been filed for your properties yet.
              </p>
            </Panel>
          ) : (
            tickets.map((t) => {
              const tenant   = one(t.tenants);
              const unit     = one(t.units);
              const property = one(t.properties);
              return (
                <div key={t.id} className="rounded-lg border border-line bg-surface p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="label-caps text-xs text-slate">{t.ticket_number}</span>
                        <span className={`text-xs font-medium capitalize ${TICKET_PRIORITY_COLOR[t.priority] ?? "text-slate"}`}>
                          · {t.priority}
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-navy">{t.subject}</p>
                      <p className="mt-0.5 text-sm text-slate capitalize">{t.category.replace(/_/g, " ")}</p>
                      <p className="mt-0.5 text-xs text-slate">
                        {(property as { name?: string } | null)?.name}
                        {(unit as { unit_label?: string } | null)?.unit_label ? ` · ${(unit as { unit_label: string }).unit_label}` : ""}
                        {(tenant as { name?: string } | null)?.name ? ` · ${(tenant as { name: string }).name}` : ""}
                      </p>
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
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
