import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { createClient } from "@/lib/supabase/server";
import { signedUrl, FINANCE_DOCS_BUCKET } from "@/lib/storage";
import {
  submitForReview, approveStatement, publishStatement, voidStatement, deleteStatement, reopenStatement,
  saveOwnerSoaReview, markSoaProcessing, markSoaPaid, carryForwardSoa,
} from "@/app/admin/soa-actions";

const peso = (n: number) =>
  `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPeriod = (start: string, end: string) => {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end   + "T00:00:00");
  const mo = (d: Date) => d.toLocaleString("en-PH", { month: "long", year: "numeric" });
  return s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
    ? mo(s)
    : `${s.toLocaleString("en-PH", { month: "short", day: "numeric" })} – ${e.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
};

function leaseTypeLabel(value: string | null | undefined) {
  if (value === "bnb") return "BNB / daily platform";
  return value === "short_term" ? "Short-term rental" : "Long-term rental";
}

type Line = {
  id: string; description: string; amount: number;
  line_type: string; sort_order: number;
  expense_id: string | null; receipt_path: string | null; billing_note: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  published:      "bg-available/10 text-available",
  approved:       "bg-available/10 text-available",
  checker_review: "bg-reserved/10 text-reserved",
  generated:      "bg-surface-gray text-slate",
  voided:         "bg-error-bg text-error",
};
const PAYOUT_LABEL: Record<string, string> = {
  pending:          "Awaiting Transfer",
  processing:       "Transfer in Progress",
  paid:             "Paid",
  collected:        "Collected",
  refund_pending:   "Collection Pending",
  carried_forward:  "Carried Forward",
};
const PAYOUT_COLOR: Record<string, string> = {
  pending:          "bg-reserved/10 text-reserved",
  processing:       "bg-reserved/10 text-reserved",
  paid:             "bg-available/10 text-available",
  collected:        "bg-available/10 text-available",
  refund_pending:   "bg-error-bg text-error",
  carried_forward:  "bg-surface-gray text-slate",
};

export default async function StatementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase.from("statements_of_account").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();

  const isLeaseBased = !!s.lease_id;
  const type = s.statement_type as "owner" | "tenant";
  const partyId = (type === "owner" ? s.owner_id : s.tenant_id) as string;

  // Party name
  const { data: partyRow } = type === "owner"
    ? await supabase.from("owners").select("name,email,phone").eq("id", partyId).maybeSingle()
    : await supabase.from("tenants").select("name,email,phone").eq("id", partyId).maybeSingle();
  const partyName  = (partyRow as { name?: string }  | null)?.name  ?? "—";
  const partyEmail = (partyRow as { email?: string } | null)?.email ?? null;
  const partyPhone = (partyRow as { phone?: string } | null)?.phone ?? null;

  // Property + unit (for lease-based or when columns available)
  let propertyName: string | null = null;
  let unitLabel:    string | null = null;
  if (s.unit_id) {
    const { data: unitRow } = await supabase.from("units").select("unit_label,properties(name)").eq("id", s.unit_id).maybeSingle();
    unitLabel    = (unitRow as { unit_label?: string } | null)?.unit_label ?? null;
    const prop   = (unitRow as { properties?: { name?: string } | null } | null)?.properties;
    propertyName = (Array.isArray(prop) ? prop[0]?.name : prop?.name) ?? null;
  } else if (s.property_id) {
    const { data: propRow } = await supabase.from("properties").select("name").eq("id", s.property_id).maybeSingle();
    propertyName = (propRow as { name?: string } | null)?.name ?? null;
  }

  const { data: lineRows } = await supabase.from("soa_lines").select("*").eq("statement_id", id).order("sort_order");
  const lines = (lineRows ?? []) as Line[];

  const pdfUrl  = s.pdf_path        ? await signedUrl(supabase, FINANCE_DOCS_BUCKET, s.pdf_path,        300) : null;
  const slipUrl = s.payout_slip_url ? await signedUrl(supabase, FINANCE_DOCS_BUCKET, s.payout_slip_url, 300) : null;

  const lineReceiptUrls: Record<string, string> = {};
  for (const l of lines) {
    if (l.receipt_path) {
      const u = await signedUrl(supabase, FINANCE_DOCS_BUCKET, l.receipt_path, 300);
      if (u) lineReceiptUrls[l.id] = u;
    }
  }

  const btn = "inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold";

  const incomeLines   = lines.filter((l) => l.line_type.startsWith("income_"));
  const infoLines     = lines.filter((l) => l.line_type.startsWith("info_"));
  const expReceipt    = lines.filter((l) => l.line_type === "deduction_expense");
  const commLines     = lines.filter((l) => l.line_type === "deduction_commission");
  const cfLines       = lines.filter((l) => l.line_type === "deduction_carry_forward");
  const mgmtFeeLines  = lines.filter((l) => l.line_type === "deduction_mgmt_fee" || l.line_type === "deduction_vat");
  const editableLines = lines.filter((l) => ["deduction_utility", "deduction_expense_recurring"].includes(l.line_type));
  const manualLines   = lines.filter((l) => l.line_type === "deduction_expense_manual");

  const totalIncome     = incomeLines.reduce((a, l) => a + Number(l.amount), 0);
  const totalDeductions = lines.filter((l) => l.line_type.startsWith("deduction_")).reduce((a, l) => a + Math.abs(Number(l.amount)), 0);
  const payout          = Number(s.closing_balance ?? s.net_remittance ?? 0);

  const payoutLabel = PAYOUT_LABEL[s.payout_status ?? "pending"] ?? s.payout_status;
  const payoutColor = PAYOUT_COLOR[s.payout_status ?? "pending"] ?? "bg-surface-gray text-slate";
  const statusColor = STATUS_COLOR[s.status] ?? "bg-surface-gray text-slate";

  return (
    <div className="mx-auto max-w-4xl">

      {/* ── Back ── */}
      <Link href="/admin/statements" className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to statements
      </Link>

      {/* ── Header card ── */}
      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-4">
          <Image src="/logo/logo-primary.png" alt="All Abode Property Solutions" width={140} height={40} className="object-contain" />
          <span className="label-caps text-slate">{type === "owner" ? "Owner" : "Tenant"} Statement of Account</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-caps text-gold">
              {type === "owner" ? "Owner" : "Tenant"}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-navy">{partyName}</h1>
            {(partyEmail || partyPhone) && (
              <p className="mt-1 text-sm text-slate">
                {partyEmail}{partyEmail && partyPhone ? " · " : ""}{partyPhone}
              </p>
            )}
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${statusColor}`}>
            {s.status?.replace(/_/g, " ")}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
          {propertyName && (
            <div className="flex items-center gap-1.5 text-slate">
              <Icon name="home_work" size={16} />
              {propertyName}{unitLabel ? ` · ${unitLabel}` : ""}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-slate">
            <Icon name="calendar_month" size={16} />
            {fmtPeriod(s.period_start, s.period_end)}
          </div>
          {isLeaseBased && (
            <div className="flex items-center gap-1.5 text-gold">
              <Icon name="verified" size={16} />
              {leaseTypeLabel(s.lease_type)}
            </div>
          )}
        </div>
      </div>

      {/* ── Lease-based review form ── */}
      {isLeaseBased && s.status === "generated" ? (
        <form action={saveOwnerSoaReview.bind(null, id)} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="editable_line_ids" value={editableLines.map((l) => l.id).join(",")} />
          <input type="hidden" name="deleted_line_ids" value="" />

          {/* Income */}
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="border-b border-line bg-[#dbeafe] px-4 py-2.5 text-sm font-bold text-[#1a56db]">Income</div>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-line">
                {incomeLines.length === 0 && (
                  <tr><td colSpan={2} className="px-4 py-4 text-center text-sm text-slate">No payments recorded for this period.</td></tr>
                )}
                {incomeLines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-ink">{l.description}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-navy">{peso(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#dbeafe]">
                  <td className="px-4 py-2.5 text-sm font-bold text-navy">Total Income</td>
                  <td className="px-4 py-2.5 text-right text-sm font-bold text-navy">{peso(totalIncome)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Security Deposits Held (informational only) */}
          {infoLines.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="border-b border-line bg-surface-gray px-4 py-2.5 text-sm font-semibold text-slate">Security Deposits Held</div>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-line">
                  {infoLines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-2.5 text-ink">{l.description}</td>
                      <td className="px-4 py-2.5 text-right text-slate">{peso(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-2 text-xs text-slate">Held on behalf of owner — not counted in remittance</p>
            </div>
          )}

          {/* Deductions */}
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="border-b border-line bg-[#fee2e2] px-4 py-2.5 text-sm font-bold text-[#e02424]">Deductions</div>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-line">
                {/* Carry-forward balance from prior negative SOAs */}
                {cfLines.length > 0 && (
                  <tr><td colSpan={3} className="bg-surface-gray px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate">Carry Forward</td></tr>
                )}
                {cfLines.map((l) => (
                  <tr key={l.id} className="bg-surface-gray/20">
                    <td className="px-4 py-2.5 text-ink">{l.description}</td>
                    <td className="px-4 py-2.5 text-xs italic text-slate">prior period balance</td>
                    <td className="w-36 px-4 py-2.5 text-right font-medium text-navy">{peso(Math.abs(l.amount))}</td>
                  </tr>
                ))}
                {/* Commissions */}
                {commLines.length > 0 && (
                  <tr><td colSpan={3} className="bg-surface-gray px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate">Commission</td></tr>
                )}
                {commLines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-ink">{l.description}</td>
                    <td className="px-4 py-2.5 text-xs italic text-slate">one-time</td>
                    <td className="w-36 px-4 py-2.5 text-right font-medium text-navy">{peso(Math.abs(l.amount))}</td>
                  </tr>
                ))}
                {/* Mgmt fee + VAT */}
                {mgmtFeeLines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-ink">{l.description}</td>
                    <td className="px-4 py-2.5 text-xs italic text-slate">auto-computed</td>
                    <td className="w-36 px-4 py-2.5 text-right font-medium text-navy">{peso(Math.abs(l.amount))}</td>
                  </tr>
                ))}
                {/* Expense records with receipts */}
                {expReceipt.length > 0 && (
                  <tr><td colSpan={3} className="bg-surface-gray px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate">From uploaded receipts</td></tr>
                )}
                {expReceipt.map((l) => (
                  <tr key={l.id} className="bg-surface-gray/30">
                    <td className="px-4 py-2.5 text-ink">
                      {l.description}
                      {l.billing_note && <span className="ml-2 text-xs text-slate">{l.billing_note}</span>}
                      {lineReceiptUrls[l.id] && (
                        <a href={lineReceiptUrls[l.id]} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-xs text-navy-700 underline">
                          <Icon name="receipt" size={12} /> receipt
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate">expense record</td>
                    <td className="w-36 px-4 py-2.5 text-right font-medium text-navy">{peso(Math.abs(l.amount))}</td>
                  </tr>
                ))}
                {/* Utilities + recurring (editable) */}
                {editableLines.length > 0 && (
                  <tr><td colSpan={3} className="bg-surface-gray px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate">Utilities &amp; fixed charges</td></tr>
                )}
                {editableLines.map((l, i) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-ink">{l.description}</td>
                    <td className="px-2 py-1.5">
                      <input name={`line_note_${i}`} defaultValue={l.billing_note ?? ""} placeholder="Month/note"
                        className="h-8 w-28 rounded border border-line px-2 text-xs text-slate focus:border-navy-700 focus:outline-none" />
                    </td>
                    <td className="w-36 px-2 py-1.5">
                      <input name={`line_amount_${i}`} type="number" step="0.01" min="0" defaultValue={Math.abs(l.amount)}
                        className="h-8 w-full rounded border border-line px-2 text-right text-sm focus:border-navy-700 focus:outline-none" />
                    </td>
                  </tr>
                ))}
                {/* Manual one-time */}
                {manualLines.length > 0 && (
                  <tr><td colSpan={3} className="bg-surface-gray px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate">Other expenses (one-time)</td></tr>
                )}
                {manualLines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-ink">{l.description}</td>
                    <td className="px-4 py-2.5 text-xs text-slate">one-time</td>
                    <td className="px-4 py-2.5 text-right font-medium text-navy">{peso(Math.abs(l.amount))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#fee2e2]">
                  <td colSpan={2} className="px-4 py-2.5 text-sm font-bold text-navy">Total Deductions</td>
                  <td className="px-4 py-2.5 text-right text-sm font-bold text-navy">{peso(totalDeductions)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Add one-time expenses */}
          <details className="rounded-lg border border-dashed border-line bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate select-none">
              + Add one-time expenses
            </summary>
            <div className="border-t border-line p-4">
              <input type="hidden" name="new_expense_count" value="5" />
              <div className="flex flex-col gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-2">
                    <input name={`new_desc_${i}`} placeholder="Description (e.g. Commission)"
                      className="flex-1 h-9 rounded border border-line px-3 text-sm focus:border-navy-700 focus:outline-none" />
                    <input name={`new_amount_${i}`} type="number" step="0.01" min="0" placeholder="Amount"
                      className="w-32 h-9 rounded border border-line px-3 text-sm text-right focus:border-navy-700 focus:outline-none" />
                  </div>
                ))}
              </div>
            </div>
          </details>

          {/* SOA meta */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">Previous SOA ref</label>
              <input name="prev_soa_ref" defaultValue={s.prev_soa_ref ?? ""} placeholder="e.g. May 2026 SOA"
                className="h-9 w-full rounded border border-line px-3 text-sm focus:border-navy-700 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">Adjustments (₱)</label>
              <input name="adjustments" type="number" step="0.01" defaultValue={s.adjustments ?? 0}
                className="h-9 w-full rounded border border-line px-3 text-sm text-right focus:border-navy-700 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">Payout due date</label>
              <input name="payout_due_at" type="date" defaultValue={s.payout_due_at ?? ""}
                className="h-9 w-full rounded border border-line px-3 text-sm focus:border-navy-700 focus:outline-none" />
            </div>
          </div>

          {/* Payout summary */}
          <div className="rounded-lg border border-line bg-surface p-5">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate">Total Income</span>
                <span className="font-medium text-navy">{peso(totalIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Total Deductions</span>
                <span className="font-medium text-navy">{peso(totalDeductions)}</span>
              </div>
            </div>
            <div className="mt-3 flex justify-between border-t border-line pt-3 text-base font-bold text-navy">
              <span>Net Payout to Owner</span>
              <span className={payout < 0 ? "text-error" : "text-available"}>{peso(payout)}</span>
            </div>
            {payout < 0 && (
              <p className="mt-1.5 text-xs text-error">
                Negative — commission or deductions exceed income for this period. After publishing, use &quot;Carry to Next Payout&quot; to auto-deduct from the next SOA, or the owner can pay via their portal.
              </p>
            )}
          </div>

          <button type="submit" className={`${btn} bg-navy text-white hover:bg-navy-800`}>
            <Icon name="save" size={18} /> Save &amp; Recalculate
          </button>
        </form>

      ) : (
        /* ── Read-only view (approved / published / legacy) ── */
        <>
          <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-gray">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-slate">Description</th>
                  <th className="px-4 py-2.5 font-semibold text-slate">Note</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-ink">
                      {l.description}
                      {lineReceiptUrls[l.id] && (
                        <a href={lineReceiptUrls[l.id]} target="_blank" rel="noopener noreferrer"
                          className="ml-2 inline-flex items-center gap-0.5 text-xs text-navy-700 underline">
                          <Icon name="receipt" size={12} /> receipt
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate">{l.billing_note ?? ""}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${l.amount < 0 ? "text-error" : "text-navy"}`}>
                      {peso(l.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg border border-line bg-surface p-5">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate">Total income</dt>
                <dd className="font-medium text-navy">{peso(Number(s.total_payments))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate">Total deductions</dt>
                <dd className="font-medium text-navy">{peso(Number(s.total_expenses))}</dd>
              </div>
              {Number(s.adjustments ?? 0) !== 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate">{s.prev_soa_ref ? `Adjustments (${s.prev_soa_ref})` : "Adjustments"}</dt>
                  <dd className="font-medium text-navy">{peso(Number(s.adjustments))}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-2 font-bold text-navy">
                <dt>Net Payout to Owner</dt>
                <dd className={payout < 0 ? "text-error" : "text-available"}>{peso(payout)}</dd>
              </div>
            </dl>
          </div>
        </>
      )}

      {/* ── AI summary ── */}
      {s.ai_summary && (
        <div className="mt-4 flex gap-2 rounded-lg bg-surface-gray p-4 text-sm text-slate">
          <Icon name="smart_toy" size={18} className="mt-0.5 shrink-0 text-navy-700" />
          <p>{s.ai_summary}</p>
        </div>
      )}

      {/* ── Payout status (published) ── */}
      {s.status === "published" && (
        <div className="mt-6 rounded-lg border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-navy">Payout Status</p>
              <p className="mt-0.5 text-xs text-slate">
                Due: {s.payout_due_at ? new Date(s.payout_due_at + "T00:00:00").toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "Not set"}
                {payout < 0 && " · Negative — collect from owner"}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${payoutColor}`}>{payoutLabel}</span>
          </div>

          {slipUrl && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Icon name="receipt_long" size={16} className="text-available" />
              <a href={slipUrl} target="_blank" rel="noopener noreferrer" className="text-navy-700 underline">
                View bank transfer slip
              </a>
              {s.paid_at && <span className="text-slate">· Paid {new Date(s.paid_at).toLocaleDateString("en-PH")}</span>}
            </div>
          )}

          {(s.payout_status === "pending" || s.payout_status === "processing") && payout > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {s.payout_status === "pending" && (
                <form action={markSoaProcessing.bind(null, id)}>
                  <button className={`${btn} border border-line text-navy hover:bg-surface-gray`}>
                    <Icon name="hourglass_top" size={16} /> Mark Processing
                  </button>
                </form>
              )}
              <form action={markSoaPaid.bind(null, id)} encType="multipart/form-data" className="flex flex-wrap items-center gap-2">
                <input type="file" name="slip" accept="image/*,application/pdf"
                  className="text-sm text-slate file:mr-2 file:rounded file:border file:border-line file:bg-surface-gray file:px-3 file:py-1.5 file:text-xs file:font-medium" />
                <button type="submit" className={`${btn} bg-available text-white hover:opacity-90`}>
                  <Icon name="check_circle" size={16} /> Mark Paid + Upload Slip
                </button>
              </form>
            </div>
          )}

          {payout < 0 && s.payout_status === "pending" && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <form action={carryForwardSoa.bind(null, id)}>
                <button className={`${btn} border border-line text-navy hover:bg-surface-gray`}>
                  <Icon name="forward" size={16} /> Carry to Next Payout
                </button>
              </form>
              <p className="text-xs text-slate">Auto-deducts from the next SOA. Owner can also pay via portal.</p>
            </div>
          )}
          {s.payout_status === "carried_forward" && (
            <p className="mt-3 text-sm text-slate">
              <Icon name="info" size={14} className="inline mr-1 text-slate" />
              This negative balance will be deducted from the owner&apos;s next generated SOA.
            </p>
          )}
        </div>
      )}

      {/* ── Workflow actions ── */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        {s.status === "generated" && (
          <form action={submitForReview.bind(null, id)}>
            <button className={`${btn} bg-navy text-white hover:bg-navy-800`}>
              <Icon name="send" size={18} /> Submit for Review
            </button>
          </form>
        )}
        {s.status === "checker_review" && (
          <form action={approveStatement.bind(null, id)}>
            <button className={`${btn} bg-navy text-white hover:bg-navy-800`}>
              <Icon name="verified" size={18} /> Approve
            </button>
          </form>
        )}
        {s.status === "approved" && (
          <form action={publishStatement.bind(null, id)}>
            <button className={`${btn} bg-available text-white hover:opacity-90`}>
              <Icon name="publish" size={18} /> Publish to Portal
            </button>
          </form>
        )}
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={`${btn} border border-line text-navy hover:bg-surface-gray`}>
            <Icon name="download" size={18} /> Download PDF
          </a>
        )}
        {s.gdrive_file_id && (
          <a href={`https://drive.google.com/file/d/${s.gdrive_file_id}/view`} target="_blank" rel="noopener noreferrer" className={`${btn} border border-line text-navy hover:bg-surface-gray`}>
            <Icon name="folder_open" size={18} /> View in Drive
          </a>
        )}
        {s.gdrive_folder_url && (
          <a href={s.gdrive_folder_url} target="_blank" rel="noopener noreferrer" className={`${btn} border border-line text-slate hover:bg-surface-gray`}>
            <Icon name="drive_folder_upload" size={18} /> Owner Folder
          </a>
        )}
        {(s.status === "approved" || s.status === "published") && (
          <ConfirmActionForm
            action={reopenStatement.bind(null, id)}
            message={s.status === "published"
              ? "Re-opening will unpublish this SOA and clear the PDF. The owner will lose portal access to it until you re-publish. Continue?"
              : "Re-open this SOA for editing?"
            }
          >
            <button className={`${btn} border border-gold text-gold-bright hover:bg-gold/5`}>
              <Icon name="edit" size={18} /> Re-open for Editing
            </button>
          </ConfirmActionForm>
        )}
        {s.status !== "voided" && (
          <form action={voidStatement.bind(null, id)} className="flex items-center gap-2 border-l border-line pl-3 ml-auto">
            <input name="reason" placeholder="Void reason" required
              className="h-9 rounded-md border border-line bg-surface px-3 text-sm focus:border-error focus:outline-none" />
            <button className={`${btn} border border-error text-error hover:bg-error-bg`}>
              <Icon name="block" size={18} /> Void
            </button>
          </form>
        )}
        {(s.status === "generated" || s.status === "voided") && (
          <ConfirmActionForm
            action={deleteStatement.bind(null, id)}
            message="Permanently delete this statement? This cannot be undone."
          >
            <button className={`${btn} border border-error/50 text-error hover:bg-error-bg`}>
              <Icon name="delete" size={18} /> Delete
            </button>
          </ConfirmActionForm>
        )}
      </div>
    </div>
  );
}
