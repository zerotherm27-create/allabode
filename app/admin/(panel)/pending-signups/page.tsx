import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { PendingSignupAssignForm } from "@/components/admin/pending-signup-assign-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPendingSignups, type PendingSignup } from "@/lib/auth/pending-signups";

export const dynamic = "force-dynamic";

type LinkedRecord = {
  id: string;
  email: string | null;
  auth_user_id?: string | null;
};

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-4 text-sm text-slate">
      <div className="flex gap-3">
        <Icon name="warning" size={20} className="mt-0.5 shrink-0 text-warning" />
        <div>
          <h2 className="font-semibold text-navy">Pending signups could not load</h2>
          <p className="mt-1">
            {message}
          </p>
          <p className="mt-2 text-xs">
            This tab needs the server-only <code>SUPABASE_SERVICE_ROLE_KEY</code> because it reads
            Supabase Auth users. Other admin tabs can still work with only the anon key.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const columns: Column<PendingSignup>[] = [
  {
    header: "User",
    primary: true,
    cell: (row) => (
      <div>
        <p className="font-medium text-navy">{row.displayName}</p>
        <p className="mt-0.5 text-xs text-slate">{row.email}</p>
      </div>
    ),
  },
  {
    header: "Provider",
    cell: (row) => (
      <div className="flex flex-wrap gap-1.5">
        {(row.providers.length > 0 ? row.providers : ["unknown"]).map((provider) => (
          <span key={provider} className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium capitalize text-slate">
            {provider}
          </span>
        ))}
      </div>
    ),
  },
  {
    header: "Status",
    cell: (row) => row.confirmed ? (
      <span className="rounded-full bg-available/10 px-2.5 py-1 text-xs font-medium text-available">Confirmed</span>
    ) : (
      <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">Unconfirmed</span>
    ),
  },
  {
    header: "Signed up",
    cell: (row) => <span className="text-slate">{formatDate(row.createdAt)}</span>,
  },
  {
    header: "Assign",
    align: "right",
    cell: (row) => (
      <div className="flex flex-wrap items-start justify-end gap-2">
        <PendingSignupAssignForm userId={row.id} name={row.displayName} role="owner" label="Owner" />
        <PendingSignupAssignForm userId={row.id} name={row.displayName} role="tenant" label="Tenant" />
        <PendingSignupAssignForm userId={row.id} name={row.displayName} role="staff" label="Staff" />
      </div>
    ),
  },
];

async function listAllAuthUsers() {
  const admin = createAdminClient();
  const users = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

export default async function PendingSignupsPage() {
  let rows: PendingSignup[] = [];
  let loadError: string | null = null;

  try {
    const admin = createAdminClient();
    const [authUsers, ownersResult, tenantsResult, staffResult] = await Promise.all([
      listAllAuthUsers(),
      admin.from("owners").select("id,email,auth_user_id"),
      admin.from("tenants").select("id,email,auth_user_id"),
      admin.from("users").select("id,email"),
    ]);

    if (ownersResult.error) throw new Error(ownersResult.error.message);
    if (tenantsResult.error) throw new Error(tenantsResult.error.message);
    if (staffResult.error) throw new Error(staffResult.error.message);

    rows = buildPendingSignups({
      authUsers,
      owners: (ownersResult.data ?? []) as LinkedRecord[],
      tenants: (tenantsResult.data ?? []) as LinkedRecord[],
      staff: (staffResult.data ?? []) as LinkedRecord[],
    });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown Supabase admin error";
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Pending signups</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate">
            Google or email accounts that exist in Supabase Auth but are not linked to an owner, tenant, or staff profile yet.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm text-slate">
          <Icon name="person_add" size={18} />
          {rows.length} pending
        </div>
      </div>

      <div className="mt-6">
        {loadError ? (
          <ErrorNotice message={loadError} />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            getKey={(row) => row.id}
            minWidth="860px"
            empty={
              <>
                No pending signups. New Google accounts will appear here until you assign them.
              </>
            }
          />
        )}
      </div>
    </div>
  );
}
