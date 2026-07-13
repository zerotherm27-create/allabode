import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { LeaseForm, type LeaseValues } from "@/components/admin/pm-forms";
import { updateLease } from "@/app/admin/pm-actions";
import { recordPaymentOnLease, updatePayment, deletePayment, voidInvoice } from "@/app/admin/invoice-actions";
import { recordDeposit, recordCommission, updateCommission, waiveCommission } from "@/app/admin/security-deposit-actions";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { createClient } from "@/lib/supabase/server";
import { inputCls } from "@/components/admin/form-kit";

const peso = (n: number | string) => `₱${Math.round(Number(n)).toLocaleString("en-PH")}`;

const INVOICE_STATUS_COLOR: Record<string, string> = {
  draft:          "bg-surface-gray text-slate",
  issued:         "bg-navy/5 text-navy-700",
  partially_paid: "bg-gold/10 text-gold-bright",
  paid:           "bg-available/10 text-available",
  overdue:        "bg-error-bg text-error",
  voided:         "bg-surface-gray text-slate line-through",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Cash", bank_transfer: "Bank Transfer", gcash: "GCash",
  maya: "Maya", check: "Check", online: "Online", other: "Other",
};

type UnitOpt = { id: string; unit_label: string; properties: { name: string } | { name: string }[] | null };

type InvoiceRow = {
  id: string; invoice_number: string; billing_period_start: string;
  billing_period_end: string; due_date: string; status: string;
  total_amount: number; amount_paid: number; voided_at: string | null;
};

type PaymentRow = {
  id: string; amount: number; method: string; reference: string | null;
  received_at: string; status: string; notes: string | null;
};

export default async function EditLeasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editPayment?: string; editComm?: string }>;
}) {
  const { id } = await params;
  const { editPayment, editComm } = await searchParams;
  const supabase = await createClient();
  const [{ data: row }, { data: unitData }, { data: tenantData }, { data: invoiceData }, { data: paymentData }, { data: depositData }, { data: commData }] =
    await Promise.all([
      supabase.from("leases").select("*").eq("id", id).maybeSingle(),
      supabase.from("units").select("id,unit_label,properties(name)").order("created_at", { ascending: false }),
      supabase.from("tenants").select("id,name").order("name"),
      supabase.from("invoices")
        .select("id,invoice_number,billing_period_start,billing_period_end,due_date,status,total_amount,amount_paid,voided_at")
        .eq("lease_id", id).order("created_at", { ascending: false }),
      supabase.from("payments")
        .select("id,amount,method,reference,received_at,status,notes")
        .eq("lease_id", id).order("received_at", { ascending: false }),
      supabase.from("security_deposits")
        .select("id,deposit_type,months_held,amount_held,received_at,status,returned_amount,forfeited_amount,payment_method")
        .eq("lease_id", id).order("created_at", { ascending: false }),
      supabase.from("lease_commissions")
        .select("id,commission_type,description,amount,status,applied_at")
        .eq("lease_id", id).order("created_at", { ascending: false }),
    ]);

  if (!row) notFound();

  type DepositRow = { id: string; deposit_type: string; months_held: number; amount_held: number; received_at: string; status: string; returned_amount: number | null; forfeited_amount: number | null; payment_method: string | null };
  type CommissionRow = { id: string; commission_type: string; description: string | null; amount: number; status: string; applied_at: string | null };

  const initial    = row as LeaseValues;
  const deposits   = (depositData ?? []) as DepositRow[];
  const commissions = (commData ?? []) as CommissionRow[];
  const units = ((unitData ?? []) as UnitOpt[]).map((u) => {
    const p = Array.isArray(u.properties) ? u.properties[0] : u.properties;
    return { id: u.id, label: `${p?.name ?? "Property"} — ${u.unit_label}` };
  });
  const tenants = ((tenantData ?? []) as { id: string; name: string }[]).map((t) => ({ id: t.id, label: t.name }));
  const invoices = (invoiceData ?? []) as InvoiceRow[];
  const payments = (paymentData ?? []) as PaymentRow[];

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/admin/leases" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
          <Icon name="arrow_back" size={18} /> Back to leases
        </Link>
        <h1 className="font-display text-2xl font-bold text-navy">Edit lease</h1>
      </div>

      {/* ── Lease form ── */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <LeaseForm action={updateLease.bind(null, id)} initial={initial} units={units} tenants={tenants} />
      </div>

      {/* ── Invoices ── */}
      <div className="rounded-lg border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-semibold text-navy">Invoices</h2>
          <Link href={`/admin/invoices/new?lease_id=${id}`} className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-navy-800 press">
            <Icon name="add" size={16} /> New invoice
          </Link>
        </div>
        {invoices.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate">No invoices yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-gray">
              <tr>
                <th className="px-4 py-2.5 font-medium text-slate">Invoice #</th>
                <th className="px-4 py-2.5 font-medium text-slate">Period</th>
                <th className="px-4 py-2.5 font-medium text-slate">Due</th>
                <th className="px-4 py-2.5 font-medium text-slate text-right">Amount</th>
                <th className="px-4 py-2.5 font-medium text-slate">Status</th>
                <th className="px-4 py-2.5 font-medium text-slate text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/invoices/${inv.id}`} className="font-medium text-navy hover:text-navy-700">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate">{inv.billing_period_start} → {inv.billing_period_end}</td>
                  <td className="px-4 py-3 text-slate">{inv.due_date}</td>
                  <td className="px-4 py-3 text-right font-medium text-navy">{peso(inv.total_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${INVOICE_STATUS_COLOR[inv.status] ?? "bg-surface-gray text-slate"}`}>
                      {inv.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/invoices/${inv.id}`} aria-label="View" className="flex h-8 w-8 items-center justify-center rounded-md text-navy hover:bg-surface-gray press">
                        <Icon name="open_in_new" size={16} />
                      </Link>
                      {inv.status !== "voided" && (
                        <form action={voidInvoice.bind(null, inv.id)}>
                          <button type="submit" aria-label="Void" title="Void invoice" className="flex h-8 w-8 items-center justify-center rounded-md text-error hover:bg-error-bg">
                            <Icon name="block" size={16} />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Payments ── */}
      <div className="rounded-lg border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-semibold text-navy">Payments received</h2>
          <p className="mt-0.5 text-xs text-slate">Verified payments on this lease — used as rental income in the SOA.</p>
        </div>

        {/* Record payment form */}
        <form action={recordPaymentOnLease.bind(null, id)} className="grid grid-cols-2 gap-3 border-b border-line p-5 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate">Amount</label>
            <input name="amount" type="number" step="0.01" min="0" defaultValue={Number(row.rent_amount)} required className={inputCls} placeholder="Amount" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate">Method</label>
            <select name="method" className={inputCls}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate">Date received</label>
            <input name="received_at" type="date" defaultValue={today} required className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate">Reference</label>
            <input name="reference" type="text" className={inputCls} placeholder="Optional" />
          </div>
          <div className="col-span-2 md:col-span-4">
            <label className="mb-1 block text-xs font-medium text-slate">Payment for</label>
            <input name="payment_for" type="text" className={inputCls} placeholder="e.g. 1 month advance rental and 2 months security deposit" />
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate">Notes</label>
            <input name="notes" type="text" className={inputCls} placeholder="Internal notes (not shown on receipt)" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
              <Icon name="add" size={16} /> Record
            </button>
          </div>
        </form>

        {/* Inline edit panel for a payment */}
        {editPayment && (() => {
          const p = payments.find((x) => x.id === editPayment);
          if (!p) return null;
          return (
            <form action={updatePayment.bind(null, p.id, id)}
              className="m-4 rounded-lg border border-navy/20 bg-surface-gray p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy">
                Editing payment — {p.received_at}
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-slate">Amount</label>
                  <input name="amount" type="number" step="0.01" min="0" defaultValue={p.amount} required className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate">Method</label>
                  <select name="method" defaultValue={p.method} className={inputCls}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="gcash">GCash</option>
                    <option value="maya">Maya</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate">Date received</label>
                  <input name="received_at" type="date" defaultValue={p.received_at} required className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate">Reference</label>
                  <input name="reference" type="text" defaultValue={p.reference ?? ""} className={inputCls} />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-slate">Notes</label>
                  <input name="notes" type="text" defaultValue={p.notes ?? ""} className={inputCls} />
                </div>
                <div className="flex items-end gap-2">
                  <button type="submit" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-navy px-3 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
                    <Icon name="save" size={16} /> Save
                  </button>
                  <Link href={`/admin/leases/${id}/edit`}
                    className="inline-flex items-center justify-center rounded-md border border-line px-3 py-2.5 text-sm text-slate hover:bg-surface-gray">
                    Cancel
                  </Link>
                </div>
              </div>
            </form>
          );
        })()}

        {/* Payments list */}
        {payments.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate">No payments recorded yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-gray">
              <tr>
                <th className="px-4 py-2.5 font-medium text-slate">Date</th>
                <th className="px-4 py-2.5 font-medium text-slate text-right">Amount</th>
                <th className="px-4 py-2.5 font-medium text-slate">Method</th>
                <th className="px-4 py-2.5 font-medium text-slate">Reference</th>
                <th className="px-4 py-2.5 font-medium text-slate">Notes</th>
                <th className="px-4 py-2.5 font-medium text-slate text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.map((p) => (
                <tr key={p.id} className={editPayment === p.id ? "bg-navy/5" : ""}>
                  <td className="px-4 py-3 text-slate">{p.received_at}</td>
                  <td className="px-4 py-3 text-right font-semibold text-navy">{peso(p.amount)}</td>
                  <td className="px-4 py-3 text-slate">{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</td>
                  <td className="px-4 py-3 text-slate">{p.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-slate">{p.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/leases/${id}/edit?editPayment=${p.id}`}
                        aria-label="Edit payment"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-navy-700 hover:bg-surface-gray">
                        <Icon name="edit" size={16} />
                      </Link>
                      <form action={deletePayment.bind(null, p.id, id)}>
                        <button type="submit" aria-label="Delete payment" className="flex h-8 w-8 items-center justify-center rounded-md text-error hover:bg-error-bg">
                          <Icon name="delete" size={16} />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* ── Security Deposit / Advance Rent ── */}
      <div className="rounded-lg border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-navy">Security Deposit &amp; Advance Rent</h2>
            <p className="mt-0.5 text-xs text-slate">
              Held by AllAbode at lease signing. The Security Deposit funds the lease&#x2019;s first owner
              remittance (minus commission and other expenses); the Advance Rent is held and shown only as a
              note — it never enters the owner&#x2019;s payout math.
            </p>
          </div>
          {deposits.length > 0 && (
            <Link href={`/admin/security-deposits/${deposits[0].id}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-medium text-navy hover:bg-surface-gray">
              <Icon name="open_in_new" size={14} /> Manage
            </Link>
          )}
        </div>

        {/* Record form — record one entry per amount (security deposit, then advance rent) */}
        <form action={recordDeposit.bind(null, id)}
          className="grid grid-cols-2 gap-3 border-b border-line p-5 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate">Type</label>
            <select name="deposit_type" className={inputCls}>
              <option value="security">Security Deposit</option>
              <option value="advance">Advance Rent</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate">Months</label>
            <input name="months_held" type="number" step="0.5" min="1" defaultValue="2" required className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate">Total amount (₱)</label>
            <input name="amount_held" type="number" step="0.01" min="0"
              defaultValue={Number(row.rent_amount) * 2} required className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate">Received date</label>
            <input name="received_at" type="date" defaultValue={today} required className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate">Method</label>
            <select name="payment_method" className={inputCls}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-2 md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate">Notes</label>
            <input name="notes" type="text" className={inputCls} placeholder="Optional" />
          </div>
          <div className="flex items-end">
            <button type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
              <Icon name="add" size={16} /> Record
            </button>
          </div>
        </form>

        {/* Existing deposits */}
        {deposits.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-gray">
              <tr>
                <th className="px-4 py-2.5 font-medium text-slate">Type</th>
                <th className="px-4 py-2.5 font-medium text-slate">Received</th>
                <th className="px-4 py-2.5 font-medium text-slate text-right">Amount held</th>
                <th className="px-4 py-2.5 font-medium text-slate">Months</th>
                <th className="px-4 py-2.5 font-medium text-slate">Method</th>
                <th className="px-4 py-2.5 font-medium text-slate">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {deposits.map((dep) => (
                <tr key={dep.id}>
                  <td className="px-4 py-3 text-slate">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${dep.deposit_type === "advance" ? "bg-gold/10 text-gold-bright" : "bg-navy/5 text-navy-700"}`}>
                      {dep.deposit_type === "advance" ? "Advance Rent" : "Security Deposit"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate">{dep.received_at}</td>
                  <td className="px-4 py-3 text-right font-semibold text-navy">
                    ₱{Math.round(dep.amount_held).toLocaleString("en-PH")}
                  </td>
                  <td className="px-4 py-3 text-slate">{dep.months_held}×</td>
                  <td className="px-4 py-3 text-slate capitalize">{(dep.payment_method ?? "—").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      dep.status === "held" ? "bg-reserved/10 text-reserved" :
                      dep.status === "returned" ? "bg-available/10 text-available" :
                      dep.status === "forfeited" ? "bg-error-bg text-error" :
                      "bg-gold/10 text-gold-bright"
                    }`}>
                      {dep.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-6 text-center text-sm text-slate">No deposit recorded yet.</p>
        )}
      </div>

      {/* ── Commissions ── */}
      <div className="rounded-lg border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-semibold text-navy">Lease Commission</h2>
          <p className="mt-0.5 text-xs text-slate">
            Pending commissions are automatically deducted from the owner&apos;s next SOA for this lease.
          </p>
        </div>

        {/* Record commission form */}
        <form action={recordCommission.bind(null, id)}
          className="grid grid-cols-2 gap-3 border-b border-line p-5 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate">Type</label>
            <select name="commission_type" className={inputCls}>
              <option value="new_lease">New lease</option>
              <option value="renewal">Renewal</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate">Amount (₱)</label>
            <input name="amount" type="number" step="0.01" min="0"
              defaultValue={Number(row.rent_amount)} required className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate">Description (optional)</label>
            <input name="description" type="text" className={inputCls} placeholder="e.g. 1 month lease commission" />
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate">Notes</label>
            <input name="notes" type="text" className={inputCls} placeholder="Optional" />
          </div>
          <div className="flex items-end">
            <button type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
              <Icon name="add" size={16} /> Record
            </button>
          </div>
        </form>

        {/* Inline edit panel for a commission */}
        {editComm && (() => {
          const c = commissions.find((x) => x.id === editComm);
          if (!c || c.status !== "pending") return null;
          return (
            <form action={updateCommission.bind(null, c.id, id)}
              className="m-4 rounded-lg border border-navy/20 bg-surface-gray p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy">
                Editing commission
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate">Type</label>
                  <select name="commission_type" defaultValue={c.commission_type} className={inputCls}>
                    <option value="new_lease">New lease</option>
                    <option value="renewal">Renewal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate">Amount (₱)</label>
                  <input name="amount" type="number" step="0.01" min="0" defaultValue={c.amount} required className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate">Description</label>
                  <input name="description" type="text" defaultValue={c.description ?? ""} className={inputCls} />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-slate">Notes</label>
                  <input name="notes" type="text" className={inputCls} placeholder="Optional" />
                </div>
                <div className="flex items-end gap-2">
                  <button type="submit" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-navy px-3 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
                    <Icon name="save" size={16} /> Save
                  </button>
                  <Link href={`/admin/leases/${id}/edit`}
                    className="inline-flex items-center justify-center rounded-md border border-line px-3 py-2.5 text-sm text-slate hover:bg-surface-gray">
                    Cancel
                  </Link>
                </div>
              </div>
            </form>
          );
        })()}

        {/* Commissions list */}
        {commissions.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate">No commissions recorded yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-gray">
              <tr>
                <th className="px-4 py-2.5 font-medium text-slate">Description</th>
                <th className="px-4 py-2.5 font-medium text-slate text-right">Amount</th>
                <th className="px-4 py-2.5 font-medium text-slate">Status</th>
                <th className="px-4 py-2.5 font-medium text-slate">Applied</th>
                <th className="px-4 py-2.5 font-medium text-slate text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {commissions.map((c) => (
                <tr key={c.id} className={editComm === c.id ? "bg-navy/5" : ""}>
                  <td className="px-4 py-3 text-ink">
                    {c.description ?? c.commission_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-navy">
                    ₱{Math.round(c.amount).toLocaleString("en-PH")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      c.status === "pending" ? "bg-reserved/10 text-reserved" :
                      c.status === "applied" ? "bg-available/10 text-available" :
                      "bg-surface-gray text-slate"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate text-xs">
                    {c.applied_at ? new Date(c.applied_at).toLocaleDateString("en-PH") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status === "pending" && (
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/leases/${id}/edit?editComm=${c.id}`}
                          aria-label="Edit commission"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-navy-700 hover:bg-surface-gray">
                          <Icon name="edit" size={16} />
                        </Link>
                      <ConfirmActionForm
                        action={waiveCommission.bind(null, c.id)}
                        message="Waive this commission? It will no longer appear on the SOA."
                      >
                        <button type="submit"
                          className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-slate hover:bg-surface-gray">
                          Waive
                        </button>
                      </ConfirmActionForm>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
