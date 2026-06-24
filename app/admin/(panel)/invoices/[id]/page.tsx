import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { issueInvoice, voidInvoice, recordPaymentOnInvoice } from "@/app/admin/invoice-actions";
import { inputCls } from "@/components/admin/form-kit";

const peso = (n: number | string) => `₱${Math.round(Number(n)).toLocaleString("en-PH")}`;

const STATUS_COLORS: Record<string, string> = {
  draft:          "bg-surface-gray text-slate",
  issued:         "bg-navy/5 text-navy-700",
  partially_paid: "bg-gold/10 text-gold-bright",
  paid:           "bg-available/10 text-available",
  overdue:        "bg-sold/10 text-sold",
  voided:         "bg-surface-gray text-slate",
};

const PAYMENT_METHODS = ["cash", "bank_transfer", "gcash", "maya", "check", "other"];

type Line = { id: string; description: string; quantity: number; unit_price: number; amount: number };
type Invoice = {
  id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  notes: string | null;
  issued_at: string | null;
  voided_at: string | null;
  created_at: string;
  tenants: { name: string; email: string } | null;
  units: { unit_label: string; properties: { name: string; address: string | null } | null } | null;
  invoice_lines: Line[];
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select(`
      id, invoice_number, billing_period_start, billing_period_end, due_date,
      status, subtotal, tax_amount, total_amount, amount_paid,
      notes, issued_at, voided_at, created_at,
      tenants(name,email),
      units(unit_label,properties(name,address)),
      invoice_lines(id,description,quantity,unit_price,amount,sort_order)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const inv = data as unknown as Invoice;
  const unit = Array.isArray(inv.units) ? inv.units[0] : inv.units;
  const property = unit ? (Array.isArray((unit as { properties: unknown }).properties) ? ((unit as { properties: { name: string; address: string | null }[] }).properties)[0] : (unit as { properties: { name: string; address: string | null } | null }).properties) : null;
  const tenant = Array.isArray(inv.tenants) ? inv.tenants[0] : inv.tenants;
  const lines = (Array.isArray(inv.invoice_lines) ? inv.invoice_lines : []).sort((a, b) => (a as unknown as { sort_order: number }).sort_order - (b as unknown as { sort_order: number }).sort_order);
  const balance = Number(inv.total_amount) - Number(inv.amount_paid);
  const canIssue = inv.status === "draft";
  const canVoid  = inv.status !== "voided" && inv.status !== "paid";
  const canPay   = inv.status === "issued" || inv.status === "partially_paid" || inv.status === "overdue";
  const recordPayment = recordPaymentOnInvoice.bind(null, id);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/invoices" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to invoices
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">{inv.invoice_number}</h1>
          <p className="mt-1 text-sm text-slate">
            {(tenant as { name?: string } | null)?.name} · {(unit as { unit_label?: string } | null)?.unit_label}
            {(property as { name?: string } | null)?.name ? `, ${(property as { name: string }).name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_COLORS[inv.status] ?? "bg-surface-gray text-slate"}`}>
            {inv.status.replace(/_/g, " ")}
          </span>
          {canIssue && (
            <form action={issueInvoice.bind(null, id)}>
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
                <Icon name="send" size={16} /> Issue
              </button>
            </form>
          )}
          <a
            href={`/api/admin/invoices/${id}/pdf`}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-4 py-2 text-sm font-medium text-navy hover:bg-surface-gray"
          >
            <Icon name="download" size={16} /> PDF
          </a>
          {canVoid && !canIssue && (
            <form action={voidInvoice.bind(null, id)}>
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-md border border-error px-4 py-2 text-sm font-medium text-error hover:bg-error-bg">
                <Icon name="block" size={16} /> Void
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left: invoice detail */}
        <div className="flex flex-col gap-6">
          {/* Meta */}
          <div className="rounded-lg border border-line bg-surface p-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ["Billing period", `${inv.billing_period_start} → ${inv.billing_period_end}`],
                ["Due date",       inv.due_date],
                ["Issued",         inv.issued_at ? inv.issued_at.slice(0, 10) : "—"],
                ["Created",        inv.created_at.slice(0, 10)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-slate">{k}</dt>
                  <dd className="mt-0.5 font-medium text-navy">{v}</dd>
                </div>
              ))}
            </dl>
            {inv.notes && (
              <p className="mt-4 rounded-md bg-surface-gray px-4 py-2.5 text-sm text-slate">
                {inv.notes}
              </p>
            )}
          </div>

          {/* Line items */}
          <div className="rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-sm font-semibold text-navy">Line items</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-gray text-left text-xs text-slate">
                  <th className="px-5 py-2.5 font-medium">Description</th>
                  <th className="px-5 py-2.5 font-medium text-right">Qty</th>
                  <th className="px-5 py-2.5 font-medium text-right">Unit price</th>
                  <th className="px-5 py-2.5 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 text-ink">{line.description}</td>
                    <td className="px-5 py-3 text-right text-slate">{Number(line.quantity)}</td>
                    <td className="px-5 py-3 text-right text-slate">{peso(line.unit_price)}</td>
                    <td className="px-5 py-3 text-right font-medium text-navy">{peso(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-gray">
                  <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold text-navy">Total</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-navy">{peso(inv.total_amount)}</td>
                </tr>
                {Number(inv.amount_paid) > 0 && (
                  <>
                    <tr>
                      <td colSpan={3} className="px-5 py-2 text-right text-sm text-slate">Paid</td>
                      <td className="px-5 py-2 text-right text-sm font-medium text-available">− {peso(inv.amount_paid)}</td>
                    </tr>
                    <tr className="border-t border-line">
                      <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold text-navy">Balance due</td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-navy">{peso(balance)}</td>
                    </tr>
                  </>
                )}
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right: record payment */}
        {canPay && (
          <div className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-display text-sm font-semibold text-navy">Record payment</h2>
            <p className="mt-1 text-xs text-slate">Balance due: {peso(balance)}</p>
            <form action={recordPayment} className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-navy">Amount (₱)</span>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balance}
                  defaultValue={balance}
                  required
                  className={inputCls}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-navy">Method</span>
                <select name="method" className={inputCls}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m.replace("_", " ")}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-navy">Notes</span>
                <input name="notes" className={inputCls} placeholder="Reference # etc." />
              </label>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-available px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                <Icon name="check_circle" size={18} /> Record payment
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
