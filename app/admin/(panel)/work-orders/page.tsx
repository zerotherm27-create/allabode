import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { TICKET_PRIORITY_COLOR } from "@/lib/tickets";

const STATUS_COLOR: Record<string, string> = {
  pending:       "bg-surface-gray text-slate",
  scheduled:     "bg-navy/5 text-navy-700",
  in_progress:   "bg-gold/10 text-gold-bright",
  waiting_parts: "bg-reserved/10 text-reserved",
  completed:     "bg-available/10 text-available",
  verified:      "bg-available/10 text-available",
  cancelled:     "bg-surface-gray text-slate line-through",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", scheduled: "Scheduled", in_progress: "In Progress",
  waiting_parts: "Waiting Parts", completed: "Completed", verified: "Verified", cancelled: "Cancelled",
};

const ACTIVE_STATUSES = ["pending", "scheduled", "in_progress", "waiting_parts"];

type WO = {
  id: string; work_order_number: string; title: string;
  priority: string; status: string; scheduled_date: string | null;
  properties: { name: string } | null;
  vendors: { name: string } | null;
};

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: filterStatus } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("work_orders")
    .select("id,work_order_number,title,priority,status,scheduled_date,properties(name),vendors(name)")
    .order("scheduled_date", { ascending: true, nullsFirst: false });

  if (filterStatus) query = query.eq("status", filterStatus);
  else              query = query.in("status", ACTIVE_STATUSES);

  const { data } = await query;
  const orders = (data ?? []) as unknown as WO[];
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Work Orders</h1>
          <p className="mt-1 text-sm text-slate">{orders.length} {filterStatus ?? "active"} order{orders.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/work-orders/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
            <Icon name="add" size={18} /> New work order
          </Link>
          <Link href="/admin/maintenance" className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-navy hover:bg-surface-gray">
            PM plans
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { href: "/admin/work-orders", label: "Active" },
          { href: "/admin/work-orders?status=pending", label: "Pending" },
          { href: "/admin/work-orders?status=completed", label: "Completed" },
          { href: "/admin/work-orders?status=verified", label: "Verified" },
        ].map(({ href, label }) => (
          <Link key={href} href={href} className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-navy hover:border-navy-700">
            {label}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
        {orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate">No work orders found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-gray text-left text-xs text-slate">
                <th className="px-5 py-3 font-medium">Work order</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Property / Vendor</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((wo) => {
                const property = one(wo.properties);
                const vendor   = one(wo.vendors);
                return (
                  <tr key={wo.id} className="border-b border-line last:border-0 hover:bg-surface-gray/50">
                    <td className="px-5 py-3">
                      <Link href={`/admin/work-orders/${wo.id}`} className="group">
                        <p className="font-medium text-navy group-hover:text-navy-700">{wo.work_order_number}</p>
                        <p className="max-w-[200px] truncate text-xs text-slate">{wo.title}</p>
                      </Link>
                    </td>
                    <td className="hidden px-5 py-3 lg:table-cell">
                      <p className="text-navy">{(property as { name?: string } | null)?.name ?? "—"}</p>
                      <p className="text-xs text-slate">{(vendor as { name?: string } | null)?.name ?? "No vendor"}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium capitalize ${TICKET_PRIORITY_COLOR[wo.priority] ?? "text-slate"}`}>{wo.priority}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[wo.status] ?? "bg-surface-gray text-slate"}`}>
                        {STATUS_LABEL[wo.status] ?? wo.status}
                      </span>
                    </td>
                    <td className="hidden px-5 py-3 text-sm text-slate lg:table-cell">
                      {wo.scheduled_date ?? "—"}
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
