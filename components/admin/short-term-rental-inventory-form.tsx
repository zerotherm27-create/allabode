"use client";

import { useState } from "react";
import { inputCls, SubmitButton } from "@/components/admin/form-kit";
import { type StrInventoryRow } from "@/lib/pm/short-term-rental-clauses";
import {
  applianceBrandOptionsForParticulars,
  DEFAULT_APPLIANCE_BRAND_OPTIONS,
  type ApplianceBrandOptions,
} from "@/lib/pm/appliance-brand-catalog";

/**
 * Staff-only pre-fill of Annex A (Rental Agreement Checklist — quantity /
 * particulars / brand / remarks). Editable until the agreement completes;
 * rows left blank print as blank lines like the paper form.
 */
export function StrInventoryForm({
  action, initial, warnTenantSigned, brandOptions = DEFAULT_APPLIANCE_BRAND_OPTIONS,
}: {
  action: (fd: FormData) => Promise<void>;
  initial: StrInventoryRow[] | null;
  warnTenantSigned?: boolean;
  brandOptions?: ApplianceBrandOptions;
}) {
  const [rows, setRows] = useState<StrInventoryRow[]>(initial?.length ? initial : []);

  function setRow(i: number, patch: Partial<StrInventoryRow>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  return (
    <details className="rounded-lg border border-line bg-surface p-5">
      <summary className="cursor-pointer font-display text-sm font-semibold text-navy">
        Annex A — Rental Agreement Checklist
      </summary>
      <p className="mt-2 text-xs text-slate">
        The furnishing checklist the tenant confirms at Check-in. Blank rows print as blank lines to be completed at
        turnover.
      </p>
      {warnTenantSigned && (
        <p className="mt-2 rounded-md bg-gold/10 px-3 py-2 text-xs text-gold-bright">
          The tenant has already signed — checklist changes still print in the final PDF, so only correct or
          complete items the tenant is aware of.
        </p>
      )}
      <form action={action} className="mt-4">
        <input type="hidden" name="inventory" value={JSON.stringify(rows.filter((r) => r.particulars.trim()))} />
        <div className="flex flex-col gap-2">
          <div className="hidden grid-cols-[4.5rem_1.2fr_1fr_1.6fr_2rem] gap-2 text-xs font-semibold text-slate sm:grid">
            <span>Qty</span><span>Particulars</span><span>Brand</span><span>Remarks</span><span />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[4.5rem_1.2fr_1fr_1.6fr_2rem]">
              <input aria-label="Quantity" value={r.quantity} onChange={(e) => setRow(i, { quantity: e.target.value })} className={inputCls} />
              <input aria-label="Particulars" value={r.particulars} onChange={(e) => setRow(i, { particulars: e.target.value })} className={inputCls} />
              <input aria-label="Brand" value={r.brand} onChange={(e) => setRow(i, { brand: e.target.value })} list={`str_inventory_brand_${i}`} className={inputCls} />
              <datalist id={`str_inventory_brand_${i}`}>
                {applianceBrandOptionsForParticulars(brandOptions, r.particulars).map((brand) => <option key={brand} value={brand} />)}
              </datalist>
              <input aria-label="Remarks" value={r.remarks} onChange={(e) => setRow(i, { remarks: e.target.value })} className={inputCls} />
              <button
                type="button"
                aria-label="Remove row"
                onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                className="self-center text-sm font-semibold text-slate hover:text-error"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { quantity: "", particulars: "", brand: "", remarks: "" }])}
          className="mt-3 text-xs font-semibold text-navy-700 underline"
        >
          Add row
        </button>
        <div className="mt-4">
          <SubmitButton label="Save checklist" />
        </div>
      </form>
    </details>
  );
}
