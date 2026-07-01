import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";

type Row = {
  id: string;
  owner_email: string;
  owner_name_hint: string | null;
  owner_details: { name?: string } | null;
  status: string;
  created_at: string;
  owner_signed_at: string | null;
  manager_signed_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent — awaiting owner",
  owner_signed: "Owner signed — awaiting countersign",
  completed: "Fully executed",
  voided: "Voided",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-surface-gray text-slate",
  sent: "bg-gold/15 text-gold-bright",
  owner_signed: "bg-reserved/15 text-reserved",
  completed: "bg-available/15 text-available",
  voided: "bg-error/10 text-error",
};

export default async function AdminContractsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agreements")
    .select("id,owner_email,owner_name_hint,owner_details,status,created_at,owner_signed_at,manager_signed_at")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  const columns: Column<Row>[] = [
    {
      header: "Owner", primary: true,
      cell: (r) => (
        <Link href={`/admin/contracts/${r.id}`} className="font-medium text-navy hover:text-navy-700">
          {r.owner_details?.name || r.owner_name_hint || r.owner_email}
        </Link>
      ),
    },
    { header: "Email", cell: (r) => <span className="text-slate">{r.owner_email}</span> },
    {
      header: "Status",
      cell: (r) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[r.status] ?? "bg-surface-gray text-slate"}`}>
          {STATUS_LABEL[r.status] ?? r.status}
        </span>
      ),
    },
    { header: "Sent", cell: (r) => <span className="text-slate">{new Date(r.created_at).toLocaleDateString("en-PH")}</span> },
    { header: "Signed", cell: (r) => <span className="text-slate">{r.manager_signed_at ? new Date(r.manager_signed_at).toLocaleDateString("en-PH") : "—"}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Contracts</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total</p>
        </div>
        <Link href="/admin/contracts/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800">
          <Icon name="add" size={20} /> Send agreement
        </Link>
      </div>
      <div className="mt-6">
        <DataTable
          rows={rows}
          columns={columns}
          getKey={(r) => r.id}
          empty={<>No agreements yet. <Link href="/admin/contracts/new" className="text-navy-700 underline">Send the first one</Link>.</>}
        />
      </div>
    </div>
  );
}
