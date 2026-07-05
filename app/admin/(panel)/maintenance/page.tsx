import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { markPlanDone } from "@/app/admin/maintenance-actions";

const FREQ_LABEL: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly", semi_annual: "Semi-annual",
  annual: "Annual", custom_days: "Custom",
};
const CAT_ICON: Record<string, string> = {
  ac: "ac_unit", plumbing: "plumbing", electrical: "bolt",
  pest_control: "pest_control", grease_trap: "water_pump", general: "build",
};

type Plan = {
  id: string; title: string; category: string; frequency_type: string;
  next_due_at: string | null; last_done_at: string | null;
  is_active: boolean; estimated_cost: number | null;
  properties: { name: string } | null;
  vendors: { name: string } | null;
};

export default async function MaintenancePlansPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("maintenance_plans")
    .select("id,title,category,frequency_type,next_due_at,last_done_at,is_active,estimated_cost,properties(name),vendors(name)")
    .order("next_due_at", { ascending: true, nullsFirst: false });

  const plans = (data ?? []) as unknown as Plan[];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const in7Days = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const dueSoon = plans.filter((p) => p.is_active && p.next_due_at && p.next_due_at <= in7Days);

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Maintenance Plans</h1>
          <p className="mt-1 text-sm text-slate">{plans.length} plans · {dueSoon.length} due within 7 days</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/maintenance/plans/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 press">
            <Icon name="add" size={18} /> New plan
          </Link>
          <Link href="/admin/work-orders" className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-navy hover:bg-surface-gray press">
            Work orders
          </Link>
        </div>
      </div>

      {dueSoon.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-gold/20 bg-gold/5 px-4 py-3">
          <Icon name="schedule" size={20} className="mt-0.5 shrink-0 text-gold-bright" />
          <p className="text-sm text-gold-bright">
            <strong>{dueSoon.length} plan{dueSoon.length !== 1 ? "s" : ""}</strong> due within the next 7 days.
          </p>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
        {plans.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate">No maintenance plans yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-gray text-left text-xs text-slate">
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Frequency</th>
                <th className="px-5 py-3 font-medium">Next due</th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">Last done</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const property = one(p.properties);
                const vendor   = one(p.vendors);
                const overdue = p.next_due_at && p.next_due_at < todayStr;
                const upcoming = p.next_due_at && p.next_due_at <= in7Days && !overdue;
                return (
                  <tr key={p.id} className={`border-b border-line last:border-0 ${!p.is_active ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-2">
                        <Icon name={CAT_ICON[p.category] ?? "build"} size={18} className="mt-0.5 shrink-0 text-navy-700" />
                        <div>
                          <p className="font-medium text-navy">{p.title}</p>
                          <p className="text-xs text-slate">
                            {(property as { name?: string } | null)?.name ?? "—"}
                            {(vendor as { name?: string } | null)?.name ? ` · ${(vendor as { name: string }).name}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 text-slate md:table-cell">
                      {FREQ_LABEL[p.frequency_type] ?? p.frequency_type}
                    </td>
                    <td className="px-5 py-3">
                      {p.next_due_at ? (
                        <span className={`text-sm font-medium ${overdue ? "text-sold" : upcoming ? "text-gold-bright" : "text-navy"}`}>
                          {p.next_due_at}
                          {overdue  && <span className="ml-1 text-xs">(overdue)</span>}
                          {upcoming && <span className="ml-1 text-xs">(soon)</span>}
                        </span>
                      ) : (
                        <span className="text-slate">—</span>
                      )}
                    </td>
                    <td className="hidden px-5 py-3 text-slate lg:table-cell">
                      {p.last_done_at ?? "Never"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <form action={markPlanDone.bind(null, p.id)}>
                          <button type="submit" className="rounded-md bg-available/10 px-2.5 py-1.5 text-xs font-medium text-available hover:bg-available/20">
                            Mark done
                          </button>
                        </form>
                        <Link href={`/admin/work-orders/new?plan_id=${p.id}&property_id=${p.id}`}
                          className="rounded-md bg-navy/5 px-2.5 py-1.5 text-xs font-medium text-navy hover:bg-navy/10">
                          Create WO
                        </Link>
                      </div>
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
