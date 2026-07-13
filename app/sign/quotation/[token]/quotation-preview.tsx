import {
  LINE_ITEM_CATEGORIES, computeCategoryTotals, computeGrandTotal, formatPeso,
} from "@/lib/quotation/totals";
import type { QuotationRecord } from "@/app/sign/quotation-actions";

export function QuotationPreview({ record }: { record: QuotationRecord }) {
  const lineItems = record.line_items ?? [];
  const categoryTotals = computeCategoryTotals(lineItems);
  const grandTotal = computeGrandTotal(lineItems);
  const rd = record.recipient_details ?? {};
  const tcRows = [
    ["Payment terms", record.terms_payment],
    ["Completion timeline", record.terms_completion],
    ["Warranty", record.terms_warranty],
    ["Quotation validity", record.terms_validity],
  ] as const;

  return (
    <div className="flex flex-col gap-4 text-sm text-ink">
      <div>
        <p className="font-display text-base font-bold text-navy">{record.quotation_number}</p>
        {record.title && <p className="text-slate">{record.title}</p>}
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate">
          {record.quotation_date && <span>Date: {record.quotation_date}</span>}
          {record.valid_until && <span>Valid until: {record.valid_until}</span>}
          {record.property_reference && <span className="col-span-2">Property: {record.property_reference}</span>}
        </div>
      </div>

      <div>
        <p className="font-semibold text-navy">To</p>
        <p>{rd.name || record.recipient_name_hint || record.recipient_email}</p>
        {rd.address && <p className="text-slate">{rd.address}</p>}
        {rd.phone && <p className="text-slate">{rd.phone}</p>}
        <p className="text-slate">{rd.email || record.recipient_email}</p>
      </div>

      {LINE_ITEM_CATEGORIES.map(({ value, label }) => {
        const rows = lineItems.filter((r) => r.category === value);
        if (rows.length === 0) return null;
        return (
          <div key={value}>
            <p className="font-semibold text-navy">{label}</p>
            <div className="mt-1 flex flex-col gap-1">
              {rows.map((r, i) => (
                <div key={i} className="flex justify-between gap-2 border-b border-line pb-1">
                  <span className="text-slate">
                    {r.description || "—"} ({r.pricingMode === "lump_sum" ? "lump sum" : `${r.quantity} ${r.unit}`})
                  </span>
                  <span className="font-medium">{formatPeso(r.amount)}</span>
                </div>
              ))}
            </div>
            <p className="mt-1 text-right text-xs text-slate">Subtotal: {formatPeso(categoryTotals[value])}</p>
          </div>
        );
      })}

      <div className="flex justify-between border-t border-line pt-2 font-semibold text-navy">
        <span>Grand total</span>
        <span>{formatPeso(grandTotal)}</span>
      </div>

      {record.scope_of_work && (
        <div>
          <p className="font-semibold text-navy">Scope of work</p>
          <p className="whitespace-pre-wrap text-slate">{record.scope_of_work}</p>
        </div>
      )}

      <div>
        <p className="font-semibold text-navy">Payment terms</p>
        {record.payment_terms_type === "progress_billing" ? (
          <div className="mt-1 flex flex-col gap-1">
            {(record.progress_milestones ?? []).map((m, i) => (
              <div key={i} className="flex justify-between gap-2 text-slate">
                <span>{m.description}</span>
                <span>{m.percentageOrAmount}{m.triggerCondition ? ` — ${m.triggerCondition}` : ""}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-slate">{record.payment_terms_notes || "Cash payment."}</p>
        )}
      </div>

      {tcRows.some(([, text]) => !!text) && (
        <div>
          <p className="font-semibold text-navy">Terms &amp; Conditions</p>
          <div className="mt-1 flex flex-col gap-1.5">
            {tcRows.map(([label, text]) => text ? (
              <div key={label}>
                <span className="font-medium text-navy">{label}: </span>
                <span className="text-slate">{text}</span>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {record.notes && (
        <div>
          <p className="font-semibold text-navy">Notes</p>
          <p className="whitespace-pre-wrap text-slate">{record.notes}</p>
        </div>
      )}
    </div>
  );
}
