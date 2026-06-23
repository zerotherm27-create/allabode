import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, Panel, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";

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

export default async function TenantInvoicesPage() {
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
          ) : (
            invoices.map((inv) => {
              const style = STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft;
              const balance = Number(inv.total_amount) - Number(inv.amount_paid);
              return (
                <div
                  key={inv.id}
                  className="rounded-lg border border-line bg-surface p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 ${style.color}`}>
                        <Icon name={style.icon} size={22} fill={1} />
                      </span>
                      <div>
                        <p className="font-display text-base font-semibold text-navy">
                          {inv.invoice_number}
                        </p>
                        <p className="mt-0.5 text-sm text-slate">
                          {inv.billing_period_start} → {inv.billing_period_end}
                        </p>
                        <p className="mt-0.5 text-xs text-slate">
                          Due {inv.due_date}
                        </p>
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
                  {(inv.status === "issued" || inv.status === "overdue" || inv.status === "partially_paid") && (
                    <div className="mt-4 border-t border-line pt-4">
                      <p className="text-sm text-slate">
                        To pay, please contact your property manager or use the payment method provided.
                      </p>
                    </div>
                  )}
                </div>
              );
            })
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
