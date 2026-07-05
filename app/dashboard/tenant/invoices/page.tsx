import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, Panel, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";
import { MONTH_OPTIONS, archiveByYear, availableYears, filterByMonthYear } from "@/lib/portal/document-filters";

export const metadata: Metadata = { title: "My Invoices", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Dashboard",  icon: "dashboard",    href: "/dashboard/tenant" },
  { label: "My Lease",   icon: "description",  href: "/dashboard/tenant#lease" },
  { label: "Invoices",   icon: "request_quote",href: "/dashboard/tenant/invoices" },
  { label: "Payments",   icon: "payments",     href: "/dashboard/tenant#payments" },
  { label: "Statements", icon: "receipt_long", href: "/dashboard/tenant#statements" },
];

const peso = (n: number) => `₱${Math.round(Number(n)).toLocaleString("en-PH")}`;

const STATUS_STYLES: Record<string, { color: string; icon: string }> = {
  draft:          { color: "text-slate",       icon: "draft" },
  issued:         { color: "text-navy-700",    icon: "receipt" },
  partially_paid: { color: "text-gold-bright", icon: "pending" },
  paid:           { color: "text-available",   icon: "check_circle" },
  overdue:        { color: "text-sold",        icon: "warning" },
  voided:         { color: "text-slate",       icon: "block" },
};

type Invoice = {
  id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  status: string;
};

export default async function TenantInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice_month?: string; invoice_year?: string }>;
}) {
  const { invoice_month, invoice_year } = await searchParams;
  const { role, tenantId } = await getCurrentRole();
  if (role !== "tenant") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: invoiceData }, { data: tenantRow }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id,invoice_number,billing_period_start,billing_period_end,due_date,total_amount,amount_paid,status")
      .order("due_date", { ascending: false }),
    supabase.from("tenants").select("name").eq("id", tenantId ?? "").maybeSingle(),
  ]);

  const invoices = (invoiceData ?? []) as Invoice[];
  const tenantName = (tenantRow as { name?: string } | null)?.name ?? "Tenant";
  const invoiceYears = availableYears(invoices, (i) => i.billing_period_end);
  const filteredInvoices = filterByMonthYear(invoices, (i) => i.billing_period_end, invoice_month, invoice_year);
  const invoiceArchive = archiveByYear(filteredInvoices, (i) => i.billing_period_end);

  const outstanding = invoices.filter((i) => i.status === "issued" || i.status === "overdue" || i.status === "partially_paid");
  const totalBalance = outstanding.reduce((sum, i) => sum + Number(i.total_amount) - Number(i.amount_paid), 0);

  return (
    <DashboardShell role="Tenant" nav={nav} userName={tenantName}>
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">My Invoices</h1>
            <p className="mt-1 text-sm text-slate">
              {invoices.length} total
              {outstanding.length > 0 && ` · ${outstanding.length} outstanding`}
            </p>
          </div>
          {outstanding.length > 0 && (
            <div className="rounded-lg border border-sold/20 bg-sold/5 px-4 py-2.5 text-sm">
              <span className="text-slate">Total balance due: </span>
              <span className="font-bold text-navy">{peso(totalBalance)}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {invoices.length === 0 ? (
            <Panel title="No invoices yet">
              <p className="py-4 text-center text-sm text-slate">
                No invoices have been issued yet. Contact your property manager if you have questions.
              </p>
            </Panel>
          ) : filteredInvoices.length === 0 ? (
            <Panel
              title="Invoices"
              action={
                <form className="flex flex-wrap items-center gap-2">
                  <select name="invoice_month" defaultValue={invoice_month ?? ""} className="h-9 rounded-md border border-line bg-surface px-2 text-xs text-navy">
                    <option value="">All months</option>
                    {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select name="invoice_year" defaultValue={invoice_year ?? ""} className="h-9 rounded-md border border-line bg-surface px-2 text-xs text-navy">
                    <option value="">All years</option>
                    {invoiceYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                  <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-navy px-3 text-xs font-semibold text-white hover:bg-navy-800">
                    <Icon name="filter_alt" size={15} /> Filter
                  </button>
                  <Link href="/dashboard/tenant/invoices" className="text-xs font-medium text-slate hover:text-navy">Clear</Link>
                </form>
              }
            >
              <p className="py-4 text-center text-sm text-slate">No invoices match this filter.</p>
            </Panel>
          ) : (
            <Panel
              title="Invoice Archive"
              action={
                <form className="flex flex-wrap items-center gap-2">
                  <select name="invoice_month" defaultValue={invoice_month ?? ""} className="h-9 rounded-md border border-line bg-surface px-2 text-xs text-navy">
                    <option value="">All months</option>
                    {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select name="invoice_year" defaultValue={invoice_year ?? ""} className="h-9 rounded-md border border-line bg-surface px-2 text-xs text-navy">
                    <option value="">All years</option>
                    {invoiceYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                  <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-navy px-3 text-xs font-semibold text-white hover:bg-navy-800">
                    <Icon name="filter_alt" size={15} /> Filter
                  </button>
                  {(invoice_month || invoice_year) && (
                    <Link href="/dashboard/tenant/invoices" className="text-xs font-medium text-slate hover:text-navy">Clear</Link>
                  )}
                </form>
              }
            >
              <div className="space-y-5">
                {invoiceArchive.map((archive) => (
                  <section key={archive.year}>
                    <div className="mb-2 flex items-center gap-2">
                      <Icon name="archive" size={16} className="text-slate" />
                      <h2 className="text-sm font-semibold text-navy">{archive.year} Archive</h2>
                    </div>
                    <div className="space-y-4">
                      {archive.items.map((inv) => {
                        const style = STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft;
                        const balance = Number(inv.total_amount) - Number(inv.amount_paid);
                        const payable = inv.status === "issued" || inv.status === "overdue" || inv.status === "partially_paid";
                        return (
                          <div key={inv.id} className="rounded-lg border border-line bg-surface-gray/40 p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <span className={`mt-0.5 ${style.color}`}>
                                  <Icon name={style.icon} size={22} fill={1} />
                                </span>
                                <div>
                                  <p className="font-display text-base font-semibold text-navy">{inv.invoice_number}</p>
                                  <p className="mt-0.5 text-sm text-slate">{inv.billing_period_start} → {inv.billing_period_end}</p>
                                  <p className="mt-0.5 text-xs text-slate">Due {inv.due_date}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-display text-lg font-bold text-navy">{peso(inv.total_amount)}</p>
                                {Number(inv.amount_paid) > 0 && balance > 0 && (
                                  <p className="text-xs text-slate">Balance: {peso(balance)}</p>
                                )}
                                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${style.color}`}>
                                  {inv.status.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                              <p className="text-sm text-slate">{payable ? "Payment due" : "Invoice document"}</p>
                              <div className="flex gap-2">
                                <Link href={`/dashboard/tenant/invoices/${inv.id}`} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-navy hover:bg-surface-gray press">
                                  <Icon name="visibility" size={16} /> View
                                </Link>
                                {payable && (
                                  <Link href={`/dashboard/tenant/invoices/${inv.id}/pay`} className="inline-flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 press">
                                    <Icon name="payments" size={16} /> Pay now
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <div className="mt-8 rounded-lg border border-line bg-surface-gray p-4 text-center text-sm text-slate">
          Questions about an invoice?{" "}
          <Link href="/contact" className="font-medium text-navy-700 hover:text-gold">
            Contact All Abode
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
