import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, StatCard, Panel, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";

export const metadata: Metadata = { title: "Tenant Dashboard", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard/tenant" },
  { label: "My Lease", icon: "description", href: "/dashboard/tenant#lease" },
  { label: "Payments", icon: "payments", href: "/dashboard/tenant#payments" },
  { label: "Statements", icon: "receipt_long", href: "/dashboard/tenant#statements" },
];

const peso = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`;
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

type Property = { name?: string; address?: string; city?: string };
type Unit = { unit_label?: string; properties?: Property | Property[] | null };
type Lease = {
  id: string; start_date: string; end_date: string | null; rent_amount: number;
  billing_cycle: string; deposit: number | null; status: string;
  units?: Unit | Unit[] | null;
};
type Payment = { id: string; received_at: string; amount: number; method: string; status: string };
type Soa = { id: string; period_start: string; period_end: string; closing_balance: number; status: string };

export default async function TenantDashboard() {
  const { role, tenantId } = await getCurrentRole();
  if (role !== "tenant") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: leaseData }, { data: payData }, { data: soaData }, { data: tenantRow }] = await Promise.all([
    supabase.from("leases").select("id,start_date,end_date,rent_amount,billing_cycle,deposit,status,units(unit_label,properties(name,address,city))")
      .order("start_date", { ascending: false }),
    supabase.from("payments").select("id,received_at,amount,method,status").order("received_at", { ascending: false }).limit(6),
    supabase.from("statements_of_account").select("id,period_start,period_end,closing_balance,status")
      .eq("statement_type", "tenant").order("period_end", { ascending: false }),
    supabase.from("tenants").select("name").eq("id", tenantId ?? "").maybeSingle(),
  ]);

  const leases = (leaseData ?? []) as Lease[];
  const lease = leases.find((l) => l.status === "active") ?? leases[0] ?? null;
  const payments = (payData ?? []) as Payment[];
  const statements = (soaData ?? []) as Soa[];
  const tenantName = (tenantRow as { name?: string } | null)?.name ?? "Tenant";

  const unit = one(lease?.units ?? null);
  const property = one(unit?.properties ?? null);

  return (
    <DashboardShell role="Tenant" nav={nav} userName={tenantName}>
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-2xl font-bold text-navy">Welcome back, {tenantName}</h1>
        <p className="mt-1 text-sm text-slate">
          {unit?.unit_label ? `${unit.unit_label}${property?.name ? `, ${property.name}` : ""}` : "No active lease on file"}
        </p>

        {!lease ? (
          <p className="mt-6 rounded-lg border border-line bg-surface p-6 text-center text-sm text-slate">
            You don’t have a lease on file yet. Your property manager will set this up.
          </p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard icon="payments" label="Monthly Rent" value={peso(Number(lease.rent_amount))} tone="flat" />
              <StatCard icon="event" label="Lease Ends" value={lease.end_date ?? "—"} tone="flat" />
              <StatCard icon="savings" label="Deposit Held" value={lease.deposit != null ? peso(Number(lease.deposit)) : "—"} tone="flat" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
              {/* Lease summary */}
              <div id="lease" className="scroll-mt-20">
                <Panel title="Current Lease">
                  <dl className="flex flex-col gap-4 text-sm">
                    {[
                      ["Property", property?.name ?? "—"],
                      ["Unit", unit?.unit_label ?? "—"],
                      ["Monthly Rent", peso(Number(lease.rent_amount))],
                      ["Lease Term", `${lease.start_date} – ${lease.end_date ?? "ongoing"}`],
                      ["Billing", lease.billing_cycle.replace("_", "-")],
                      ["Status", lease.status.replace(/_/g, " ")],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
                        <dt className="text-slate">{k}</dt>
                        <dd className="text-right font-medium text-navy capitalize">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Panel>
              </div>

              {/* Payment history */}
              <div id="payments" className="scroll-mt-20">
                <Panel title="Payment History">
                  {payments.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate">No payments recorded yet.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {payments.map((p) => (
                        <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <span className="flex size-9 items-center justify-center rounded-md bg-available/10 text-available"><Icon name="check_circle" size={20} fill={1} /></span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-navy">{p.received_at}</p>
                            <p className="text-xs text-slate capitalize">{p.method.replace("_", " ")} · {p.status}</p>
                          </div>
                          <span className="text-sm font-semibold text-navy">{peso(Number(p.amount))}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            </div>

            {/* Statements */}
            <div id="statements" className="mt-8 scroll-mt-20">
              <Panel title="Statements of Account">
                {statements.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate">No statements published yet.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {statements.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="flex size-9 items-center justify-center rounded-md bg-navy/5 text-navy-700"><Icon name="receipt_long" size={20} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-navy">{s.period_start} → {s.period_end}</p>
                          <p className="text-xs text-slate capitalize">{s.status}</p>
                        </div>
                        <span className="text-sm font-semibold text-navy">{peso(Number(s.closing_balance))}</span>
                        <a href={`/api/portal/soa/${s.id}`} target="_blank" rel="noopener noreferrer" aria-label="Download PDF" className="flex size-9 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-navy">
                          <Icon name="download" size={20} />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
