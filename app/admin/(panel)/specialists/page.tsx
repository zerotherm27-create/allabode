import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { isMissingTable, sortSpecialists } from "@/lib/team/admin-status";

type Row = {
  id: string;
  display_name: string;
  email: string;
  status: string;
  requested_subdomain: string | null;
  subdomain: string | null;
  license_mode: string;
  created_at: string;
};

const statusStyle: Record<string, string> = {
  pending: "bg-reserved/10 text-reserved",
  approved: "bg-available/10 text-available",
  suspended: "bg-error-bg text-error",
  rejected: "bg-surface-gray text-slate",
};

export const specialistStatusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const columns: Column<Row>[] = [
  { header: "Name", primary: true, cell: (r) => <Link href={`/admin/specialists/${r.id}`} className="font-medium text-navy hover:text-navy-700">{r.display_name}</Link> },
  { header: "Email", cell: (r) => <span className="text-slate">{r.email}</span> },
  { header: "Status", cell: (r) => <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[r.status] ?? statusStyle.rejected}`}>{specialistStatusLabel(r.status)}</span> },
  { header: "Subdomain", cell: (r) => <span className="text-slate">{r.subdomain ?? r.requested_subdomain ?? "—"}{!r.subdomain && r.requested_subdomain ? " (requested)" : ""}</span> },
  { header: "Licence", cell: (r) => <span className="text-slate">{r.license_mode === "own" ? "Own PRC licence" : "Accredited under broker"}</span> },
];

export default async function AdminSpecialistsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialists")
    .select("id,display_name,email,status,requested_subdomain,subdomain,license_mode,created_at");
  const missing = isMissingTable(error);
  const rows = sortSpecialists((data ?? []) as Row[]);
  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold text-navy">Property specialists</h1>
      <p className="mt-1 text-sm text-slate">{rows.length} total{pending ? ` · ${pending} awaiting review` : ""}</p>
      {(missing || error) && (
        <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-slate">
          <div className="flex gap-2">
            <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-warning" />
            <p>{missing
              ? "Run the specialists migration (supabase/migrations/20261020100000_specialists.sql) in the Supabase SQL editor to enable this page."
              : `Could not load specialists: ${error?.message}`}</p>
          </div>
        </div>
      )}
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} getKey={(r) => r.id} empty={<>No specialist applications yet.</>} />
      </div>
    </div>
  );
}
