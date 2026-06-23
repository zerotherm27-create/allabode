import Link from "next/link";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai/client";
import { uploadReceipt } from "@/app/admin/finance-actions";

const inputCls =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";

export default async function NewReceiptPage() {
  const supabase = await createClient();
  const [{ data: props }, { data: owners }, { data: vendors }] = await Promise.all([
    supabase.from("properties").select("id,name").order("name"),
    supabase.from("owners").select("id,name").order("name"),
    supabase.from("vendors").select("id,name").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/receipts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to receipts
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Upload receipt</h1>
      <p className="mt-1 text-sm text-slate">
        {isAiConfigured()
          ? "Image receipts (JPG/PNG) are auto-extracted by AI, then validated and queued for your review."
          : "AI extraction is off (no OPENAI_API_KEY). The receipt will be queued for manual entry."}
      </p>

      <form action={uploadReceipt} className="mt-6 flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Receipt file</span>
          <input name="file" type="file" accept="image/*,application/pdf" required
            className="text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-800" />
          <span className="text-xs text-slate">JPG/PNG get AI extraction. PDFs are accepted but go to manual entry.</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Property (optional)</span>
          <select name="related_property_id" className={inputCls}>
            <option value="">—</option>
            {((props ?? []) as { id: string; name: string }[]).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Owner (optional)</span>
          <select name="related_owner_id" className={inputCls}>
            <option value="">—</option>
            {((owners ?? []) as { id: string; name: string }[]).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Vendor (optional)</span>
          <select name="related_vendor_id" className={inputCls}>
            <option value="">—</option>
            {((vendors ?? []) as { id: string; name: string }[]).map((vn) => <option key={vn.id} value={vn.id}>{vn.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Notes (optional)</span>
          <input name="notes" className={inputCls} />
        </label>

        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800">
          <Icon name="upload" size={18} /> Upload &amp; extract
        </button>
      </form>
    </div>
  );
}
