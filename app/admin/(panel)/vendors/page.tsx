import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { deleteVendor } from "@/app/admin/pm-actions";

type Row = { id: string; name: string; tin: string | null; is_approved: boolean; is_blocked: boolean };

const columns: Column<Row>[] = [
  { header: "Name", primary: true, cell: (r) => <Link href={`/admin/vendors/${r.id}/edit`} className="font-medium text-navy hover:text-navy-700">{r.name}</Link> },
  { header: "TIN", cell: (r) => <span className="text-slate">{r.tin ?? "—"}</span> },
  { header: "Status", cell: (r) => r.is_blocked
    ? <span className="rounded-full bg-error-bg px-2.5 py-1 text-xs font-medium text-error">Blocked</span>
    : r.is_approved
    ? <span className="rounded-full bg-available/10 px-2.5 py-1 text-xs font-medium text-available">Approved</span>
    : <span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium text-slate">Pending</span> },
  { header: "Actions", align: "right", cell: (r) => (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/admin/vendors/${r.id}/edit`} aria-label="Edit" className="flex h-9 w-9 items-center justify-center rounded-md text-navy hover:bg-surface-gray press"><Icon name="edit" size={18} /></Link>
      <form action={deleteVendor.bind(null, r.id)}><button type="submit" aria-label="Delete" className="flex h-9 w-9 items-center justify-center rounded-md text-error hover:bg-error-bg"><Icon name="delete" size={18} /></button></form>
    </div>
  ) },
];

export default async function AdminVendorsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("vendors").select("id,name,tin,is_approved,is_blocked").order("name", { ascending: true });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Vendors</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total</p>
        </div>
        <Link href="/admin/vendors/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 press">
          <Icon name="add" size={20} /> Add vendor
        </Link>
      </div>
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} getKey={(r) => r.id} empty={<>No vendors yet. <Link href="/admin/vendors/new" className="text-navy-700 underline">Add the first one</Link>.</>} />
      </div>
    </div>
  );
}
