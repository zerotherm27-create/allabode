import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, StatCard, Panel, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";
import { signedUrl, FINANCE_DOCS_BUCKET } from "@/lib/storage";

export const metadata: Metadata = { title: "Owner Dashboard", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Dashboard",  icon: "dashboard",           href: "/dashboard/owner" },
  { label: "Properties", icon: "apartment",           href: "/dashboard/owner#properties" },
  { label: "Tickets",    icon: "confirmation_number", href: "/dashboard/owner/tickets" },
  { label: "Documents",  icon: "folder",              href: "/dashboard/owner/documents" },
  { label: "Notices",    icon: "campaign",            href: "/dashboard/owner/notices" },
  { label: "Statements", icon: "receipt_long",        href: "/dashboard/owner#statements" },
  { label: "Expenses",   icon: "payments",            href: "/dashboard/owner#expenses" },
];

const peso = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`;

type Unit = { id: string; status: string; base_rent: number | null };
type Property = { id: string; name: string; city: string | null; status: string; units: Unit[] | null };
type Soa = {
  id: string; period_start: string; period_end: string; net_remittance: number; closing_balance: number;
  status: string; pdf_path: string | null;
  payout_status: string | null; payout_due_at: string | null;
  payout_slip_url: string | null; paid_at: string | null;
};
type Expense = { id: string; expense_date: string; description: string | null; total_amount: number; category: string; status: string };

const PAYOUT_BADGE: Record<string, { label: string; cls: string }> = {
  pending:        { label: "Payout Pending",       cls: "bg-reserved/10 text-reserved" },
  processing:     { label: "Transfer in Progress", cls: "bg-reserved/10 text-reserved" },
  paid:           { label: "Paid",                 cls: "bg-available/10 text-available" },
  collected:      { label: "Collected",            cls: "bg-available/10 text-available" },
  refund_pending: { label: "Payment Required",     cls: "bg-error-bg text-error" },
};

export default async function OwnerDashboard() {
  const { role, ownerId } = await getCurrentRole();
  if (role !== "owner") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: propData }, { data: soaData }, { data: expenseData }, { data: ownerRow }] = await Promise.all([
    supabase.from("properties").select("id,name,city,status,units(id,status,base_rent)").order("name"),
    supabase.from("statements_of_account")
      .select("id,period_start,period_end,net_remittance,closing_balance,status,pdf_path,payout_status,payout_due_at,payout_slip_url,paid_at")
      .eq("statement_type", "owner")
      .order("period_end", { ascending: false }),
    supabase.from("expenses").select("id,expense_date,description,total_amount,category,status")
      .in("status", ["posted", "locked", "included_in_statement"]).order("expense_date", { ascending: false }).limit(8),
    supabase.from("owners").select("name").eq("id", ownerId ?? "").maybeSingle(),
  ]);

  const properties = (propData ?? []) as Property[];
  const statements = (soaData ?? []) as Soa[];
  const expenses = (expenseData ?? []) as Expense[];
  const ownerName = (ownerRow as { name?: string } | null)?.name ?? "Owner";

  // Generate signed URLs for slips (published SOAs only)
  const slipUrls: Record<string, string> = {};
  for (const s of statements) {
    if (s.payout_slip_url && s.status === "published") {
      const u = await signedUrl(supabase, FINANCE_DOCS_BUCKET, s.payout_slip_url, 300);
      if (u) slipUrls[s.id] = u;
    }
  }

  const allUnits = properties.flatMap((p) => p.units ?? []);
  const totalUnits = allUnits.length;
  const occupied = allUnits.filter((u) => u.status === "Occupied").length;
  const occupancy = totalUnits ? Math.round((occupied / totalUnits) * 100) : 0;
  const monthlyRent = allUnits.filter((u) => u.status === "Occupied").reduce((s, u) => s + Number(u.base_rent ?? 0), 0);
  const latestRemittance = statements[0]?.net_remittance ?? 0;

  return (
    <DashboardShell role="Owner" nav={nav} userName={ownerName}>
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-2xl font-bold text-navy">Portfolio Overview</h1>
        <p className="mt-1 text-sm text-slate">Welcome back, {ownerName}.</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon="apartment" label="Properties" value={String(properties.length)} />
          <StatCard icon="door_front" label="Units" value={String(totalUnits)} delta={`${occupied} occupied`} tone="flat" />
          <StatCard icon="donut_large" label="Occupancy" value={`${occupancy}%`} tone="flat" />
          <StatCard icon="account_balance_wallet" label="Latest Net Remittance" value={peso(latestRemittance)} tone="flat" />
        </div>

        {/* Statements */}
        <div id="statements" className="mt-8 scroll-mt-20">
          <Panel title="Owner Statements">
            {statements.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate">No statements published yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {statements.map((s) => {
                  const payout = Number(s.closing_balance ?? s.net_remittance ?? 0);
                  const badge = PAYOUT_BADGE[s.payout_status ?? "pending"];
                  const needsPay = payout < 0 && s.status === "published" && s.payout_status !== "collected";
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="flex size-9 items-center justify-center rounded-md bg-navy/5 text-navy-700 shrink-0">
                        <Icon name="receipt_long" size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-navy">{s.period_start} → {s.period_end}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate capitalize">{s.status}</span>
                          {s.status === "published" && badge && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>{badge.label}</span>
                          )}
                          {s.payout_due_at && s.status === "published" && (
                            <span className="text-[10px] text-slate">Due {s.payout_due_at}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${payout < 0 ? "text-error" : "text-navy"}`}>
                          {peso(payout)}
                        </span>

                        {/* Pay Balance button — only when payout is negative */}
                        {needsPay && (
                          <form action="/api/payments/create-from-soa" method="POST" className="contents">
                            <input type="hidden" name="soa_id" value={s.id} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-md bg-error px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                              formAction={`/api/payments/create-from-soa`}
                            >
                              <Icon name="credit_card" size={14} /> Pay Balance
                            </button>
                          </form>
                        )}

                        {/* Bank slip link */}
                        {slipUrls[s.id] && (
                          <a href={slipUrls[s.id]} target="_blank" rel="noopener noreferrer" className="flex size-8 items-center justify-center rounded-md text-available hover:bg-surface-gray" title="View bank transfer slip">
                            <Icon name="account_balance" size={18} />
                          </a>
                        )}

                        {/* PDF download */}
                        {s.pdf_path && (
                          <a href={`/api/portal/soa/${s.id}`} target="_blank" rel="noopener noreferrer" aria-label="Download PDF" className="flex size-8 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-navy">
                            <Icon name="download" size={18} />
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* Property portfolio */}
        <div id="properties" className="mt-8 scroll-mt-20">
          <h2 className="font-display text-lg font-bold text-navy">Property Portfolio</h2>
          {properties.length === 0 ? (
            <p className="mt-4 rounded-lg border border-line bg-surface p-6 text-center text-sm text-slate">
              No properties on file yet. Your property manager will add them.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => {
                const units = p.units ?? [];
                const occ = units.filter((u) => u.status === "Occupied").length;
                return (
                  <article key={p.id} className="overflow-hidden rounded-lg border border-line bg-surface">
                    <div className="relative aspect-[16/9] bg-gradient-to-br from-navy via-navy-700 to-navy-600">
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-navy">{p.status}</span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-base font-semibold text-navy">{p.name}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate"><Icon name="location_on" size={14} className="text-gold" />{p.city ?? "—"}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
                        <div><p className="label-caps text-slate">Units</p><p className="font-semibold text-navy">{units.length}</p></div>
                        <div className="text-right"><p className="label-caps text-slate">Occupied</p><p className="text-navy">{occ}/{units.length}</p></div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent expenses */}
        <div id="expenses" className="mt-8 scroll-mt-20">
          <Panel title="Recent Expenses" action={<span className="label-caps text-slate">Monthly rent roll: {peso(monthlyRent)}</span>}>
            {expenses.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate">No posted expenses yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {expenses.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="flex size-9 items-center justify-center rounded-md bg-navy/5 text-navy-700"><Icon name="receipt" size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy">{e.description ?? e.category}</p>
                      <p className="text-xs text-slate">{e.expense_date} · {e.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-navy">{peso(Number(e.total_amount))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
