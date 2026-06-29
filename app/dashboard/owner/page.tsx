import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, StatCard, Panel, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";
import { signedUrl, FINANCE_DOCS_BUCKET } from "@/lib/storage";
import { MONTH_OPTIONS, archiveByYear, availableYears, filterByMonthYear } from "@/lib/portal/document-filters";

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

type Unit = {
  id: string;
  unit_label: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area: number | null;
  status: string;
  base_rent: number | null;
};
type Property = { id: string; name: string; city: string | null; status: string; units: Unit[] | null };
type Soa = {
  id: string; period_start: string; period_end: string; net_remittance: number; closing_balance: number;
  total_payments: number | null; total_expenses: number | null;
  status: string; owner_id: string | null; pdf_path: string | null;
  payout_status: string | null; payout_due_at: string | null;
  payout_slip_url: string | null; paid_at: string | null;
};
type SoaLine = { id: string; description: string; amount: number; line_type: string; billing_note: string | null };
type Expense = { id: string; expense_date: string; description: string | null; total_amount: number; category: string; status: string };

const PAYOUT_BADGE: Record<string, { label: string; cls: string }> = {
  pending:        { label: "Payout Pending",       cls: "bg-reserved/10 text-reserved" },
  processing:     { label: "Transfer in Progress", cls: "bg-reserved/10 text-reserved" },
  paid:           { label: "Paid",                 cls: "bg-available/10 text-available" },
  collected:      { label: "Collected",            cls: "bg-available/10 text-available" },
  refund_pending: { label: "Payment Required",     cls: "bg-error-bg text-error" },
};

const UNIT_STATUS_TONE: Record<string, string> = {
  Occupied: "bg-available/10 text-available",
  Vacant: "bg-surface-gray text-slate",
  Reserved: "bg-reserved/10 text-reserved",
  Maintenance: "bg-warning/10 text-warning",
};

export default async function OwnerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ soa_month?: string; soa_year?: string; preview_soa?: string }>;
}) {
  const { soa_month, soa_year, preview_soa } = await searchParams;
  const { role, ownerId } = await getCurrentRole();
  if (role !== "owner") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: propData }, { data: soaData }, { data: expenseData }, { data: ownerRow }] = await Promise.all([
    supabase
      .from("properties")
      .select("id,name,city,status,units(id,unit_label,bedrooms,bathrooms,floor_area,status,base_rent)")
      .order("name"),
    supabase.from("statements_of_account")
      .select("id,owner_id,period_start,period_end,total_payments,total_expenses,net_remittance,closing_balance,status,pdf_path,payout_status,payout_due_at,payout_slip_url,paid_at")
      .eq("statement_type", "owner")
      .eq("owner_id", ownerId ?? "")
      .eq("status", "published")
      .order("period_end", { ascending: false }),
    supabase.from("expenses").select("id,expense_date,description,total_amount,category,status")
      .in("status", ["posted", "locked", "included_in_statement"]).order("expense_date", { ascending: false }).limit(8),
    supabase.from("owners").select("name").eq("id", ownerId ?? "").maybeSingle(),
  ]);

  const properties = (propData ?? []) as Property[];
  const statements = (soaData ?? []) as Soa[];
  const expenses = (expenseData ?? []) as Expense[];
  const ownerName = (ownerRow as { name?: string } | null)?.name ?? "Owner";
  const statementYears = availableYears(statements, (s) => s.period_end);
  const filteredStatements = filterByMonthYear(statements, (s) => s.period_end, soa_month, soa_year);
  const statementArchive = archiveByYear(filteredStatements, (s) => s.period_end);
  const previewStatement = statements.find((s) => s.id === preview_soa && s.owner_id === ownerId && s.status === "published");
  const { data: previewLineRows } = previewStatement
    ? await supabase.from("soa_lines").select("id,description,amount,line_type,billing_note").eq("statement_id", previewStatement.id).order("sort_order")
    : { data: null };
  const previewLines = (previewLineRows ?? []) as SoaLine[];
  const previewIncomeLines = previewLines.filter((line) => line.line_type.startsWith("income_"));
  const previewDeductionLines = previewLines.filter((line) => line.line_type.startsWith("deduction_"));
  const previewIncome = previewIncomeLines.reduce((sum, line) => sum + Number(line.amount), 0);
  const previewDeductions = previewDeductionLines.reduce((sum, line) => sum + Math.abs(Number(line.amount)), 0);
  const previewNet = Number(previewStatement?.closing_balance ?? previewStatement?.net_remittance ?? 0);
  const statementHref = (statementId?: string) => {
    const params = new URLSearchParams();
    if (soa_month) params.set("soa_month", soa_month);
    if (soa_year) params.set("soa_year", soa_year);
    if (statementId) params.set("preview_soa", statementId);
    const query = params.toString();
    return `/dashboard/owner${query ? `?${query}` : ""}#statements`;
  };

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
          <Panel
            title="Owner Statements"
            action={
              <form className="flex flex-wrap items-center gap-2">
                <select name="soa_month" defaultValue={soa_month ?? ""} className="h-9 rounded-md border border-line bg-surface px-2 text-xs text-navy">
                  <option value="">All months</option>
                  {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select name="soa_year" defaultValue={soa_year ?? ""} className="h-9 rounded-md border border-line bg-surface px-2 text-xs text-navy">
                  <option value="">All years</option>
                  {statementYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-navy px-3 text-xs font-semibold text-white hover:bg-navy-800">
                  <Icon name="filter_alt" size={15} /> Filter
                </button>
                {(soa_month || soa_year) && (
                  <Link href="/dashboard/owner#statements" className="text-xs font-medium text-slate hover:text-navy">Clear</Link>
                )}
              </form>
            }
          >
            {statements.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate">No statements published yet.</p>
            ) : filteredStatements.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate">No statements match this filter.</p>
            ) : (
              <div className="space-y-5">
                {statementArchive.map((archive) => (
                  <section key={archive.year}>
                    <div className="mb-2 flex items-center gap-2">
                      <Icon name="archive" size={16} className="text-slate" />
                      <h3 className="text-sm font-semibold text-navy">{archive.year} Archive</h3>
                    </div>
                    <ul className="divide-y divide-line">
                      {archive.items.map((s) => {
                        const payout = Number(s.closing_balance ?? s.net_remittance ?? 0);
                        const badge = PAYOUT_BADGE[s.payout_status ?? "pending"];
                        const needsPay = payout < 0 && s.status === "published" && s.payout_status !== "collected";
                        return (
                          <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-navy/5 text-navy-700">
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

                              {needsPay && (
                                <form action="/api/payments/create-from-soa" method="POST" className="contents">
                                  <input type="hidden" name="soa_id" value={s.id} />
                                  <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-error px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90" formAction="/api/payments/create-from-soa">
                                    <Icon name="credit_card" size={14} /> Pay Balance
                                  </button>
                                </form>
                              )}

                              {slipUrls[s.id] && (
                                <a href={slipUrls[s.id]} target="_blank" rel="noopener noreferrer" className="flex size-8 items-center justify-center rounded-md text-available hover:bg-surface-gray" title="View bank deposit / remittance slip">
                                  <Icon name="account_balance" size={18} />
                                </a>
                              )}

                              {s.status === "published" && (
                                <Link href={`/dashboard/owner/statements/${s.id}`} aria-label="View SOA" className="flex size-8 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-navy" title="View SOA">
                                  <Icon name="visibility" size={18} />
                                </Link>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
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
                      <div className="mt-4 border-t border-line pt-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="label-caps text-slate">Unit List</p>
                          <Icon name="door_front" size={15} className="text-slate" />
                        </div>
                        {units.length === 0 ? (
                          <p className="rounded-md bg-surface-gray px-3 py-2 text-xs text-slate">No units added yet.</p>
                        ) : (
                          <ul className="max-h-56 divide-y divide-line overflow-y-auto pr-1">
                            {units.map((unit) => {
                              const specs = [
                                unit.bedrooms != null ? `${unit.bedrooms} bed` : null,
                                unit.bathrooms != null ? `${unit.bathrooms} bath` : null,
                                unit.floor_area != null ? `${Math.round(Number(unit.floor_area))} sqm` : null,
                              ].filter(Boolean);
                              return (
                                <li key={unit.id} className="py-2 first:pt-0 last:pb-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-navy">{unit.unit_label}</p>
                                      <p className="mt-0.5 text-xs text-slate">
                                        {specs.length > 0 ? specs.join(" · ") : "Specs not set"}
                                      </p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${UNIT_STATUS_TONE[unit.status] ?? "bg-surface-gray text-slate"}`}>
                                      {unit.status}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs font-medium text-navy">
                                    {unit.base_rent != null ? `${peso(Number(unit.base_rent))} monthly rent` : "Rent not set"}
                                  </p>
                                </li>
                              );
                            })}
                          </ul>
                        )}
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

      {previewStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/55 p-4">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-lg border border-line bg-surface shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="label-caps text-gold">SOA Preview</p>
                <h2 className="mt-1 font-display text-xl font-bold text-navy">
                  {previewStatement.period_start} to {previewStatement.period_end}
                </h2>
                <p className="mt-1 text-sm text-slate">
                  Remittance due: {previewStatement.payout_due_at ?? "Not set"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {previewStatement.pdf_path && (
                  <a href={`/api/portal/soa/${previewStatement.id}?download=1`} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:bg-surface-gray">
                    <Icon name="download" size={15} /> Download
                  </a>
                )}
                <Link href={statementHref()} className="flex size-8 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-navy" aria-label="Close SOA preview">
                  <Icon name="close" size={18} />
                </Link>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto">
              <section>
                <div className="bg-[#dbeafe] px-5 py-2.5 text-sm font-bold text-[#1a56db]">Income</div>
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-line">
                    {previewIncomeLines.length === 0 ? (
                      <tr><td colSpan={2} className="px-5 py-4 text-center text-slate">No income recorded for this period.</td></tr>
                    ) : previewIncomeLines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-5 py-3 text-ink">{line.description}</td>
                        <td className="px-5 py-3 text-right font-medium text-navy">{peso(Number(line.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#dbeafe]">
                      <td className="px-5 py-3 font-bold text-navy">Total Income</td>
                      <td className="px-5 py-3 text-right font-bold text-navy">{peso(Number(previewStatement.total_payments ?? previewIncome))}</td>
                    </tr>
                  </tfoot>
                </table>
              </section>

              <section>
                <div className="bg-[#fee2e2] px-5 py-2.5 text-sm font-bold text-[#e02424]">Deductions</div>
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-line">
                    {previewDeductionLines.length === 0 ? (
                      <tr><td colSpan={3} className="px-5 py-4 text-center text-slate">No deductions recorded for this period.</td></tr>
                    ) : previewDeductionLines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-5 py-3 text-ink">{line.description}</td>
                        <td className="px-5 py-3 text-xs text-slate">{line.billing_note ?? ""}</td>
                        <td className="px-5 py-3 text-right font-medium text-navy">{peso(Math.abs(Number(line.amount)))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#fee2e2]">
                      <td colSpan={2} className="px-5 py-3 font-bold text-navy">Total Deductions</td>
                      <td className="px-5 py-3 text-right font-bold text-navy">{peso(Number(previewStatement.total_expenses ?? previewDeductions))}</td>
                    </tr>
                  </tfoot>
                </table>
              </section>

              <div className="border-t-2 border-navy bg-surface-gray px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-display text-lg font-bold text-navy">Net Remittance</span>
                  <span className={`font-display text-2xl font-bold ${previewNet < 0 ? "text-error" : "text-navy"}`}>{peso(previewNet)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
