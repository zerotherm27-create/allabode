import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { deleteLease } from "@/app/admin/pm-actions";

type Named = { name?: string; unit_label?: string };
type Row = {
  id: string; start_date: string; end_date: string | null; rent_amount: number; status: string;
  units: Named | Named[] | null;
  tenants: Named | Named[] | null;
};
const pick = (v: Named | Named[] | null) => (Array.isArray(v) ? v[0] : v) ?? null;

const columns: Column<Row>[] = [
  { header: "Unit", primary: true, cell: (r) => <Link href={`/admin/leases/${r.id}/edit`} className="font-medium text-navy hover:text-navy-700">{pick(r.units)?.unit_label ?? "—"}</Link> },
  { header: "Tenant", cell: (r) => <span className="text-slate">{pick(r.tenants)?.name ?? "—"}</span> },
  { header: "Period", cell: (r) => <span className="text-slate">{r.start_date}{r.end_date ? ` → ${r.end_date}` : ""}</span> },
  { header: "Rent", cell: (r) => <span className="text-slate">₱{Number(r.rent_amount).toLocaleString("en-PH")}</span> },
  { header: "Status", cell: (r) => <span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium text-navy">{r.status.replace(/_/g, " ")}</span> },
  { header: "Actions", align: "right", cell: (r) => (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/admin/leases/${r.id}/edit`} aria-label="Edit" className="flex h-9 w-9 items-center justify-center rounded-md text-navy hover:bg-surface-gray press"><Icon name="edit" size={18} /></Link>
      <form action={deleteLease.bind(null, r.id)}><button type="submit" aria-label="Delete" className="flex h-9 w-9 items-center justify-center rounded-md text-error hover:bg-error-bg"><Icon name="delete" size={18} /></button></form>
    </div>
  ) },
];

export default async function AdminLeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("leases").select("id,start_date,end_date,rent_amount,status,units(unit_label),tenants(name)").order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Leases</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total</p>
        </div>
        <Link href="/admin/leases/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 press">
          <Icon name="add" size={20} /> Add lease
        </Link>
      </div>
      {error && (
        <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-slate">
          <div className="flex gap-2">
            <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-warning" />
            <p>{decodeURIComponent(error)}</p>
          </div>
        </div>
      )}
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} getKey={(r) => r.id} empty={<>No leases yet. <Link href="/admin/leases/new" className="text-navy-700 underline">Add the first one</Link>.</>} />
      </div>
    </div>
  );
}
