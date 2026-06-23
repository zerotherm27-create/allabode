import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { generateStatement } from "@/app/admin/soa-actions";

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

export default async function AdminStatementsPage() {
  const supabase = await createClient();
  const [{ data: rowsData }, { data: owners }, { data: tenants }] = await Promise.all([
    supabase.from("statements_of_account")
      .select("id,statement_type,period_start,period_end,net_remittance,closing_balance,status,owners(name),tenants(name)")
      .order("created_at", { ascending: false }),
    supabase.from("owners").select("id,name").order("name"),
    supabase.from("tenants").select("id,name").order("name"),
  ]);
  const rows = (rowsData ?? []) as Row[];
  const ownerOpts = (owners ?? []) as { id: string; name: string }[];
  const tenantOpts = (tenants ?? []) as { id: string; name: string }[];

  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-2xl font-bold text-navy">Statements of Account</h1>
      <p className="mt-1 text-sm text-slate">Generate, review, approve, and publish. Totals are computed from the ledger — never edited by hand.</p>

      {/* Generators */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        {[
          { type: "owner", title: "Owner statement", opts: ownerOpts, icon: "real_estate_agent" },
          { type: "tenant", title: "Tenant statement", opts: tenantOpts, icon: "person" },
        ].map((g) => (
          <form key={g.type} action={generateStatement} className="rounded-lg border border-line bg-surface p-5">
            <input type="hidden" name="statement_type" value={g.type} />
            <div className="flex items-center gap-2"><Icon name={g.icon} size={20} className="text-navy-700" /><h2 className="font-display text-base font-semibold text-navy">{g.title}</h2></div>
            <div className="mt-4 flex flex-col gap-3">
              <select name="party_id" required defaultValue="" className={inputCls}>
                <option value="" disabled>Select {g.type}…</option>
                {g.opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input name="period_start" type="date" defaultValue={first} required className={inputCls} />
                <input name="period_end" type="date" defaultValue={last} required className={inputCls} />
              </div>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
                <Icon name="note_add" size={18} /> Generate draft
              </button>
            </div>
          </form>
        ))}
      </div>

      {/* List */}
      <div className="mt-8 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-surface-gray text-slate">
            <tr>
              <th className="px-4 py-3 font-medium">Party</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate">No statements yet. Generate one above.</td></tr>
            )}
            {rows.map((r) => {
              const party = pick(r.statement_type === "owner" ? r.owners : r.tenants)?.name ?? "—";
              const amount = r.statement_type === "owner" ? r.net_remittance : r.closing_balance;
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3"><Link href={`/admin/statements/${r.id}`} className="font-medium text-navy hover:text-navy-700">{party}</Link></td>
                  <td className="px-4 py-3 text-slate capitalize">{r.statement_type}</td>
                  <td className="px-4 py-3 text-slate">{r.period_start} → {r.period_end}</td>
                  <td className="px-4 py-3 font-semibold text-navy">{peso(Number(amount))}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[r.status] ?? "bg-surface-gray text-slate"}`}>{r.status.replace(/_/g, " ")}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
