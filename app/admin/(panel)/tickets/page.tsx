import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import {
  TICKET_STATUS_LABEL, TICKET_STATUS_COLOR,
  TICKET_PRIORITY_COLOR, TICKET_PRIORITY_ICON,
  OPEN_STATUSES, isSlaBreach,
} from "@/lib/tickets";

type Row = {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  sla_due_at: string | null;
  created_at: string;
  tenants: { name: string } | null;
  properties: { name: string } | null;
  units: { unit_label: string } | null;
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string }>;
}) {
  const { status: filterStatus, priority: filterPriority } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("tickets")
    .select("id,ticket_number,subject,category,priority,status,sla_due_at,created_at,tenants(name),properties(name),units(unit_label)")
    .order("sla_due_at", { ascending: true, nullsFirst: false });

  if (filterStatus) query = query.eq("status", filterStatus);
  else              query = query.in("status", OPEN_STATUSES);

  if (filterPriority) query = query.eq("priority", filterPriority);

  const { data } = await query;
  const tickets = (data ?? []) as unknown as Row[];

  const breached = tickets.filter((t) => isSlaBreach(t.sla_due_at) && OPEN_STATUSES.includes(t.status));

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Tickets</h1>
          <p className="mt-1 text-sm text-slate">
            {tickets.length} {filterStatus ? TICKET_STATUS_LABEL[filterStatus] ?? filterStatus : "open"} ticket{tickets.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/tickets/new"
          className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
        >
          <Icon name="add" size={18} /> New ticket
        </Link>
      </div>

      {breached.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-sold/20 bg-sold/5 px-4 py-3">
          <Icon name="warning" size={20} className="mt-0.5 shrink-0 text-sold" fill={1} />
          <p className="text-sm text-sold">
            <strong>{breached.length} SLA breach{breached.length !== 1 ? "es" : ""}</strong> — tickets past their response deadline.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { href: "/admin/tickets", label: "Open" },
          { href: "/admin/tickets?status=new", label: "New" },
          { href: "/admin/tickets?status=in_progress", label: "In Progress" },
          { href: "/admin/tickets?status=resolved", label: "Resolved" },
          { href: "/admin/tickets?status=closed", label: "Closed" },
          { href: "/admin/tickets?priority=critical", label: "Critical" },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-navy hover:border-navy-700 hover:text-navy-700"
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
        {tickets.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate">No tickets match the current filter.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-gray text-left text-xs text-slate">
                <th className="px-5 py-3 font-medium">Ticket</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Category</th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">Property / Unit</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">SLA due</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const tenant   = one(t.tenants);
                const property = one(t.properties);
                const unit     = one(t.units);
                const breachRow = isSlaBreach(t.sla_due_at) && OPEN_STATUSES.includes(t.status);
                return (
                  <tr key={t.id} className={`border-b border-line last:border-0 hover:bg-surface-gray/50 ${breachRow ? "bg-sold/3" : ""}`}>
                    <td className="px-5 py-3">
                      <Link href={`/admin/tickets/${t.id}`} className="group">
                        <p className="font-medium text-navy group-hover:text-navy-700">{t.ticket_number}</p>
                        <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate">{t.subject}</p>
                        {(tenant as { name?: string } | null)?.name && (
                          <p className="mt-0.5 text-xs text-slate">{(tenant as { name: string }).name}</p>
                        )}
                      </Link>
                    </td>
                    <td className="hidden px-5 py-3 text-slate capitalize md:table-cell">
                      {t.category.replace(/_/g, " ")}
                    </td>
                    <td className="hidden px-5 py-3 lg:table-cell">
                      <p className="text-navy">{(property as { name?: string } | null)?.name ?? "—"}</p>
                      <p className="text-xs text-slate">{(unit as { unit_label?: string } | null)?.unit_label ?? ""}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`flex items-center gap-1 text-xs font-medium capitalize ${TICKET_PRIORITY_COLOR[t.priority] ?? "text-slate"}`}>
                        <Icon name={TICKET_PRIORITY_ICON[t.priority] ?? "remove"} size={14} />
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TICKET_STATUS_COLOR[t.status] ?? "bg-surface-gray text-slate"}`}>
                        {TICKET_STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="hidden px-5 py-3 lg:table-cell">
                      {t.sla_due_at ? (
                        <span className={`text-xs ${breachRow ? "font-semibold text-sold" : "text-slate"}`}>
                          {new Date(t.sla_due_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {breachRow && <span className="ml-1">!</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-slate">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
