import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import {
  ACCOUNT_STATE_LABEL,
  isMissingColumn,
  isMissingTable,
  isSpecialistVisible,
  sortSpecialists,
  specialistAccountState,
  type SpecialistAccountState,
} from "@/lib/team/admin-status";
import { getNeverSignedIn } from "@/lib/team/provision";

type Row = {
  id: string;
  display_name: string;
  email: string;
  status: string;
  auth_user_id: string | null;
  subdomain: string | null;
  created_at: string;
  is_visible?: boolean | null;
};

type ViewRow = Row & { state: SpecialistAccountState };

const stateStyle: Record<SpecialistAccountState, string> = {
  invited: "bg-reserved/10 text-reserved",
  active: "bg-available/10 text-available",
  suspended: "bg-error-bg text-error",
  pending: "bg-surface-gray text-slate",
  rejected: "bg-surface-gray text-slate",
};

const columns: Column<ViewRow>[] = [
  { header: "Name", primary: true, cell: (r) => <Link href={`/admin/specialists/${r.id}`} className="font-medium text-navy hover:text-navy-700">{r.display_name}</Link> },
  { header: "Email", cell: (r) => <span className="break-all text-slate">{r.email}</span> },
  {
    header: "Status",
    cell: (r) => (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${stateStyle[r.state]}`}>{ACCOUNT_STATE_LABEL[r.state]}</span>
        {!isSpecialistVisible(r) && (
          <span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium text-slate">Hidden</span>
        )}
      </span>
    ),
  },
  { header: "Web address", cell: (r) => <span className="text-slate">{r.subdomain ?? "—"}</span> },
];

export default async function AdminSpecialistsPage() {
  const supabase = await createClient();
  const BASE_COLS = "id,display_name,email,status,auth_user_id,subdomain,created_at";
  let { data, error } = await supabase.from("specialists").select(`${BASE_COLS},is_visible`);
  if (isMissingColumn(error)) {
    // Visibility migration not run yet: list without the Hidden badge.
    ({ data, error } = await supabase.from("specialists").select(BASE_COLS));
  }
  const missing = isMissingTable(error);
  const raw = (data ?? []) as Row[];
  // Sign-in status comes from the Auth Admin API (last_sign_in_at); null when
  // it is unavailable, in which case linked rows simply show as Active.
  const neverSignedIn = await getNeverSignedIn(raw.map((r) => r.auth_user_id).filter((v): v is string => !!v));
  const rows: ViewRow[] = sortSpecialists(
    raw.map((r) => ({ ...r, state: specialistAccountState(r, neverSignedIn) })),
    (r) => r.state === "invited",
  );
  const invited = rows.filter((r) => r.state === "invited").length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Property specialists</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total{invited ? ` · ${invited} not signed in yet` : ""}{neverSignedIn === null && !missing ? " · sign-in status unavailable" : ""}</p>
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
