import Link from "next/link";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { createMaintenancePlan } from "@/app/admin/maintenance-actions";
import { F, Group, SubmitButton, inputCls } from "@/components/admin/form-kit";

const CATEGORIES = [
  { value: "ac",          label: "Air Conditioning" },
  { value: "plumbing",    label: "Plumbing" },
  { value: "electrical",  label: "Electrical" },
  { value: "pest_control",label: "Pest Control" },
  { value: "grease_trap", label: "Grease Trap" },
  { value: "general",     label: "General Maintenance" },
];
const FREQUENCIES = [
  { value: "monthly",     label: "Monthly (every 30 days)" },
  { value: "quarterly",   label: "Quarterly (every 90 days)" },
  { value: "semi_annual", label: "Semi-annual (every 180 days)" },
  { value: "annual",      label: "Annual (every 365 days)" },
  { value: "custom_days", label: "Custom interval" },
];

export default async function NewMaintenancePlanPage() {
  const supabase = await createClient();
  const [{ data: propData }, { data: vendorData }] = await Promise.all([
    supabase.from("properties").select("id,name").order("name"),
    supabase.from("vendors").select("id,name").order("name"),
  ]);
  const properties = (propData ?? []) as { id: string; name: string }[];
  const vendors    = (vendorData ?? []) as { id: string; name: string }[];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/maintenance" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to maintenance
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New maintenance plan</h1>

      <form action={createMaintenancePlan} className="mt-6 flex flex-col gap-6">
        <Group title="Plan details">
          <F label="Title" span>
            <input name="title" className={inputCls} required placeholder="e.g. AC filter cleaning" />
          </F>
          <F label="Category">
            <select name="category" className={inputCls}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </F>
          <F label="Property">
            <select name="property_id" className={inputCls} required>
              <option value="">Select property…</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </F>
        </Group>

        <Group title="Schedule">
          <F label="Frequency">
            <select name="frequency_type" className={inputCls} defaultValue="monthly">
              {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </F>
          <F label="Custom interval (days)" hint="Only used if frequency = Custom">
            <input name="frequency_days" type="number" min="1" className={inputCls} placeholder="e.g. 45" />
          </F>
          <F label="Last done (date)">
            <input name="last_done_at" type="date" className={inputCls} />
          </F>
          <F label="Estimated cost (₱)">
            <input name="estimated_cost" type="number" step="0.01" min="0" className={inputCls} placeholder="0.00" />
          </F>
        </Group>

        {vendors.length > 0 && (
          <Group title="Vendor (optional)">
            <F label="Preferred vendor">
              <select name="preferred_vendor_id" className={inputCls}>
                <option value="">No preference</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </F>
          </Group>
        )}

        <SubmitButton label="Create plan" />
      </form>
    </div>
  );
}
