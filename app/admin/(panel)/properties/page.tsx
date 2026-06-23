import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { deleteProperty } from "@/app/admin/pm-actions";

type Owner = { name: string };
type Row = {
  id: string; name: string; city: string | null; property_type: string; status: string;
  owners: Owner | Owner[] | null;
};
const ownerName = (r: Row) => (Array.isArray(r.owners) ? r.owners[0]?.name : r.owners?.name) ?? "—";

export default async function AdminPropertiesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id,name,city,property_type,status,owners(name)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Properties</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total</p>
        </div>
        <Link href="/admin/properties/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800">
          <Icon name="add" size={20} /> Add property
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-surface-gray text-slate">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate">No properties yet. <Link href="/admin/properties/new" className="text-navy-700 underline">Add the first one</Link>.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3"><Link href={`/admin/properties/${r.id}/edit`} className="font-medium text-navy hover:text-navy-700">{r.name}</Link></td>
                <td className="px-4 py-3 text-slate">{ownerName(r)}</td>
                <td className="px-4 py-3 text-slate">{r.city ?? "—"}</td>
                <td className="px-4 py-3 text-slate">{r.property_type}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium text-navy">{r.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/properties/${r.id}/edit`} aria-label="Edit" className="flex h-9 w-9 items-center justify-center rounded-md text-navy hover:bg-surface-gray"><Icon name="edit" size={18} /></Link>
                    <form action={deleteProperty.bind(null, r.id)}>
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
