import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { deleteUnit } from "@/app/admin/pm-actions";

type Prop = { name: string };
type Row = {
  id: string; unit_label: string; status: string; base_rent: number | null;
  properties: Prop | Prop[] | null;
};
const propName = (r: Row) => (Array.isArray(r.properties) ? r.properties[0]?.name : r.properties?.name) ?? "—";

export default async function AdminUnitsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("id,unit_label,status,base_rent,properties(name)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Units</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total</p>
        </div>
        <Link href="/admin/units/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800">
          <Icon name="add" size={20} /> Add unit
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line bg-surface-gray text-slate">
            <tr>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Base rent</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate">No units yet. <Link href="/admin/units/new" className="text-navy-700 underline">Add the first one</Link>.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3"><Link href={`/admin/units/${r.id}/edit`} className="font-medium text-navy hover:text-navy-700">{r.unit_label}</Link></td>
                <td className="px-4 py-3 text-slate">{propName(r)}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium text-navy">{r.status}</span></td>
                <td className="px-4 py-3 text-slate">{r.base_rent != null ? `₱${Number(r.base_rent).toLocaleString("en-PH")}` : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/units/${r.id}/edit`} aria-label="Edit" className="flex h-9 w-9 items-center justify-center rounded-md text-navy hover:bg-surface-gray"><Icon name="edit" size={18} /></Link>
                    <form action={deleteUnit.bind(null, r.id)}>
                      <button type="submit" aria-label="Delete" className="flex h-9 w-9 items-center justify-center rounded-md text-error hover:bg-error-bg"><Icon name="delete" size={18} /></button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
