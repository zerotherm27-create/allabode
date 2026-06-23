import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { inputCls } from "@/components/admin/form-kit";
import { updateWorkOrderStatus } from "@/app/admin/maintenance-actions";
import { TICKET_PRIORITY_COLOR } from "@/lib/tickets";

const STATUS_COLOR: Record<string, string> = {
  pending:       "bg-surface-gray text-slate",
  scheduled:     "bg-navy/5 text-navy-700",
  in_progress:   "bg-gold/10 text-gold-bright",
  waiting_parts: "bg-reserved/10 text-reserved",
  completed:     "bg-available/10 text-available",
  verified:      "bg-available/10 text-available",
  cancelled:     "bg-surface-gray text-slate",
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:       ["scheduled", "in_progress", "cancelled"],
  scheduled:     ["in_progress", "cancelled"],
  in_progress:   ["waiting_parts", "completed", "cancelled"],
  waiting_parts: ["in_progress", "completed"],
  completed:     ["verified"],
  verified:      [],
  cancelled:     [],
};

const peso = (n: number | null) =>
  n != null ? `₱${Math.round(Number(n)).toLocaleString("en-PH")}` : "—";

type WO = {
  id: string; work_order_number: string; title: string; description: string | null;
  priority: string; status: string; scheduled_date: string | null;
  completed_date: string | null; estimated_cost: number | null;
  actual_cost: number | null; notes: string | null; created_at: string;
  properties: { name: string; address: string | null } | null;
  units: { unit_label: string } | null;
  vendors: { name: string; contact_name: string | null; phone: string | null } | null;
  tickets: { ticket_number: string } | null;
  maintenance_plans: { title: string } | null;
};

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("work_orders")
    .select(`
      id, work_order_number, title, description, priority, status,
      scheduled_date, completed_date, estimated_cost, actual_cost,
      notes, created_at,
      properties(name,address),
      units(unit_label),
      vendors(name,contact_name,phone),
      tickets(ticket_number),
      maintenance_plans(title)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const wo = data as unknown as WO;
  const property = Array.isArray(wo.properties) ? wo.properties[0] : wo.properties;
  const unit     = Array.isArray(wo.units)      ? wo.units[0]      : wo.units;
  const vendor   = Array.isArray(wo.vendors)    ? wo.vendors[0]    : wo.vendors;
  const ticket   = Array.isArray(wo.tickets)    ? wo.tickets[0]    : wo.tickets;
  const plan     = Array.isArray(wo.maintenance_plans) ? wo.maintenance_plans[0] : wo.maintenance_plans;

  const nextStatuses = STATUS_TRANSITIONS[wo.status] ?? [];
  const doUpdate = updateWorkOrderStatus.bind(null, id);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/work-orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to work orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">{wo.work_order_number}</h1>
          <p className="mt-0.5 text-sm text-slate">{wo.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold capitalize ${TICKET_PRIORITY_COLOR[wo.priority] ?? "text-slate"}`}>
            {wo.priority}
          </span>
          <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_COLOR[wo.status] ?? "bg-surface-gray text-slate"}`}>
            {wo.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left */}
        <div className="flex flex-col gap-5">
          {wo.description && (
            <div className="rounded-lg border border-line bg-surface p-5">
              <h2 className="mb-2 font-display text-sm font-semibold text-navy">Description</h2>
              <p className="whitespace-pre-wrap text-sm text-ink">{wo.description}</p>
            </div>
          )}
          <div className="rounded-lg border border-line bg-surface p-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {[
                ["Property", (property as { name?: string } | null)?.name ?? "—"],
                ["Unit",     (unit as { unit_label?: string } | null)?.unit_label ?? "—"],
                ["Vendor",   (vendor as { name?: string } | null)?.name ?? "None assigned"],
                ["Scheduled date", wo.scheduled_date ?? "—"],
                ["Completed", wo.completed_date ?? "—"],
                ["Est. cost",  peso(wo.estimated_cost)],
                ["Actual cost", peso(wo.actual_cost)],
                ...(ticket ? [["Linked ticket", (ticket as { ticket_number?: string }).ticket_number ?? "—"]] : []),
                ...(plan   ? [["PM plan",       (plan as { title?: string }).title ?? "—"]] : []),
              ].filter(([,v]) => v).map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-xs text-slate">{k}</dt>
                  <dd className="mt-0.5 font-medium text-navy">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-4">
          {nextStatuses.length > 0 && (
            <div className="rounded-lg border border-line bg-surface p-5">
              <h2 className="mb-3 font-display text-sm font-semibold text-navy">Update status</h2>
              <form action={doUpdate} className="flex flex-col gap-3">
                <select name="status" className={inputCls}>
                  {nextStatuses.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <input name="actual_cost" type="number" step="0.01" min="0" className={inputCls} placeholder="Actual cost (₱) — optional" />
                <textarea name="notes" className={`${inputCls} h-auto py-2.5`} rows={2} placeholder="Notes…" />
                <button type="submit" className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
                  Update
                </button>
              </form>
            </div>
          )}

          {wo.notes && (
            <div className="rounded-lg border border-line bg-surface-gray p-4">
              <p className="text-xs font-medium text-slate">Notes</p>
              <p className="mt-1 text-sm text-ink">{wo.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
