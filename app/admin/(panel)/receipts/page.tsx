import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";

type Ext = { normalized_json: Record<string, unknown> | null };
type Row = {
  id: string; file_name: string | null; status: string; risk_level: string | null;
  overall_confidence: number | null; created_at: string;
  receipt_extractions: Ext | Ext[] | null;
};

const STATUS_TONE: Record<string, string> = {
  posted: "bg-available/10 text-available",
  reviewed: "bg-available/10 text-available",
  needs_review: "bg-reserved/10 text-reserved",
  validation_failed: "bg-reserved/10 text-reserved",
  duplicate_suspected: "bg-reserved/10 text-reserved",
  rejected: "bg-error-bg text-error",
  scan_failed: "bg-error-bg text-error",
};
const RISK_TONE: Record<string, string> = {
  low: "bg-available/10 text-available",
  medium: "bg-reserved/10 text-reserved",
  high: "bg-error-bg text-error",
  critical: "bg-error-bg text-error",
};
const peso = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`;

export default async function AdminReceiptsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("receipt_uploads")
    .select("id,file_name,status,risk_level,overall_confidence,created_at,receipt_extractions(normalized_json)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Receipts</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total · AI-extracted, pending review until approved</p>
        </div>
        <Link href="/admin/receipts/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800">
          <Icon name="upload" size={20} /> Upload receipt
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line bg-surface-gray text-slate">
            <tr>
              <th className="px-4 py-3 font-medium">Vendor / file</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Confidence</th>
              <th className="px-4 py-3 font-medium">Uploaded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate">No receipts yet. <Link href="/admin/receipts/new" className="text-navy-700 underline">Upload the first one</Link>.</td></tr>
            )}
            {rows.map((r) => {
              const ext = Array.isArray(r.receipt_extractions) ? r.receipt_extractions[0] : r.receipt_extractions;
              const norm = (ext?.normalized_json ?? {}) as { vendor_name?: string; total_amount?: number | null };
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/receipts/${r.id}`} className="font-medium text-navy hover:text-navy-700">
                      {norm.vendor_name || r.file_name || "Receipt"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate">{norm.total_amount != null ? peso(Number(norm.total_amount)) : "—"}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[r.status] ?? "bg-surface-gray text-slate"}`}>{r.status.replace(/_/g, " ")}</span></td>
                  <td className="px-4 py-3">{r.risk_level ? <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${RISK_TONE[r.risk_level] ?? "bg-surface-gray text-slate"}`}>{r.risk_level}</span> : "—"}</td>
                  <td className="px-4 py-3 text-slate">{r.overall_confidence != null ? `${Math.round(r.overall_confidence * 100)}%` : "—"}</td>
                  <td className="px-4 py-3 text-slate">{r.created_at.slice(0, 10)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
