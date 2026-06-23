import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { deleteVendor } from "@/app/admin/pm-actions";

type Row = { id: string; name: string; tin: string | null; is_approved: boolean; is_blocked: boolean };

export default async function AdminVendorsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("id,name,tin,is_approved,is_blocked")
    .order("name", { ascending: true });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Vendors</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total</p>
        </div>
        <Link href="/admin/vendors/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800">
          <Icon name="add" size={20} /> Add vendor
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-line bg-surface-gray text-slate">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">TIN</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate">No vendors yet. <Link href="/admin/vendors/new" className="text-navy-700 underline">Add the first one</Link>.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/vendors/${r.id}/edit`} className="font-medium text-navy hover:text-navy-700">{r.name}</Link>
                </td>
                <td className="px-4 py-3 text-slate">{r.tin ?? "—"}</td>
                <td className="px-4 py-3">
                  {r.is_blocked ? (
                    <span className="rounded-full bg-error-bg px-2.5 py-1 text-xs font-medium text-error">Blocked</span>
                  ) : r.is_approved ? (
                    <span className="rounded-full bg-available/10 px-2.5 py-1 text-xs font-medium text-available">Approved</span>
                  ) : (
                    <span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium text-slate">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/vendors/${r.id}/edit`} aria-label="Edit" className="flex h-9 w-9 items-center justify-center rounded-md text-navy hover:bg-surface-gray"><Icon name="edit" size={18} /></Link>
                    <form action={deleteVendor.bind(null, r.id)}>
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
