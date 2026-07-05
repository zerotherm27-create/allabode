import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";

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
const norm = (r: Row) => {
  const ext = Array.isArray(r.receipt_extractions) ? r.receipt_extractions[0] : r.receipt_extractions;
  return (ext?.normalized_json ?? {}) as { vendor_name?: string; total_amount?: number | null };
};

const columns: Column<Row>[] = [
  { header: "Vendor / file", primary: true, cell: (r) => <Link href={`/admin/receipts/${r.id}`} className="font-medium text-navy hover:text-navy-700">{norm(r).vendor_name || r.file_name || "Receipt"}</Link> },
  { header: "Total", cell: (r) => <span className="text-slate">{norm(r).total_amount != null ? peso(Number(norm(r).total_amount)) : "—"}</span> },
  { header: "Status", cell: (r) => <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[r.status] ?? "bg-surface-gray text-slate"}`}>{r.status.replace(/_/g, " ")}</span> },
  { header: "Risk", cell: (r) => r.risk_level ? <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${RISK_TONE[r.risk_level] ?? "bg-surface-gray text-slate"}`}>{r.risk_level}</span> : <span className="text-slate">—</span> },
  { header: "Confidence", cell: (r) => <span className="text-slate">{r.overall_confidence != null ? `${Math.round(r.overall_confidence * 100)}%` : "—"}</span> },
  { header: "Uploaded", cell: (r) => <span className="text-slate">{r.created_at.slice(0, 10)}</span> },
];

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
        <Link href="/admin/receipts/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 press">
          <Icon name="upload" size={20} /> Upload receipt
        </Link>
      </div>
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} getKey={(r) => r.id} empty={<>No receipts yet. <Link href="/admin/receipts/new" className="text-navy-700 underline">Upload the first one</Link>.</>} />
      </div>
    </div>
  );
}
