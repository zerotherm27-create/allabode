import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { UnitForm, type UnitValues } from "@/components/admin/pm-forms";
import { updateUnit, createChargeTemplate, updateChargeTemplate, deleteChargeTemplate, toggleChargeTemplate } from "@/app/admin/pm-actions";
import { createClient } from "@/lib/supabase/server";

const inputCls = "h-9 w-full rounded-md border border-line bg-white px-3 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";

type Template = {
  id: string; name: string; amount: number; billing_note: string | null;
  template_type: string; applies_to: string; sort_order: number; is_active: boolean;
};

export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: row }, { data: propData }, { data: templateData }] = await Promise.all([
    supabase.from("units").select("*").eq("id", id).maybeSingle(),
    supabase.from("properties").select("id,name").order("name"),
    supabase.from("charge_templates").select("*").eq("unit_id", id).order("sort_order").order("name"),
  ]);
  if (!row) notFound();
  const initial = row as UnitValues;
  const properties = ((propData ?? []) as { id: string; name: string }[]).map((p) => ({ id: p.id, label: p.name }));
  const templates = (templateData ?? []) as Template[];
  const utilities = templates.filter((t) => t.template_type === "utility");
  const recurring = templates.filter((t) => t.template_type === "expense_recurring");

  const APPLIES_LABELS: Record<string, string> = {
    long_term: "Long term only",
    short_term: "Short term only",
    both: "Both",
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/units" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to units
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Edit unit</h1>
      <p className="mt-1 text-sm text-slate">{initial.unit_label}</p>
      <div className="mt-6"><UnitForm action={updateUnit.bind(null, id)} initial={initial} properties={properties} /></div>

      {/* ── Billing Templates ── */}
      <div className="mt-10 border-t border-line pt-8">
        <div className="flex items-start gap-3">
          <Icon name="receipt_long" size={22} className="mt-0.5 text-navy-700" />
          <div>
            <h2 className="font-display text-lg font-semibold text-navy">Billing Templates</h2>
            <p className="mt-0.5 text-sm text-slate">
              Configure recurring charges that auto-populate owner SOA drafts. Utility = fixed amount charged every month without a receipt (e.g. Association Dues). Recurring Expense = variable amount pre-filled from last month&apos;s SOA (e.g. Commission).
            </p>
          </div>
        </div>

        {/* Utility section */}
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">Utility / Fixed charges</h3>
          {utilities.length > 0 && (
            <div className="mb-4 overflow-hidden rounded-lg border border-line bg-surface">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-gray">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-slate">Name</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate">Note</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate">Amount</th>
                    <th className="px-4 py-2.5 text-center font-medium text-slate">Applies to</th>
                    <th className="px-4 py-2.5 text-center font-medium text-slate">Active</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {utilities.map((t) => (
                    <tr key={t.id} className={t.is_active ? "" : "opacity-50"}>
                      <td className="px-4 py-2.5 font-medium text-navy">{t.name}</td>
                      <td className="px-4 py-2.5 text-slate">{t.billing_note ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right text-navy">₱{Number(t.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2.5 text-center text-xs text-slate">{APPLIES_LABELS[t.applies_to] ?? t.applies_to}</td>
                      <td className="px-4 py-2.5 text-center">
                        <form action={toggleChargeTemplate.bind(null, t.id, id, !t.is_active)}>
                          <button type="submit" className={`h-5 w-9 rounded-full transition-colors ${t.is_active ? "bg-available" : "bg-line"}`}>
                            <span className={`block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform ${t.is_active ? "translate-x-[17px]" : ""}`} />
                          </button>
                        </form>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <details className="group relative">
                            <summary className="list-none cursor-pointer text-navy-700 hover:text-navy text-xs font-medium">Edit</summary>
                            <div className="absolute right-0 top-6 z-10 w-64 rounded-lg border border-line bg-surface p-4 shadow-lg">
                              <form action={updateChargeTemplate.bind(null, t.id, id)} className="flex flex-col gap-3">
                                <input type="hidden" name="template_type" value="utility" />
                                <div><label className="block text-xs font-medium text-slate mb-1">Name</label><input name="name" defaultValue={t.name} required className={inputCls} /></div>
                                <div><label className="block text-xs font-medium text-slate mb-1">Amount (₱)</label><input name="amount" type="number" step="0.01" defaultValue={t.amount} required className={inputCls} /></div>
                                <div><label className="block text-xs font-medium text-slate mb-1">Note</label><input name="billing_note" defaultValue={t.billing_note ?? ""} placeholder="e.g. inclusive" className={inputCls} /></div>
                                <div><label className="block text-xs font-medium text-slate mb-1">Applies to</label>
                                  <select name="applies_to" defaultValue={t.applies_to} className={inputCls}>
                                    <option value="both">Both</option>
                                    <option value="long_term">Long term only</option>
                                    <option value="short_term">Short term only</option>
                                  </select>
                                </div>
                                <div><label className="block text-xs font-medium text-slate mb-1">Sort order</label><input name="sort_order" type="number" defaultValue={t.sort_order} className={inputCls} /></div>
                                <button type="submit" className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">Save</button>
                              </form>
                            </div>
                          </details>
                          <form action={deleteChargeTemplate.bind(null, t.id, id)}>
                            <button type="submit" className="text-xs font-medium text-error hover:text-error/80">Delete</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {utilities.length === 0 && (
            <p className="mb-4 rounded-lg border border-dashed border-line bg-surface-gray/50 px-4 py-3 text-sm text-slate">No utility templates yet. Add Association Dues, flat-rate water, etc.</p>
          )}
          <details className="group">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-navy hover:bg-surface-gray">
              <Icon name="add" size={16} /> Add utility template
            </summary>
            <div className="mt-3 rounded-lg border border-line bg-surface p-4">
              <form action={createChargeTemplate.bind(null, id)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="hidden" name="template_type" value="utility" />
                <div><label className="block text-xs font-medium text-slate mb-1">Name *</label><input name="name" required placeholder="e.g. Association Dues" className={inputCls} /></div>
                <div><label className="block text-xs font-medium text-slate mb-1">Amount (₱) *</label><input name="amount" type="number" step="0.01" min="0" required placeholder="4000.00" className={inputCls} /></div>
                <div><label className="block text-xs font-medium text-slate mb-1">Billing note</label><input name="billing_note" placeholder="e.g. inclusive" className={inputCls} /></div>
                <div><label className="block text-xs font-medium text-slate mb-1">Applies to</label>
                  <select name="applies_to" defaultValue="both" className={inputCls}>
                    <option value="both">Both</option>
                    <option value="long_term">Long term only</option>
                    <option value="short_term">Short term only</option>
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-slate mb-1">Sort order</label><input name="sort_order" type="number" defaultValue={utilities.length} className={inputCls} /></div>
                <div className="sm:col-span-2 flex justify-end">
                  <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
                    <Icon name="save" size={16} /> Save template
                  </button>
                </div>
              </form>
            </div>
          </details>
        </div>

        {/* Recurring expenses section */}
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">Recurring expenses</h3>
          {recurring.length > 0 && (
            <div className="mb-4 overflow-hidden rounded-lg border border-line bg-surface">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-gray">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-slate">Name</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate">Suggested amt</th>
                    <th className="px-4 py-2.5 text-center font-medium text-slate">Applies to</th>
                    <th className="px-4 py-2.5 text-center font-medium text-slate">Active</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recurring.map((t) => (
                    <tr key={t.id} className={t.is_active ? "" : "opacity-50"}>
                      <td className="px-4 py-2.5 font-medium text-navy">{t.name}</td>
                      <td className="px-4 py-2.5 text-right text-slate">₱{Number(t.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })} <span className="text-xs">(last month)</span></td>
                      <td className="px-4 py-2.5 text-center text-xs text-slate">{APPLIES_LABELS[t.applies_to] ?? t.applies_to}</td>
                      <td className="px-4 py-2.5 text-center">
                        <form action={toggleChargeTemplate.bind(null, t.id, id, !t.is_active)}>
                          <button type="submit" className={`h-5 w-9 rounded-full transition-colors ${t.is_active ? "bg-available" : "bg-line"}`}>
                            <span className={`block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform ${t.is_active ? "translate-x-[17px]" : ""}`} />
                          </button>
                        </form>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <details className="group relative">
                            <summary className="list-none cursor-pointer text-navy-700 hover:text-navy text-xs font-medium">Edit</summary>
                            <div className="absolute right-0 top-6 z-10 w-60 rounded-lg border border-line bg-surface p-4 shadow-lg">
                              <form action={updateChargeTemplate.bind(null, t.id, id)} className="flex flex-col gap-3">
                                <input type="hidden" name="template_type" value="expense_recurring" />
                                <div><label className="block text-xs font-medium text-slate mb-1">Name</label><input name="name" defaultValue={t.name} required className={inputCls} /></div>
                                <div><label className="block text-xs font-medium text-slate mb-1">Suggested amount (₱)</label><input name="amount" type="number" step="0.01" defaultValue={t.amount} required className={inputCls} /></div>
                                <div><label className="block text-xs font-medium text-slate mb-1">Applies to</label>
                                  <select name="applies_to" defaultValue={t.applies_to} className={inputCls}>
                                    <option value="both">Both</option>
                                    <option value="long_term">Long term only</option>
                                    <option value="short_term">Short term only</option>
                                  </select>
                                </div>
                                <div><label className="block text-xs font-medium text-slate mb-1">Sort order</label><input name="sort_order" type="number" defaultValue={t.sort_order} className={inputCls} /></div>
                                <button type="submit" className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">Save</button>
                              </form>
                            </div>
                          </details>
                          <form action={deleteChargeTemplate.bind(null, t.id, id)}>
                            <button type="submit" className="text-xs font-medium text-error hover:text-error/80">Delete</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {recurring.length === 0 && (
            <p className="mb-4 rounded-lg border border-dashed border-line bg-surface-gray/50 px-4 py-3 text-sm text-slate">No recurring expense templates yet. Add Commission, regular cleaning fees, etc.</p>
          )}
          <details className="group">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-navy hover:bg-surface-gray">
              <Icon name="add" size={16} /> Add recurring expense template
            </summary>
            <div className="mt-3 rounded-lg border border-line bg-surface p-4">
              <form action={createChargeTemplate.bind(null, id)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="hidden" name="template_type" value="expense_recurring" />
                <div><label className="block text-xs font-medium text-slate mb-1">Name *</label><input name="name" required placeholder="e.g. Commission" className={inputCls} /></div>
                <div><label className="block text-xs font-medium text-slate mb-1">Suggested amount (₱) *</label><input name="amount" type="number" step="0.01" min="0" required placeholder="1000.00" className={inputCls} /></div>
                <div><label className="block text-xs font-medium text-slate mb-1">Applies to</label>
                  <select name="applies_to" defaultValue="both" className={inputCls}>
                    <option value="both">Both</option>
                    <option value="long_term">Long term only</option>
                    <option value="short_term">Short term only</option>
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-slate mb-1">Sort order</label><input name="sort_order" type="number" defaultValue={recurring.length} className={inputCls} /></div>
                <div className="sm:col-span-2 flex justify-end">
                  <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
                    <Icon name="save" size={16} /> Save template
                  </button>
                </div>
              </form>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
