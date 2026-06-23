import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { deleteLease } from "@/app/admin/pm-actions";

type Named = { name?: string; unit_label?: string };
type Row = {
  id: string; start_date: string; end_date: string | null; rent_amount: number; status: string;
  units: Named | Named[] | null;
  tenants: Named | Named[] | null;
};
const pick = (v: Named | Named[] | null) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function AdminLeasesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leases")
    .select("id,start_date,end_date,rent_amount,status,units(unit_label),tenants(name)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Leases</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total</p>
        </div>
        <Link href="/admin/leases/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800">
          <Icon name="add" size={20} /> Add lease
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-surface-gray text-slate">
            <tr>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Rent</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate">No leases yet. <Link href="/admin/leases/new" className="text-navy-700 underline">Add the first one</Link>.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3"><Link href={`/admin/leases/${r.id}/edit`} className="font-medium text-navy hover:text-navy-700">{pick(r.units)?.unit_label ?? "—"}</Link></td>
                <td className="px-4 py-3 text-slate">{pick(r.tenants)?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate">{r.start_date}{r.end_date ? ` → ${r.end_date}` : ""}</td>
                <td className="px-4 py-3 text-slate">₱{Number(r.rent_amount).toLocaleString("en-PH")}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium text-navy">{r.status.replace(/_/g, " ")}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/leases/${r.id}/edit`} aria-label="Edit" className="flex h-9 w-9 items-center justify-center rounded-md text-navy hover:bg-surface-gray"><Icon name="edit" size={18} /></Link>
                    <form action={deleteLease.bind(null, r.id)}>
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
