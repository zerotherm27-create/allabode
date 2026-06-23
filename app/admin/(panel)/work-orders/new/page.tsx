import Link from "next/link";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { createWorkOrder } from "@/app/admin/maintenance-actions";
import { F, Group, SubmitButton, inputCls } from "@/components/admin/form-kit";

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ plan_id?: string; property_id?: string }>;
}) {
  const { plan_id } = await searchParams;
  const supabase = await createClient();
  const [{ data: propData }, { data: vendorData }] = await Promise.all([
    supabase.from("properties").select("id,name").order("name"),
    supabase.from("vendors").select("id,name").order("name"),
  ]);
  const properties = (propData ?? []) as { id: string; name: string }[];
  const vendors    = (vendorData ?? []) as { id: string; name: string }[];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/work-orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to work orders
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New work order</h1>

      <form action={createWorkOrder} className="mt-6 flex flex-col gap-6">
        {plan_id && <input type="hidden" name="maintenance_plan_id" value={plan_id} />}

        <Group title="Work order details">
          <F label="Title" span>
            <input name="title" className={inputCls} required placeholder="e.g. AC unit servicing — Unit 3A" />
          </F>
          <F label="Description" span>
            <textarea name="description" className={`${inputCls} h-auto py-2.5`} rows={3} placeholder="Scope of work…" />
          </F>
          <F label="Priority">
            <select name="priority" className={inputCls} defaultValue="normal">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </F>
          <F label="Property">
            <select name="property_id" className={inputCls} required>
              <option value="">Select property…</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </F>
          <F label="Vendor">
            <select name="vendor_id" className={inputCls}>
              <option value="">No vendor yet</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </F>
          <F label="Scheduled date">
            <input name="scheduled_date" type="date" className={inputCls} />
          </F>
          <F label="Estimated cost (₱)">
            <input name="estimated_cost" type="number" step="0.01" min="0" className={inputCls} placeholder="0.00" />
          </F>
        </Group>

        <SubmitButton label="Create work order" />
      </form>
    </div>
  );
}
