import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { signedUrl, FINANCE_DOCS_BUCKET } from "@/lib/storage";
import {
  submitForReview, approveStatement, publishStatement, voidStatement,
  saveOwnerSoaReview, markSoaProcessing, markSoaPaid,
} from "@/app/admin/soa-actions";

const peso = (n: number) =>
  `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Line = {
  id: string; description: string; amount: number;
  line_type: string; sort_order: number;
  expense_id: string | null; receipt_path: string | null; billing_note: string | null;
};

const PAYOUT_STATUS_LABEL: Record<string, string> = {
  pending:        "Awaiting Transfer",
  processing:     "Transfer in Progress",
  paid:           "Paid",
  collected:      "Collected (Owner Paid)",
  refund_pending: "Collection Pending",
};
const PAYOUT_STATUS_COLOR: Record<string, string> = {
  pending:        "bg-reserved/10 text-reserved",
  processing:     "bg-reserved/10 text-reserved",
  paid:           "bg-available/10 text-available",
  collected:      "bg-available/10 text-available",
  refund_pending: "bg-error-bg text-error",
};

export default async function StatementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase.from("statements_of_account").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();

  const isLeaseBased = !!s.lease_id;
  const type = s.statement_type as "owner" | "tenant";
  const partyId = (type === "owner" ? s.owner_id : s.tenant_id) as string;
  const { data: partyRow } = type === "owner"
    ? await supabase.from("owners").select("name").eq("id", partyId).maybeSingle()
    : await supabase.from("tenants").select("name").eq("id", partyId).maybeSingle();
  const party = (partyRow as { name?: string } | null)?.name ?? "—";

  const { data: lineRows } = await supabase.from("soa_lines").select("*").eq("statement_id", id).order("sort_order");
  const lines = (lineRows ?? []) as Line[];
  const pdfUrl = s.pdf_path ? await signedUrl(supabase, FINANCE_DOCS_BUCKET, s.pdf_path, 300) : null;
  const slipUrl = s.payout_slip_url ? await signedUrl(supabase, FINANCE_DOCS_BUCKET, s.payout_slip_url, 300) : null;

  // Receipt signed URLs for lines
  const lineReceiptUrls: Record<string, string> = {};
  for (const l of lines) {
    if (l.receipt_path) {
      const u = await signedUrl(supabase, FINANCE_DOCS_BUCKET, l.receipt_path, 300);
      if (u) lineReceiptUrls[l.id] = u;
    }
  }

  const btn = "inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold";

  // Split lines by type for review UI
  const incomeLines  = lines.filter((l) => l.line_type.startsWith("income_"));
  const expReceipt   = lines.filter((l) => l.line_type === "deduction_expense");
  const mgmtFeeLines = lines.filter((l) => l.line_type === "deduction_mgmt_fee" || l.line_type === "deduction_vat");
  const editableLines = lines.filter((l) => ["deduction_utility", "deduction_expense_recurring"].includes(l.line_type));
  const manualLines  = lines.filter((l) => l.line_type === "deduction_expense_manual");

  const payoutStatusLabel = PAYOUT_STATUS_LABEL[s.payout_status ?? "pending"] ?? s.payout_status;
  const payoutStatusColor = PAYOUT_STATUS_COLOR[s.payout_status ?? "pending"] ?? "bg-surface-gray text-slate";
  const payout = Number(s.closing_balance ?? s.net_remittance ?? 0);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/statements" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to statements
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy capitalize">{type} statement</h1>
          <p className="mt-1 text-sm text-slate">{party} · {s.period_start} → {s.period_end}</p>
          {isLeaseBased && <p className="mt-0.5 text-xs text-gold">Lease-based · {s.lease_type === "long_term" ? "Long term" : "Short term"}</p>}
        </div>
        <span className="rounded-full bg-surface-gray px-3 py-1 text-xs font-medium text-navy capitalize">{s.status?.replace(/_/g, " ")}</span>
      </div>

      {/* ── Lease-based review form ── */}
      {isLeaseBased && s.status === "generated" ? (
        <form action={saveOwnerSoaReview.bind(null, id)} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="editable_line_ids" value={editableLines.map((l) => l.id).join(",")} />
          <input type="hidden" name="deleted_line_ids" value="" />

          {/* Income (read-only) */}
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="border-b border-line bg-[#dbeafe] px-4 py-2.5 text-sm font-bold text-[#1a56db]">Income</div>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-line">
                {incomeLines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-ink">{l.description}</td>
                    <td className="px-4 py-2.5 text-right text-navy">{peso(l.amount)}</td>
                  </tr>
                ))}
                {incomeLines.length === 0 && (
                  <tr><td colSpan={2} className="px-4 py-3 text-center text-sm text-slate">No payments recorded for this period</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#dbeafe]">
                  <td className="px-4 py-2.5 text-sm font-bold text-navy">Total Income</td>
                  <td className="px-4 py-2.5 text-right text-sm font-bold text-navy">{peso(incomeLines.reduce((s, l) => s + l.amount, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Deductions */}
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="border-b border-line bg-[#fee2e2] px-4 py-2.5 text-sm font-bold text-[#e02424]">Deductions</div>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-line">
                {/* Management fee + VAT (editable) */}
                {mgmtFeeLines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-ink">{l.description}</td>
                    <td className="px-4 py-2.5 text-right text-slate italic text-xs">auto-computed</td>
                    <td className="w-36 px-4 py-2.5 text-right text-navy">{peso(Math.abs(l.amount))}</td>
                  </tr>
                ))}

                {/* Expense records with receipts (read-only) */}
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
                    <td className="px-4 py-2.5 text-xs text-slate">from expense record</td>
                    <td className="w-36 px-4 py-2.5 text-right text-navy">{peso(Math.abs(l.amount))}</td>
                  </tr>
                ))}

                {/* Utility + recurring (editable amounts) */}
                {editableLines.length > 0 && (
                  <tr><td colSpan={3} className="bg-surface-gray px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate">
                    {editableLines.some((l) => l.line_type === "deduction_utility") ? "Utilities / Fixed charges" : "Recurring expenses"}
                  </td></tr>
                )}
                {editableLines.map((l, i) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-ink">{l.description}</td>
                    <td className="px-2 py-1.5">
                      <input
                        name={`line_note_${i}`}
                        defaultValue={l.billing_note ?? ""}
                        placeholder="Month/note"
                        className="h-8 w-24 rounded border border-line px-2 text-xs text-slate focus:border-navy-700 focus:outline-none"
                      />
                    </td>
                    <td className="w-36 px-2 py-1.5">
                      <input
                        name={`line_amount_${i}`}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={Math.abs(l.amount)}
                        className="h-8 w-full rounded border border-line px-2 text-right text-sm focus:border-navy-700 focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}

                {/* Manual one-time expenses */}
                {manualLines.length > 0 && (
                  <tr><td colSpan={3} className="bg-surface-gray px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate">Other expenses (one-time)</td></tr>
                )}
                {manualLines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-ink">{l.description}</td>
                    <td className="px-4 py-2.5 text-xs text-slate">one-time</td>
                    <td className="px-4 py-2.5 text-right text-navy">{peso(Math.abs(l.amount))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#fee2e2]">
                  <td colSpan={2} className="px-4 py-2.5 text-sm font-bold text-navy">Total Deductions</td>
                  <td className="px-4 py-2.5 text-right text-sm font-bold text-navy">
                    {peso(lines.filter((l) => l.line_type.startsWith("deduction_")).reduce((s, l) => s + Math.abs(l.amount), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Add one-time expenses */}
          <div className="rounded-lg border border-dashed border-line bg-surface p-4">
            <p className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">Add one-time expenses</p>
            <input type="hidden" name="new_expense_count" value="5" />
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-2">
                  <input name={`new_desc_${i}`} placeholder="Description (e.g. Commission)" className="flex-1 h-9 rounded border border-line px-3 text-sm focus:border-navy-700 focus:outline-none" />
                  <input name={`new_amount_${i}`} type="number" step="0.01" min="0" placeholder="Amount" className="w-32 h-9 rounded border border-line px-3 text-sm text-right focus:border-navy-700 focus:outline-none" />
                </div>
              ))}
            </div>
          </div>

          {/* SOA meta */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate uppercase tracking-wide">Previous SOA ref</label>
              <input name="prev_soa_ref" defaultValue={s.prev_soa_ref ?? ""} placeholder="e.g. May SOA" className="h-9 w-full rounded border border-line px-3 text-sm focus:border-navy-700 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate uppercase tracking-wide">Adjustments (₱)</label>
              <input name="adjustments" type="number" step="0.01" defaultValue={s.adjustments ?? 0} className="h-9 w-full rounded border border-line px-3 text-sm text-right focus:border-navy-700 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate uppercase tracking-wide">Payout due date</label>
              <input name="payout_due_at" type="date" defaultValue={s.payout_due_at ?? ""} className="h-9 w-full rounded border border-line px-3 text-sm focus:border-navy-700 focus:outline-none" />
            </div>
          </div>

          {/* Payout summary */}
          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate">Total Income</span>
              <span>{peso(incomeLines.reduce((s, l) => s + l.amount, 0))}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate">Total Deductions</span>
              <span>{peso(lines.filter((l) => l.line_type.startsWith("deduction_")).reduce((s, l) => s + Math.abs(l.amount), 0))}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-line pt-2 text-base font-bold text-navy">
              <span>Payout</span>
              <span className={payout < 0 ? "text-error" : ""}>{peso(payout)}</span>
            </div>
            {payout < 0 && <p className="mt-1 text-xs text-error">Negative — owner owes PM. Pay Balance button shown on portal.</p>}
          </div>

          <button type="submit" className={`${btn} bg-navy text-white hover:bg-navy-800`}>
            <Icon name="save" size={18} /> Save &amp; Recalculate
          </button>
        </form>
      ) : (
        /* Standard read-only view for approved/published/legacy SOAs */
        <>
          <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-gray text-slate">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 font-medium text-slate">Note</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-ink">
                      {l.description}
                      {lineReceiptUrls[l.id] && (
                        <a href={lineReceiptUrls[l.id]} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-xs text-navy-700 underline">
                          <Icon name="receipt" size={12} /> R
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate">{l.billing_note ?? ""}</td>
                    <td className={`px-4 py-2.5 text-right ${l.amount < 0 ? "text-error" : "text-navy"}`}>{peso(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg border border-line bg-surface p-5">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate">Total income</dt><dd>{peso(Number(s.total_payments))}</dd></div>
              <div className="flex justify-between"><dt className="text-slate">Total deductions</dt><dd>{peso(Number(s.total_expenses))}</dd></div>
              {Number(s.adjustments ?? 0) !== 0 && (
                <div className="flex justify-between"><dt className="text-slate">{s.prev_soa_ref ? `Adjustments (${s.prev_soa_ref})` : "Adjustments"}</dt><dd>{peso(Number(s.adjustments))}</dd></div>
              )}
              <div className="flex justify-between border-t border-line pt-2 font-bold text-navy">
                <dt>Payout</dt>
                <dd className={payout < 0 ? "text-error" : ""}>{peso(payout)}</dd>
              </div>
            </dl>
          </div>
        </>
      )}

      {s.ai_summary && (
        <div className="mt-4 flex gap-2 rounded-lg bg-surface-gray p-4 text-sm text-slate">
          <Icon name="smart_toy" size={18} className="mt-0.5 shrink-0 text-navy-700" />
          <p>{s.ai_summary}</p>
        </div>
      )}

      {/* ── Payout status panel (published SOAs) ── */}
      {s.status === "published" && (
        <div className="mt-6 rounded-lg border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-navy">Payout Status</p>
              <p className="mt-0.5 text-xs text-slate">
                Payout due: {s.payout_due_at ?? "—"}
                {payout < 0 && " · Negative payout — collect from owner via payment gateway"}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${payoutStatusColor}`}>{payoutStatusLabel}</span>
          </div>

          {slipUrl && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Icon name="receipt_long" size={16} className="text-available" />
              <a href={slipUrl} target="_blank" rel="noopener noreferrer" className="text-navy-700 underline">View bank transfer slip</a>
              {s.paid_at && <span className="text-slate">· Paid {new Date(s.paid_at).toLocaleDateString("en-PH")}</span>}
            </div>
          )}

          {(s.payout_status === "pending" || s.payout_status === "processing") && payout > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {s.payout_status === "pending" && (
                <form action={markSoaProcessing.bind(null, id)}>
                  <button className={`${btn} border border-line text-navy hover:bg-surface-gray`}>
                    <Icon name="hourglass_top" size={16} /> Mark as Processing
                  </button>
                </form>
              )}
              <form action={markSoaPaid.bind(null, id)} encType="multipart/form-data" className="flex items-center gap-2">
                <input type="file" name="slip" accept="image/*,application/pdf" className="text-sm text-slate file:mr-2 file:rounded file:border file:border-line file:bg-surface-gray file:px-3 file:py-1.5 file:text-xs file:font-medium" />
                <button type="submit" className={`${btn} bg-available text-white hover:opacity-90`}>
                  <Icon name="check_circle" size={16} /> Mark Paid + Upload Slip
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── Workflow actions ── */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {s.status === "generated" && (
          <form action={submitForReview.bind(null, id)}>
            <button className={`${btn} bg-navy text-white hover:bg-navy-800`}><Icon name="send" size={18} /> Submit for review</button>
          </form>
        )}
        {s.status === "checker_review" && (
          <form action={approveStatement.bind(null, id)}>
            <button className={`${btn} bg-navy text-white hover:bg-navy-800`}><Icon name="verified" size={18} /> Approve</button>
          </form>
        )}
        {s.status === "approved" && (
          <form action={publishStatement.bind(null, id)}>
            <button className={`${btn} bg-available text-white hover:opacity-90`}><Icon name="publish" size={18} /> Publish to portal</button>
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
            <Icon name="drive_folder_upload" size={18} /> Owner folder
          </a>
        )}
        {s.status !== "voided" && s.status !== "published" && (
          <form action={voidStatement.bind(null, id)} className="flex items-center gap-2">
            <input name="reason" placeholder="Void reason" className="h-10 rounded-md border border-line bg-surface px-3 text-sm" />
            <button className={`${btn} border border-error text-error hover:bg-error-bg`}><Icon name="block" size={18} /> Void</button>
          </form>
        )}
      </div>
    </div>
  );
}
