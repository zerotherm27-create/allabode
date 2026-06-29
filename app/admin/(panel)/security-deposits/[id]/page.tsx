import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { processDepositReturn, processDepositForfeiture, deleteDeposit } from "@/app/admin/security-deposit-actions";
import { inputCls } from "@/components/admin/form-kit";

const peso = (n: number) =>
  `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const STATUS_COLOR: Record<string, string> = {
  held:               "bg-reserved/10 text-reserved",
  partially_returned: "bg-gold/10 text-gold-bright",
  returned:           "bg-available/10 text-available",
  forfeited:          "bg-error-bg text-error",
};

type Deduction = { description: string; amount: number };

export default async function DepositDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dep } = await supabase
    .from("security_deposits")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!dep) notFound();

  type Dep = {
    id: string; lease_id: string; tenant_id: string | null; owner_id: string | null; unit_id: string | null;
    months_held: number; amount_held: number; received_at: string; payment_method: string | null;
    status: string; returned_amount: number | null; return_deductions: Deduction[] | null;
    returned_at: string | null; return_notes: string | null;
    forfeited_amount: number | null; forfeiture_reason: string | null; forfeited_at: string | null;
    notes: string | null;
  };
  const d = dep as Dep;

  const [{ data: tenantRow }, { data: unitRow }] = await Promise.all([
    d.tenant_id ? supabase.from("tenants").select("name,email,phone").eq("id", d.tenant_id).maybeSingle() : { data: null },
    d.unit_id   ? supabase.from("units").select("unit_label,properties(name,owners(name))").eq("id", d.unit_id).maybeSingle() : { data: null },
  ]);

  const tenant = tenantRow as { name?: string; email?: string; phone?: string } | null;
  const unit   = unitRow   as { unit_label?: string; properties?: { name?: string; owners?: { name?: string } | null } | null } | null;
  const prop   = unit?.properties;
  const owner  = Array.isArray(prop?.owners) ? prop?.owners[0] : prop?.owners;

  const today = new Date().toISOString().slice(0, 10);
  const deductions = (d.return_deductions ?? []) as Deduction[];
  const dedTotal   = deductions.reduce((s, x) => s + x.amount, 0);
  const btn = "inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/security-deposits" className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to deposits
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-caps text-gold">Security Deposit</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-navy">{tenant?.name ?? "—"}</h1>
            {(tenant?.email || tenant?.phone) && (
              <p className="mt-1 text-sm text-slate">{tenant.email}{tenant.email && tenant.phone ? " · " : ""}{tenant.phone}</p>
            )}
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${STATUS_COLOR[d.status] ?? "bg-surface-gray text-slate"}`}>
            {d.status.replace(/_/g, " ")}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">Property / Unit</p>
            <p className="mt-1 font-medium text-navy">
              {prop?.name ? `${prop.name} · ` : ""}{unit?.unit_label ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">Owner</p>
            <p className="mt-1 font-medium text-navy">{(owner as { name?: string } | null)?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">Months held</p>
            <p className="mt-1 font-medium text-navy">{d.months_held}×</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">Received</p>
            <p className="mt-1 font-medium text-navy">{d.received_at}</p>
          </div>
        </div>
      </div>

      {/* Amount card */}
      <div className="mt-4 rounded-lg border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate">Total held by AllAbode</span>
          <span className="font-display text-2xl font-bold text-reserved">{peso(d.amount_held)}</span>
        </div>
        {d.status === "partially_returned" && d.returned_amount != null && (
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm">
            <span className="text-slate">Returned so far</span>
            <span className="font-semibold text-available">{peso(d.returned_amount)}</span>
          </div>
        )}
        {d.notes && <p className="mt-3 rounded-md bg-surface-gray p-3 text-sm text-slate">{d.notes}</p>}
      </div>

      {/* Returned details */}
      {(d.status === "returned" || d.status === "partially_returned") && d.returned_at && (
        <div className="mt-4 rounded-lg border border-available/30 bg-available/5 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-available">
            <Icon name="check_circle" size={18} /> Deposit returned {d.returned_at}
          </div>
          <div className="space-y-1 text-sm">
            {deductions.map((ded, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-slate">{ded.description}</span>
                <span className="text-error">−{peso(ded.amount)}</span>
              </div>
            ))}
            {deductions.length > 0 && (
              <div className="flex justify-between border-t border-line pt-1 font-semibold text-navy">
                <span>Deductions</span>
                <span>{peso(dedTotal)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-available">
              <span>Returned to tenant</span>
              <span>{peso(d.returned_amount ?? 0)}</span>
            </div>
          </div>
          {d.return_notes && <p className="mt-2 text-xs text-slate">{d.return_notes}</p>}
        </div>
      )}

      {/* Forfeited details */}
      {d.status === "forfeited" && d.forfeited_at && (
        <div className="mt-4 rounded-lg border border-error/30 bg-error-bg p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-error">
            <Icon name="block" size={18} /> Deposit forfeited {d.forfeited_at}
          </div>
          <p className="text-sm text-slate"><span className="font-medium text-navy">Reason:</span> {d.forfeiture_reason}</p>
          <p className="mt-1 text-sm text-slate">Amount forfeited: <span className="font-semibold text-navy">{peso(d.forfeited_amount ?? d.amount_held)}</span></p>
        </div>
      )}

      {/* Actions — only if still held */}
      {(d.status === "held" || d.status === "partially_returned") && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {/* Return form */}
          <form action={processDepositReturn.bind(null, id)} className="rounded-lg border border-line bg-surface p-5">
            <h2 className="mb-3 font-display text-base font-semibold text-navy">
              <Icon name="undo" size={18} className="mr-1.5 inline text-available" />
              Return deposit
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate">Amount to return (₱)</label>
                <input name="returned_amount" type="number" step="0.01" min="0"
                  defaultValue={d.amount_held} required className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate">Return date</label>
                <input name="returned_at" type="date" defaultValue={today} required className={inputCls} />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate">Deductions (optional)</p>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="mb-1.5 flex gap-2">
                    <input name={`ded_desc_${i}`} placeholder="e.g. Cleaning fee" className="flex-1 h-8 rounded border border-line px-2 text-xs focus:border-navy-700 focus:outline-none" />
                    <input name={`ded_amount_${i}`} type="number" step="0.01" min="0" placeholder="₱"
                      className="w-24 h-8 rounded border border-line px-2 text-right text-xs focus:border-navy-700 focus:outline-none" />
                  </div>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate">Notes</label>
                <input name="return_notes" type="text" className={inputCls} placeholder="Optional" />
              </div>
              <button type="submit" className={`${btn} w-full justify-center bg-available text-white hover:opacity-90`}>
                <Icon name="check_circle" size={18} /> Confirm return
              </button>
            </div>
          </form>

          {/* Forfeit form */}
          <form action={processDepositForfeiture.bind(null, id)} className="rounded-lg border border-error/20 bg-surface p-5">
            <h2 className="mb-3 font-display text-base font-semibold text-navy">
              <Icon name="gavel" size={18} className="mr-1.5 inline text-error" />
              Forfeit deposit
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate">Amount forfeited (₱)</label>
                <input name="forfeited_amount" type="number" step="0.01" min="0"
                  defaultValue={d.amount_held} required className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate">Forfeiture date</label>
                <input name="forfeited_at" type="date" defaultValue={today} required className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate">Reason <span className="text-error">*</span></label>
                <textarea name="forfeiture_reason" required rows={3}
                  className="w-full rounded border border-line px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                  placeholder="e.g. Unpaid rent, property damages, early termination…" />
              </div>
              <button type="submit" className={`${btn} w-full justify-center border border-error text-error hover:bg-error-bg`}>
                <Icon name="block" size={18} /> Forfeit deposit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete (only while held, no return/forfeit yet) */}
      {d.status === "held" && (
        <div className="mt-4 border-t border-line pt-4">
          <ConfirmActionForm
            action={deleteDeposit.bind(null, id, d.lease_id)}
            message="Permanently delete this deposit record? This cannot be undone."
          >
            <button className={`${btn} border border-error/50 text-error hover:bg-error-bg`}>
              <Icon name="delete" size={18} /> Delete record
            </button>
          </ConfirmActionForm>
        </div>
      )}

      <div className="mt-4">
        <Link href={`/admin/leases/${d.lease_id}/edit`}
          className="inline-flex items-center gap-1.5 text-sm text-navy-700 hover:underline">
          <Icon name="open_in_new" size={16} /> View lease
        </Link>
      </div>
    </div>
  );
}
