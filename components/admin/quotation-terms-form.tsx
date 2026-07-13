"use client";

import { useState } from "react";
import { F, Group, inputCls, SubmitButton } from "@/components/admin/form-kit";
import { FURNITURE_ITEMS, APPLIANCE_ITEMS, FIXTURE_ITEMS } from "@/lib/pm/annex-b-fields";
import {
  LINE_ITEM_CATEGORIES, computeCategoryTotals, computeGrandTotal, formatPeso,
  type QuotationLineItem, type ProgressMilestone, type LineItemCategory,
} from "@/lib/quotation/totals";

export type QuotationTermsInitial = {
  recipientNameHint: string;
  recipientEmail: string;
  recipientPhoneHint: string;
  recipientAddressHint: string;
  quotationDate: string;
  validUntil: string;
  title: string;
  propertyReference: string;
  lineItems: QuotationLineItem[];
  scopeOfWork: string;
  paymentTermsType: "cash" | "progress_billing" | "";
  paymentTermsNotes: string;
  progressMilestones: ProgressMilestone[];
};

function emptyQuotationTerms(): QuotationTermsInitial {
  return {
    recipientNameHint: "", recipientEmail: "", recipientPhoneHint: "", recipientAddressHint: "",
    quotationDate: new Date().toISOString().slice(0, 10), validUntil: "",
    title: "", propertyReference: "",
    lineItems: [],
    scopeOfWork: "",
    paymentTermsType: "cash",
    paymentTermsNotes: "",
    progressMilestones: [],
  };
}

const emptyLineItem = (category: LineItemCategory): QuotationLineItem => ({
  category, description: "", quantity: 1, unit: "pc", unitPrice: 0, amount: 0, notes: "",
});

export function QuotationTermsForm({
  action, initial = null, submitLabel, lockRecipient = false,
}: {
  action: (fd: FormData) => Promise<void>;
  /** null = blank create form (server components can't call client helpers). */
  initial?: QuotationTermsInitial | null;
  submitLabel: string;
  /** On the edit form the recipient email can't change (the link is already out). */
  lockRecipient?: boolean;
}) {
  const [t, setT] = useState(initial ?? emptyQuotationTerms());
  const [init] = useState(t);
  const set = (patch: Partial<QuotationTermsInitial>) => setT((prev) => ({ ...prev, ...patch }));

  function setLineItem(i: number, patch: Partial<QuotationLineItem>) {
    setT((prev) => {
      const lineItems = prev.lineItems.map((r, j) => {
        if (j !== i) return r;
        const next = { ...r, ...patch };
        next.amount = Math.round(next.quantity * next.unitPrice * 100) / 100;
        return next;
      });
      return { ...prev, lineItems };
    });
  }

  function addLineItem(category: LineItemCategory) {
    set({ lineItems: [...t.lineItems, emptyLineItem(category)] });
  }

  function addSuggested(category: LineItemCategory, items: readonly [string, string][]) {
    set({
      lineItems: [
        ...t.lineItems,
        ...items.map(([, label]) => ({ ...emptyLineItem(category), description: label })),
      ],
    });
  }

  function setMilestone(i: number, patch: Partial<ProgressMilestone>) {
    set({ progressMilestones: t.progressMilestones.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }

  const categoryTotals = computeCategoryTotals(t.lineItems);
  const grandTotal = computeGrandTotal(t.lineItems);

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="line_items" value={JSON.stringify(t.lineItems)} />
      <input type="hidden" name="progress_milestones" value={JSON.stringify(t.progressMilestones)} />
      {lockRecipient && <input type="hidden" name="recipient_email" value={init.recipientEmail} />}

      <Group title="Recipient">
        <F label="Recipient name" hint="Owner, or anyone the quotation is being proposed to">
          <input name="recipient_name_hint" defaultValue={init.recipientNameHint} className={inputCls} />
        </F>
        <F label="Recipient email" hint={lockRecipient ? "The signing link was already issued to this address" : "The signing link is sent here"}>
          <input name="recipient_email" type="email" required defaultValue={init.recipientEmail} disabled={lockRecipient} className={inputCls} />
        </F>
        <F label="Recipient phone">
          <input name="recipient_phone_hint" defaultValue={init.recipientPhoneHint} className={inputCls} />
        </F>
        <F label="Recipient address" span>
          <input name="recipient_address_hint" defaultValue={init.recipientAddressHint} className={inputCls} />
        </F>
      </Group>

      <Group title="Quotation details">
        <F label="Quotation date">
          <input name="quotation_date" type="date" defaultValue={init.quotationDate} className={inputCls} />
        </F>
        <F label="Valid until">
          <input name="valid_until" type="date" defaultValue={init.validUntil} className={inputCls} />
        </F>
        <F label="Title" hint="Short subject line, e.g. 'Unit 501 Furnishing Package'" span>
          <input name="title" defaultValue={init.title} className={inputCls} />
        </F>
        <F label="Property reference" hint="Free text, e.g. 'Unit 501, ABC Tower'" span>
          <input name="property_reference" defaultValue={init.propertyReference} className={inputCls} />
        </F>
      </Group>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Line items</legend>

        {LINE_ITEM_CATEGORIES.map(({ value, label }) => {
          const rows = t.lineItems
            .map((r, i) => ({ r, i }))
            .filter(({ r }) => r.category === value);
          return (
            <div key={value} className="mb-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-navy">{label}</h3>
                <div className="flex items-center gap-3">
                  {value === "furnishing" && (
                    <>
                      <button type="button" onClick={() => addSuggested("furnishing", FURNITURE_ITEMS)} className="text-xs font-semibold text-navy-700 underline">
                        + Furniture
                      </button>
                      <button type="button" onClick={() => addSuggested("furnishing", APPLIANCE_ITEMS)} className="text-xs font-semibold text-navy-700 underline">
                        + Appliances
                      </button>
                      <button type="button" onClick={() => addSuggested("furnishing", FIXTURE_ITEMS)} className="text-xs font-semibold text-navy-700 underline">
                        + Fixtures
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => addLineItem(value)} className="text-xs font-semibold text-navy-700 underline">
                    Add row
                  </button>
                </div>
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-slate">No items yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="hidden grid-cols-[2fr_0.6fr_0.8fr_1fr_1fr_2rem] gap-2 text-xs font-semibold text-slate sm:grid">
                    <span>Description</span><span>Qty</span><span>Unit</span><span>Unit price</span><span>Amount</span><span />
                  </div>
                  {rows.map(({ r, i }) => (
                    <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_0.6fr_0.8fr_1fr_1fr_2rem]">
                      <input aria-label="Description" value={r.description} onChange={(e) => setLineItem(i, { description: e.target.value })} className={inputCls} />
                      <input aria-label="Quantity" type="number" min={0} value={r.quantity} onChange={(e) => setLineItem(i, { quantity: Number(e.target.value) || 0 })} className={inputCls} />
                      <input aria-label="Unit" value={r.unit} onChange={(e) => setLineItem(i, { unit: e.target.value })} className={inputCls} />
                      <input aria-label="Unit price" type="number" min={0} step="0.01" value={r.unitPrice} onChange={(e) => setLineItem(i, { unitPrice: Number(e.target.value) || 0 })} className={inputCls} />
                      <input aria-label="Amount" readOnly value={formatPeso(r.amount)} className={`${inputCls} bg-surface-gray`} />
                      <button
                        type="button"
                        aria-label="Remove row"
                        onClick={() => set({ lineItems: t.lineItems.filter((_, j) => j !== i) })}
                        className="self-center text-sm font-semibold text-slate hover:text-error"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-right text-sm text-slate">
                Subtotal: <span className="font-semibold text-navy">{formatPeso(categoryTotals[value])}</span>
              </p>
            </div>
          );
        })}

        <div className="border-t border-line pt-3 text-right">
          <span className="text-sm text-slate">Grand total: </span>
          <span className="font-display text-lg font-bold text-navy">{formatPeso(grandTotal)}</span>
        </div>
      </fieldset>

      <Group title="Scope of work">
        <F label="Describe the overall scope of work" span>
          <textarea
            name="scope_of_work"
            rows={5}
            defaultValue={init.scopeOfWork}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
          />
        </F>
      </Group>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Payment terms</legend>
        <div className="mb-4 flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio" name="payment_terms_type" value="cash"
              checked={t.paymentTermsType === "cash"}
              onChange={() => set({ paymentTermsType: "cash" })}
              className="accent-navy"
            />
            Cash
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio" name="payment_terms_type" value="progress_billing"
              checked={t.paymentTermsType === "progress_billing"}
              onChange={() => set({ paymentTermsType: "progress_billing" })}
              className="accent-navy"
            />
            Progress billing
          </label>
        </div>

        {t.paymentTermsType === "cash" ? (
          <F label="Cash payment notes" span>
            <textarea
              name="payment_terms_notes"
              rows={3}
              value={t.paymentTermsNotes}
              onChange={(e) => set({ paymentTermsNotes: e.target.value })}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
            />
          </F>
        ) : (
          <div>
            <p className="mb-2 text-xs text-slate">Milestone-based schedule — e.g. &quot;50% upon signing, 30% at midpoint, 20% on completion&quot;.</p>
            {t.progressMilestones.length === 0 ? (
              <p className="text-sm text-slate">No milestones yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="hidden grid-cols-[2fr_1fr_2fr_2rem] gap-2 text-xs font-semibold text-slate sm:grid">
                  <span>Milestone</span><span>% or amount</span><span>Trigger condition</span><span />
                </div>
                {t.progressMilestones.map((m, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_2fr_2rem]">
                    <input aria-label="Milestone" value={m.description} onChange={(e) => setMilestone(i, { description: e.target.value })} className={inputCls} />
                    <input aria-label="% or amount" value={m.percentageOrAmount} onChange={(e) => setMilestone(i, { percentageOrAmount: e.target.value })} className={inputCls} />
                    <input aria-label="Trigger condition" value={m.triggerCondition} onChange={(e) => setMilestone(i, { triggerCondition: e.target.value })} className={inputCls} />
                    <button
                      type="button"
                      aria-label="Remove milestone"
                      onClick={() => set({ progressMilestones: t.progressMilestones.filter((_, j) => j !== i) })}
                      className="self-center text-sm font-semibold text-slate hover:text-error"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => set({ progressMilestones: [...t.progressMilestones, { description: "", percentageOrAmount: "", triggerCondition: "" }] })}
              className="mt-3 text-xs font-semibold text-navy-700 underline"
            >
              Add milestone
            </button>
          </div>
        )}
      </fieldset>

      <div>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
