import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { signedUrl, RECEIPTS_BUCKET } from "@/lib/storage";
import { isImageMime } from "@/lib/ai/receipts";
import { approveExtraction, rejectReceipt, runExtraction } from "@/app/admin/finance-actions";

const inputCls =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";

type Norm = {
  vendor_name?: string | null; receipt_date?: string | null; subtotal?: number | null;
  vat_amount?: number | null; total_amount?: number | null; expense_category_suggestion?: string | null;
  charge_to?: string | null;
};
type Validation = { id: string; validation_rule_code: string; severity: string; passed: boolean; message: string | null };

export default async function ReceiptReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: receipt } = await supabase.from("receipt_uploads").select("*").eq("id", id).maybeSingle();
  if (!receipt) notFound();

  const [{ data: extRows }, { data: valRows }, { data: props }, { data: owners }, { data: tenants }, { data: units }, { data: vendors }] =
    await Promise.all([
      supabase.from("receipt_extractions").select("*").eq("receipt_upload_id", id).order("created_at", { ascending: false }).limit(1),
      supabase.from("receipt_validation_results").select("*").eq("receipt_upload_id", id).order("severity"),
      supabase.from("properties").select("id,name").order("name"),
      supabase.from("owners").select("id,name").order("name"),
      supabase.from("tenants").select("id,name").order("name"),
      supabase.from("units").select("id,unit_label").order("unit_label"),
      supabase.from("vendors").select("id,name").order("name"),
    ]);

  const extraction = (extRows ?? [])[0] as { normalized_json: Norm | null; extraction_confidence: number | null } | undefined;
  const norm = (extraction?.normalized_json ?? {}) as Norm;
  const validations = (valRows ?? []) as Validation[];
  const imageUrl = isImageMime(receipt.file_mime_type) ? await signedUrl(supabase, RECEIPTS_BUCKET, receipt.file_path, 300) : null;

  const opt = (rows: unknown) =>
    ((rows ?? []) as { id: string; name?: string; unit_label?: string }[]).map((r) => (
      <option key={r.id} value={r.id}>{r.name ?? r.unit_label}</option>
    ));

  const isFinal = ["reviewed", "posted", "rejected"].includes(receipt.status);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/receipts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to receipts
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Review receipt</h1>
          <p className="mt-1 text-sm text-slate capitalize">
            Status: {receipt.status.replace(/_/g, " ")}
            {receipt.risk_level ? ` · risk: ${receipt.risk_level}` : ""}
            {receipt.overall_confidence != null ? ` · confidence: ${Math.round(receipt.overall_confidence * 100)}%` : ""}
          </p>
        </div>
        <form action={runExtraction.bind(null, id)}>
          <button type="submit" className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-medium text-navy hover:bg-surface-gray">
            <Icon name="refresh" size={18} /> Re-run AI
          </button>
        </form>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Image + validations */}
        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Receipt" className="max-h-[520px] w-full object-contain bg-surface-gray" />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate">
                <Icon name="description" size={36} />
                <p className="text-sm">{receipt.file_name ?? "File"} — preview not available (manual entry)</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-display text-base font-semibold text-navy">Validation</h2>
            {validations.length === 0 ? (
              <p className="mt-3 text-sm text-slate">No validations recorded (manual entry or not yet extracted).</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {validations.map((v) => (
                  <li key={v.id} className="flex items-start gap-2 text-sm">
                    <Icon
                      name={v.passed ? "check_circle" : v.severity === "warning" ? "warning" : "error"}
                      size={18}
                      className={v.passed ? "mt-0.5 text-available" : v.severity === "warning" ? "mt-0.5 text-reserved" : "mt-0.5 text-error"}
                    />
                    <span className={v.passed ? "text-slate" : "text-ink"}>{v.message ?? v.validation_rule_code}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Editable extracted fields → create expense */}
        <div className="rounded-lg border border-line bg-surface p-6">
          <div className="mb-4 flex items-center gap-2 rounded-md bg-reserved/10 px-3 py-2 text-xs text-reserved">
            <Icon name="smart_toy" size={16} />
            AI-extracted, pending review. Verify every value before approving — the ledger is the source of truth.
          </div>

          {isFinal && (
            <p className="mb-4 rounded-md bg-surface-gray px-3 py-2 text-sm text-slate">
              This receipt is <span className="font-medium capitalize">{receipt.status}</span>. Re-run AI to reopen extraction.
            </p>
          )}

          <form action={approveExtraction.bind(null, id)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-navy">Description</span>
              <input name="description" defaultValue={norm.vendor_name ?? ""} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Expense date</span>
              <input name="expense_date" type="date" defaultValue={norm.receipt_date ?? ""} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Category</span>
              <input name="category" defaultValue={norm.expense_category_suggestion ?? ""} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Subtotal (₱)</span>
              <input name="amount" type="number" step="0.01" defaultValue={norm.subtotal ?? undefined} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">VAT (₱)</span>
              <input name="vat_amount" type="number" step="0.01" defaultValue={norm.vat_amount ?? undefined} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Total (₱)</span>
              <input name="total_amount" type="number" step="0.01" defaultValue={norm.total_amount ?? undefined} required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Charge to</span>
              <select name="charge_to" defaultValue={norm.charge_to ?? "company"} className={inputCls}>
                {["company", "owner", "tenant", "split"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Vendor</span>
              <select name="vendor_id" className={inputCls} defaultValue={receipt.related_vendor_id ?? ""}>
                <option value="">—</option>{opt(vendors)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Property</span>
              <select name="property_id" className={inputCls} defaultValue={receipt.related_property_id ?? ""}>
                <option value="">—</option>{opt(props)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Unit</span>
              <select name="unit_id" className={inputCls}>
                <option value="">—</option>{opt(units)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Owner</span>
              <select name="owner_id" className={inputCls} defaultValue={receipt.related_owner_id ?? ""}>
                <option value="">—</option>{opt(owners)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Tenant</span>
              <select name="tenant_id" className={inputCls}>
                <option value="">—</option>{opt(tenants)}
              </select>
            </label>

            <div className="sm:col-span-2">
              <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800">
                <Icon name="check" size={18} /> Approve &amp; create expense
              </button>
            </div>
          </form>

          <form action={rejectReceipt.bind(null, id)} className="mt-6 flex items-end gap-3 border-t border-line pt-5">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Reject reason</span>
              <input name="reason" placeholder="e.g. duplicate, illegible" className={inputCls} />
            </label>
            <button type="submit" className="inline-flex items-center gap-2 rounded-md border border-error px-4 py-2.5 text-sm font-medium text-error hover:bg-error-bg">
              <Icon name="block" size={18} /> Reject
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
