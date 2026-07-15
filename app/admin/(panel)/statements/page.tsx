import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { generateStatement, generateOwnerSoaByLease } from "@/app/admin/soa-actions";
import { SubmitButton } from "@/components/admin/form-kit";

type Named = { name?: string };
type Row = {
  id: string; statement_type: string; period_start: string; period_end: string;
  net_remittance: number; closing_balance: number; status: string;
  owners: Named | Named[] | null; tenants: Named | Named[] | null;
};
const pick = (v: Named | Named[] | null) => (Array.isArray(v) ? v[0] : v) ?? null;
const peso = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`;

const STATUS_TONE: Record<string, string> = {
  published: "bg-available/10 text-available",
  approved: "bg-available/10 text-available",
  checker_review: "bg-reserved/10 text-reserved",
  generated: "bg-surface-gray text-slate",
  voided: "bg-error-bg text-error",
};
const inputCls =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";

function leaseTypeLabel(value: string) {
  if (value === "bnb") return "BNB / daily platform";
  return value === "short_term" ? "Short-term rental" : "Long-term rental";
}

function leaseStatusLabel(value: string) {
  return value.replace(/_/g, " ");
}

const columns: Column<Row>[] = [
  { header: "Party", primary: true, cell: (r) => <Link href={`/admin/statements/${r.id}`} className="font-medium text-navy hover:text-navy-700">{pick(r.statement_type === "owner" ? r.owners : r.tenants)?.name ?? "—"}</Link> },
  { header: "Type", cell: (r) => <span className="text-slate capitalize">{r.statement_type}</span> },
  { header: "Period", cell: (r) => <span className="text-slate">{r.period_start} → {r.period_end}</span> },
  { header: "Amount", cell: (r) => <span className="font-semibold text-navy">{peso(Number(r.statement_type === "owner" ? r.net_remittance : r.closing_balance))}</span> },
  { header: "Status", cell: (r) => <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[r.status] ?? "bg-surface-gray text-slate"}`}>{r.status.replace(/_/g, " ")}</span> },
];

type LeaseOpt = { id: string; label: string };

export default async function AdminStatementsPage({ searchParams }: { searchParams: Promise<{ genError?: string }> }) {
  const { genError } = await searchParams;
  const supabase = await createClient();
  const [{ data: rowsData }, { data: tenants }, { data: leasesData }] = await Promise.all([
    supabase.from("statements_of_account")
      .select("id,statement_type,period_start,period_end,net_remittance,closing_balance,status,owners(name),tenants(name)")
      .order("created_at", { ascending: false }),
    supabase.from("tenants").select("id,name").order("name"),
    supabase.from("leases")
      .select("id,status,lease_type,mgmt_fee_pct,rent_amount,units(unit_label,properties(name,owners(name)))")
      .in("status", ["draft", "pending_signature", "active", "renewal_pending", "renewed", "expiring"])
      .order("created_at", { ascending: false }),
  ]);

  const rows = (rowsData ?? []) as Row[];
  const tenantOpts = (tenants ?? []) as { id: string; name: string }[];

  type RawLease = {
    id: string; status: string; lease_type: string; mgmt_fee_pct: number; rent_amount: number;
    units: { unit_label: string; properties: { name: string; owners: { name: string } | { name: string }[] | null } | null } | null;
  };
  const leaseOpts: LeaseOpt[] = ((leasesData ?? []) as unknown as RawLease[]).map((l) => {
    const prop = l.units?.properties;
    const owner = prop ? (Array.isArray((prop as { owners?: unknown }).owners) ? (prop as { owners: { name: string }[] }).owners[0] : (prop as { owners: { name: string } | null }).owners) : null;
    return {
      id:    l.id,
      label: `${(owner as { name?: string } | null)?.name ?? "?"} · ${(prop as { name?: string } | null)?.name ?? "?"} ${l.units?.unit_label ?? ""} (${leaseStatusLabel(l.status)} · ${leaseTypeLabel(l.lease_type)} · ${Number(l.mgmt_fee_pct ?? 0)}% fee · ₱${Number(l.rent_amount).toLocaleString("en-PH")})`,
    };
  });

  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const last  = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-2xl font-bold text-navy">Statements of Account</h1>
      <p className="mt-1 text-sm text-slate">Generate, review, approve, and publish.</p>

      {genError && (
        <div role="alert" className="mt-4 flex items-center gap-2 rounded-md border border-error/30 bg-error-bg px-4 py-3 text-sm text-error">
          <Icon name="error" size={18} />
          {decodeURIComponent(genError)}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Owner SOA by lease (new) */}
        <form action={generateOwnerSoaByLease} className="col-span-1 rounded-lg border border-navy/20 bg-surface p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Icon name="real_estate_agent" size={20} className="text-navy-700" />
            <h2 className="font-display text-base font-semibold text-navy">Owner SOA — by lease</h2>
            <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">Recommended</span>
          </div>
          <p className="mt-1 text-xs text-slate">Auto-populates from charge templates + expense records. Templates and mgmt fee pulled from the lease.</p>
          <div className="mt-4 flex flex-col gap-3">
            <select name="lease_id" required defaultValue="" className={inputCls}>
              <option value="" disabled>Select lease…</option>
              {leaseOpts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input name="period_start" type="date" defaultValue={first} required className={inputCls} />
              <input name="period_end"   type="date" defaultValue={last}  required className={inputCls} />
            </div>
            <SubmitButton label="Generate draft" />
          </div>
        </form>

        {/* Tenant SOA (legacy) */}
        <form action={generateStatement} className="rounded-lg border border-line bg-surface p-5">
          <input type="hidden" name="statement_type" value="tenant" />
          <div className="flex items-center gap-2"><Icon name="person" size={20} className="text-navy-700" /><h2 className="font-display text-base font-semibold text-navy">Tenant statement</h2></div>
          <div className="mt-4 flex flex-col gap-3">
            <select name="party_id" required defaultValue="" className={inputCls}>
              <option value="" disabled>Select tenant…</option>
              {tenantOpts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input name="period_start" type="date" defaultValue={first} required className={inputCls} />
              <input name="period_end"   type="date" defaultValue={last}  required className={inputCls} />
            </div>
            <SubmitButton label="Generate" />
          </div>
        </form>
      </div>

      <div className="mt-8">
        <DataTable rows={rows} columns={columns} getKey={(r) => r.id} empty="No statements yet. Generate one above." />
      </div>
    </div>
  );
}
