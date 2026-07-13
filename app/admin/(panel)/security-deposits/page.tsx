import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";

type DepositRow = {
  id: string;
  deposit_type: string;
  months_held: number;
  amount_held: number;
  received_at: string;
  status: string;
  returned_amount: number | null;
  forfeited_amount: number | null;
  tenants: { name: string } | { name: string }[] | null;
  units: { unit_label: string; properties: { name: string } | null } | null;
};

type CommRow = {
  id: string;
  commission_type: string;
  description: string | null;
  amount: number;
  status: string;
  applied_at: string | null;
  leases: {
    units: { unit_label: string; properties: { name: string; owners: { name: string } | null } | null } | null;
  } | null;
};

const peso = (n: number) =>
  `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const DEPOSIT_STATUS: Record<string, string> = {
  held:               "bg-reserved/10 text-reserved",
  partially_returned: "bg-gold/10 text-gold-bright",
  returned:           "bg-available/10 text-available",
  forfeited:          "bg-error-bg text-error",
};

const COMM_STATUS: Record<string, string> = {
  pending: "bg-reserved/10 text-reserved",
  applied: "bg-available/10 text-available",
  waived:  "bg-surface-gray text-slate",
};

const depositCols: Column<DepositRow>[] = [
  {
    header: "Tenant",
    primary: true,
    cell: (r) => {
      const t = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
      return (
        <Link href={`/admin/security-deposits/${r.id}`} className="font-medium text-navy hover:text-navy-700">
          {t?.name ?? "—"}
        </Link>
      );
    },
  },
  {
    header: "Unit",
    cell: (r) => {
      const prop = r.units?.properties;
      return (
        <span className="text-slate">
          {prop ? `${(prop as { name: string }).name} · ` : ""}{r.units?.unit_label ?? "—"}
        </span>
      );
    },
  },
  {
    header: "Type",
    cell: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${r.deposit_type === "advance" ? "bg-gold/10 text-gold-bright" : "bg-navy/5 text-navy-700"}`}>
        {r.deposit_type === "advance" ? "Advance Rent" : "Security Deposit"}
      </span>
    ),
  },
  {
    header: "Months",
    cell: (r) => <span className="text-slate">{r.months_held}×</span>,
  },
  {
    header: "Held",
    cell: (r) => <span className="font-semibold text-navy">{peso(r.amount_held)}</span>,
  },
  {
    header: "Received",
    cell: (r) => <span className="text-slate">{r.received_at}</span>,
  },
  {
    header: "Status",
    cell: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${DEPOSIT_STATUS[r.status] ?? "bg-surface-gray text-slate"}`}>
        {r.status.replace(/_/g, " ")}
      </span>
    ),
  },
];

const commCols: Column<CommRow>[] = [
  {
    header: "Commission",
    primary: true,
    cell: (r) => {
      const unit = r.leases?.units;
      const prop = unit?.properties;
      const owner = prop ? (prop as { owners?: { name: string } | null }).owners : null;
      return (
        <div>
          <p className="font-medium text-navy capitalize">
            {r.description ?? r.commission_type.replace(/_/g, " ")}
          </p>
          <p className="text-xs text-slate">
            {(owner as { name?: string } | null)?.name ?? "?"} · {(prop as { name?: string } | null)?.name ?? "?"} {unit?.unit_label ?? ""}
          </p>
        </div>
      );
    },
  },
  {
    header: "Amount",
    cell: (r) => <span className="font-semibold text-navy">{peso(r.amount)}</span>,
  },
  {
    header: "Status",
    cell: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${COMM_STATUS[r.status] ?? "bg-surface-gray text-slate"}`}>
        {r.status}
      </span>
    ),
  },
  {
    header: "Applied",
    cell: (r) => (
      <span className="text-slate text-xs">
        {r.applied_at ? new Date(r.applied_at).toLocaleDateString("en-PH") : "—"}
      </span>
    ),
  },
];

export default async function SecurityDepositsPage() {
  const supabase = await createClient();

  const [{ data: depData }, { data: commData }] = await Promise.all([
    supabase
      .from("security_deposits")
      .select("id,deposit_type,months_held,amount_held,received_at,status,returned_amount,forfeited_amount,tenants(name),units(unit_label,properties(name))")
      .order("received_at", { ascending: false }),
    supabase
      .from("lease_commissions")
      .select("id,commission_type,description,amount,status,applied_at,leases(units(unit_label,properties(name,owners(name))))")
      .order("created_at", { ascending: false }),
  ]);

  const deposits    = (depData  ?? []) as unknown as DepositRow[];
  const commissions = (commData ?? []) as unknown as CommRow[];

  const totalHeld    = deposits.filter((d) => d.status === "held").reduce((s, d) => s + Number(d.amount_held), 0);
  const pendingComms = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Security Deposits &amp; Commissions</h1>
        <p className="mt-1 text-sm text-slate">
          Security Deposits fund the lease&#x2019;s first owner remittance (minus commission and other expenses);
          Advance Rent is held and shown only as a note. Commissions auto-deduct from the owner SOA.
        </p>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Currently held</p>
          <p className="mt-1 font-display text-xl font-bold text-reserved">{peso(totalHeld)}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Active deposits</p>
          <p className="mt-1 font-display text-xl font-bold text-navy">{deposits.filter((d) => d.status === "held").length}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Pending commissions</p>
          <p className="mt-1 font-display text-xl font-bold text-gold-bright">{peso(pendingComms)}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Commissions applied</p>
          <p className="mt-1 font-display text-xl font-bold text-available">{commissions.filter((c) => c.status === "applied").length}</p>
        </div>
      </div>

      {/* Deposits table */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Icon name="savings" size={20} className="text-navy-700" />
          <h2 className="font-display text-lg font-semibold text-navy">Security Deposits</h2>
          <span className="ml-1 rounded-full bg-navy/10 px-2 py-0.5 text-xs font-semibold text-navy">{deposits.length}</span>
        </div>
        <DataTable
          rows={deposits}
          columns={depositCols}
          getKey={(r) => r.id}
          empty="No security deposits recorded yet. Record one from the lease edit page."
        />
      </div>

      {/* Commissions table */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Icon name="percent" size={20} className="text-navy-700" />
          <h2 className="font-display text-lg font-semibold text-navy">Lease Commissions</h2>
          <span className="ml-1 rounded-full bg-navy/10 px-2 py-0.5 text-xs font-semibold text-navy">{commissions.length}</span>
        </div>
        <p className="mb-3 text-xs text-slate">
          <Icon name="info" size={14} className="mr-1 inline text-navy-700" />
          Pending commissions are automatically included as a deduction when you generate an owner SOA for that lease.
        </p>
        <DataTable
          rows={commissions}
          columns={commCols}
          getKey={(r) => r.id}
          empty="No commissions recorded yet. Record one from the lease edit page."
        />
      </div>
    </div>
  );
}
