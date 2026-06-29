"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";
import { uploadReceipt, type UploadReceiptState } from "@/app/admin/finance-actions";

const inputCls =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";

type SelectOption = { id: string; name: string };

export function ReceiptUploadForm({
  aiEnabled,
  properties,
  owners,
  vendors,
  units,
  tenants,
}: {
  aiEnabled: boolean;
  properties: SelectOption[];
  owners: SelectOption[];
  vendors: SelectOption[];
  units: SelectOption[];
  tenants: SelectOption[];
}) {
  const [state, action, pending] = useActionState<UploadReceiptState, FormData>(
    uploadReceipt,
    {}
  );

  return (
    <>
      <p className="mt-1 text-sm text-slate">
        {aiEnabled
          ? "Image receipts (JPG/PNG) are auto-extracted by AI, then validated and queued for your review."
          : "AI extraction is off (no OPENAI_API_KEY). The receipt will be queued for manual entry."}
      </p>

      <form action={action} className="mt-6 flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Receipt file</span>
          <input
            name="file"
            type="file"
            accept="image/*,application/pdf"
            required
            className="text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-800"
          />
          <span className="text-xs text-slate">JPG/PNG get AI extraction. PDFs are accepted but go to manual entry.</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Property (optional)</span>
          <select name="related_property_id" className={inputCls}>
            <option value="">—</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Owner (optional)</span>
          <select name="related_owner_id" className={inputCls}>
            <option value="">—</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Unit (optional)</span>
          <select name="related_unit_id" className={inputCls}>
            <option value="">—</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Tenant (optional)</span>
          <select name="related_tenant_id" className={inputCls}>
            <option value="">—</option>
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Vendor (optional)</span>
          <select name="related_vendor_id" className={inputCls}>
            <option value="">—</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Notes (optional)</span>
          <input name="notes" className={inputCls} />
        </label>

        {state.error && (
          <div className="flex items-start gap-2 rounded-md border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
            <Icon name="error" size={18} className="mt-0.5 shrink-0" />
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
        >
          {pending ? (
            <><Icon name="progress_activity" size={18} className="animate-spin" /> Uploading…</>
          ) : (
            <><Icon name="upload" size={18} /> Upload &amp; extract</>
          )}
        </button>
      </form>
    </>
  );
}
