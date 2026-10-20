import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import {
  ACCOUNT_STATE_LABEL,
  isMissingTable,
  sortSpecialists,
  specialistAccountState,
  type SpecialistAccountState,
} from "@/lib/team/admin-status";

type Row = {
  id: string;
  display_name: string;
  email: string;
  status: string;
  auth_user_id: string | null;
  subdomain: string | null;
  created_at: string;
};

const stateStyle: Record<SpecialistAccountState, string> = {
  invited: "bg-reserved/10 text-reserved",
  active: "bg-available/10 text-available",
  suspended: "bg-error-bg text-error",
  pending: "bg-surface-gray text-slate",
  rejected: "bg-surface-gray text-slate",
};

const columns: Column<Row>[] = [
  { header: "Name", primary: true, cell: (r) => <Link href={`/admin/specialists/${r.id}`} className="font-medium text-navy hover:text-navy-700">{r.display_name}</Link> },
  { header: "Email", cell: (r) => <span className="break-all text-slate">{r.email}</span> },
  {
    header: "Status",
    cell: (r) => {
      const state = specialistAccountState(r);
      return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${stateStyle[state]}`}>{ACCOUNT_STATE_LABEL[state]}</span>;
    },
  },
  { header: "Web address", cell: (r) => <span className="text-slate">{r.subdomain ?? "—"}</span> },
];

export default async function AdminSpecialistsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialists")
    .select("id,display_name,email,status,auth_user_id,subdomain,created_at");
  const missing = isMissingTable(error);
  const rows = sortSpecialists((data ?? []) as Row[]);
  const invited = rows.filter((r) => specialistAccountState(r) === "invited").length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Property specialists</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total{invited ? ` · ${invited} not activated yet` : ""}</p>
        </div>
        {!missing && (
          <Link
            href="/admin/specialists/new"
            className="press inline-flex min-h-11 items-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Icon name="person_add" size={18} />
            Add specialist
          </Link>
        )}
      </div>
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
        <DataTable
          rows={rows}
          columns={columns}
          getKey={(r) => r.id}
          empty={<>No specialists yet. Add one to send them an invitation.</>}
        />
      </div>
    </div>
  );
}
