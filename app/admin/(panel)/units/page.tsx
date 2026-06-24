import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { deleteUnit } from "@/app/admin/pm-actions";

type Prop = { name: string };
type Row = {
  id: string; unit_label: string; status: string; base_rent: number | null;
  properties: Prop | Prop[] | null;
};
const propName = (r: Row) => (Array.isArray(r.properties) ? r.properties[0]?.name : r.properties?.name) ?? "—";

const columns: Column<Row>[] = [
  { header: "Unit", primary: true, cell: (r) => <Link href={`/admin/units/${r.id}/edit`} className="font-medium text-navy hover:text-navy-700">{r.unit_label}</Link> },
  { header: "Property", cell: (r) => <span className="text-slate">{propName(r)}</span> },
  { header: "Status", cell: (r) => <span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium text-navy">{r.status}</span> },
  { header: "Base rent", cell: (r) => <span className="text-slate">{r.base_rent != null ? `₱${Number(r.base_rent).toLocaleString("en-PH")}` : "—"}</span> },
  { header: "Actions", align: "right", cell: (r) => (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/admin/units/${r.id}/edit`} aria-label="Edit" className="flex h-9 w-9 items-center justify-center rounded-md text-navy hover:bg-surface-gray"><Icon name="edit" size={18} /></Link>
      <form action={deleteUnit.bind(null, r.id)}><button type="submit" aria-label="Delete" className="flex h-9 w-9 items-center justify-center rounded-md text-error hover:bg-error-bg"><Icon name="delete" size={18} /></button></form>
    </div>
  ) },
];

export default async function AdminUnitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  console.log("[units] uid:", user?.id ?? "NO SESSION");
  const { data, error } = await supabase.from("units").select("id,unit_label,status,base_rent,properties(name)").order("created_at", { ascending: false });
  console.log("[units] rows:", data?.length ?? 0, "error:", error?.message ?? "none");
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
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} getKey={(r) => r.id} empty={<>No units yet. <Link href="/admin/units/new" className="text-navy-700 underline">Add the first one</Link>.</>} />
      </div>
    </div>
  );
}
