import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { deleteOwner } from "@/app/admin/pm-actions";

type Row = { id: string; name: string; email: string; phone: string | null; auth_user_id: string | null };

const columns: Column<Row>[] = [
  { header: "Name", primary: true, cell: (r) => <Link href={`/admin/owners/${r.id}/edit`} className="font-medium text-navy hover:text-navy-700">{r.name}</Link> },
  { header: "Email", cell: (r) => <span className="text-slate">{r.email}</span> },
  { header: "Phone", cell: (r) => <span className="text-slate">{r.phone ?? "—"}</span> },
  { header: "Portal", cell: (r) => r.auth_user_id
    ? <span className="rounded-full bg-available/10 px-2.5 py-1 text-xs font-medium text-available">Linked</span>
    : <span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium text-slate">Not linked</span> },
  { header: "Actions", align: "right", cell: (r) => (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/admin/owners/${r.id}/edit`} aria-label="Edit" className="flex h-9 w-9 items-center justify-center rounded-md text-navy hover:bg-surface-gray"><Icon name="edit" size={18} /></Link>
      <form action={deleteOwner.bind(null, r.id)}><button type="submit" aria-label="Delete" className="flex h-9 w-9 items-center justify-center rounded-md text-error hover:bg-error-bg"><Icon name="delete" size={18} /></button></form>
    </div>
  ) },
];

export default async function AdminOwnersPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("owners").select("id,name,email,phone,auth_user_id").order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Owners</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total</p>
        </div>
        <Link href="/admin/owners/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800">
          <Icon name="add" size={20} /> Add owner
        </Link>
      </div>
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} getKey={(r) => r.id} empty={<>No owners yet. <Link href="/admin/owners/new" className="text-navy-700 underline">Add the first one</Link>.</>} />
      </div>
    </div>
  );
}
