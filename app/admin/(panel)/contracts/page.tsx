import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { fetchContractRows, CONTRACT_STATUS_COLOR as STATUS_COLOR, CONTRACT_TYPE_COLOR, CONTRACT_TYPE_LABEL, type ContractRow as Row } from "@/lib/admin/contract-rows";

export default async function AdminContractsPage() {
  const supabase = await createClient();
  const rows = await fetchContractRows(supabase);

  const columns: Column<Row>[] = [
    {
      header: "Contract", primary: true,
      cell: (r) => (
        <Link href={r.href} className="font-medium text-navy hover:text-navy-700">
          {r.name}
        </Link>
      ),
    },
    {
      header: "Type",
      cell: (r) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CONTRACT_TYPE_COLOR[r.type]}`}>
          {CONTRACT_TYPE_LABEL[r.type]}
        </span>
      ),
    },
    { header: "Email", cell: (r) => <span className="text-slate">{r.email}</span> },
    {
      header: "Status",
      cell: (r) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[r.status] ?? "bg-surface-gray text-slate"}`}>
          {r.statusLabel}
        </span>
      ),
    },
    { header: "Sent", cell: (r) => <span className="text-slate">{new Date(r.created_at).toLocaleDateString("en-PH")}</span> },
    { header: "Signed", cell: (r) => <span className="text-slate">{r.signed_at ? new Date(r.signed_at).toLocaleDateString("en-PH") : "—"}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Contracts</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/contracts/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 press">
            <Icon name="add" size={20} /> PM agreement
          </Link>
          <Link href="/admin/contracts/tenancy/new" className="inline-flex items-center gap-2 rounded-md border border-navy px-5 py-3 text-sm font-semibold text-navy hover:bg-surface-gray press">
            <Icon name="add" size={20} /> Tenancy agreement
          </Link>
          <Link href="/admin/contracts/parking/new" className="inline-flex items-center gap-2 rounded-md border border-navy px-5 py-3 text-sm font-semibold text-navy hover:bg-surface-gray press">
            <Icon name="add" size={20} /> Parking agreement
          </Link>
          <Link href="/admin/contracts/short-term-rental/new" className="inline-flex items-center gap-2 rounded-md border border-navy px-5 py-3 text-sm font-semibold text-navy hover:bg-surface-gray press">
            <Icon name="add" size={20} /> Short term rental
          </Link>
          <Link href="/admin/contracts/addendum/new" className="inline-flex items-center gap-2 rounded-md border border-navy px-5 py-3 text-sm font-semibold text-navy hover:bg-surface-gray press">
            <Icon name="add" size={20} /> Addendum
          </Link>
        </div>
      </div>
      <div className="mt-6">
        <DataTable
          rows={rows}
          columns={columns}
          getKey={(r) => `${r.type}-${r.id}`}
          empty={<>No agreements yet. <Link href="/admin/contracts/new" className="text-navy-700 underline">Send the first one</Link>.</>}
        />
      </div>
    </div>
  );
}
