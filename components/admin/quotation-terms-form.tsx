"use client";

import { useRef, useState } from "react";
import { F, Group, inputCls, SubmitButton } from "@/components/admin/form-kit";
import { Icon } from "@/components/icon";
import { FURNITURE_ITEMS, APPLIANCE_ITEMS, FIXTURE_ITEMS } from "@/lib/pm/annex-b-fields";
import { generateQuotationScope } from "@/app/admin/quotations-actions";
import { DEFAULT_BANK_DETAILS } from "@/lib/pm/tenancy-clauses";
import {
  LINE_ITEM_CATEGORIES, computeCategoryTotals, computeGrandTotal, resolveGrandTotal, formatPeso,
  type QuotationLineItem, type ProgressMilestone, type LineItemCategory, type LineItemPricingMode,
  type QuotationBankDetails,
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
  grandTotalOverride: number | null;
  scopeOfWork: string;
  notes: string;
  paymentTermsType: "cash" | "progress_billing" | "";
  paymentTermsNotes: string;
  progressMilestones: ProgressMilestone[];
  termsPayment: string;
  termsCompletion: string;
  termsWarranty: string;
  termsValidity: string;
  bankDetails: QuotationBankDetails;
};

function emptyQuotationTerms(): QuotationTermsInitial {
  return {
    recipientNameHint: "", recipientEmail: "", recipientPhoneHint: "", recipientAddressHint: "",
    quotationDate: new Date().toISOString().slice(0, 10), validUntil: "",
    title: "", propertyReference: "",
    lineItems: [],
    grandTotalOverride: null,
    scopeOfWork: "",
    notes: "",
    paymentTermsType: "cash",
    paymentTermsNotes: "",
    progressMilestones: [],
    termsPayment: "Payment shall be made in accordance with the Payment Terms specified above.",
    termsCompletion: "Work shall commence within [X] days of downpayment and be completed within [Y] calendar days, subject to material availability.",
    termsWarranty: "Labor is warranted for 30 days from completion date. Materials are covered under the applicable manufacturer's warranty.",
    termsValidity: "This quotation is valid for 30 days from the date issued, or until the date indicated above, whichever comes first.",
    bankDetails: { ...DEFAULT_BANK_DETAILS },
  };
}

const emptyLineItem = (category: LineItemCategory): QuotationLineItem => ({
  category, pricingMode: "unit", item: "", description: "", quantity: 1, unit: "pc", unitPrice: 0, amount: 0,
});

const FURNISHING_PICKER_GROUPS: { label: string; items: readonly [string, string][] }[] = [
  { label: "Furniture", items: FURNITURE_ITEMS },
  { label: "Appliances", items: APPLIANCE_ITEMS },
  { label: "Fixtures", items: FIXTURE_ITEMS },
];

export function QuotationTermsForm({
  action, initial = null, submitLabel, lockRecipient = false, aiEnabled = false,
}: {
  action: (fd: FormData) => Promise<void>;
  /** null = blank create form (server components can't call client helpers). */
  initial?: QuotationTermsInitial | null;
  submitLabel: string;
  /** On the edit form the recipient email can't change (the link is already out). */
  lockRecipient?: boolean;
  /** Whether OPENAI_API_KEY is configured server-side — hides the AI-generate button otherwise. */
  aiEnabled?: boolean;
}) {
  const [t, setT] = useState(initial ?? emptyQuotationTerms());
  const [init] = useState(t);
  const set = (patch: Partial<QuotationTermsInitial>) => setT((prev) => ({ ...prev, ...patch }));

  const [furnishingPick, setFurnishingPick] = useState("");
  const scopeRef = useRef<HTMLTextAreaElement>(null);
  const [genPending, setGenPending] = useState(false);
  const [genError, setGenError] = useState("");

  function setLineItem(i: number, patch: Partial<QuotationLineItem>) {
    setT((prev) => {
      const lineItems = prev.lineItems.map((r, j) => {
        if (j !== i) return r;
        const next = { ...r, ...patch };
        if (next.pricingMode === "unit") {
          next.amount = Math.round(next.quantity * next.unitPrice * 100) / 100;
        }
        return next;
      });
      return { ...prev, lineItems };
    });
  }

  function addLineItem(category: LineItemCategory, item = "") {
    set({ lineItems: [...t.lineItems, { ...emptyLineItem(category), item }] });
  }

  function addPickedFurnishing() {
    if (!furnishingPick) return;
    addLineItem("furnishing", furnishingPick);
    setFurnishingPick("");
  }

  function setMilestone(i: number, patch: Partial<ProgressMilestone>) {
    set({ progressMilestones: t.progressMilestones.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }

  async function handleGenerateScope() {
    setGenError("");
    setGenPending(true);
    try {
      const result = await generateQuotationScope({
        title: t.title || undefined,
        propertyReference: t.propertyReference || undefined,
        paymentTermsType: t.paymentTermsType || undefined,
        lineItems: t.lineItems.map((li) => ({
          category: li.category, item: li.item, description: li.description, quantity: li.quantity, unit: li.unit,
        })),
      });
      if (!result) {
        setGenError("Couldn't generate a scope of work right now — please try again.");
        return;
      }
      if (scopeRef.current) scopeRef.current.value = result;
    } catch {
      setGenError("Couldn't generate a scope of work right now — please try again.");
    } finally {
      setGenPending(false);
    }
  }

  const categoryTotals = computeCategoryTotals(t.lineItems);
  const computedTotal = computeGrandTotal(t.lineItems);
  const grandTotal = resolveGrandTotal(t.lineItems, t.grandTotalOverride);
  const overrideOn = t.grandTotalOverride != null;

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
                <div className="flex flex-wrap items-center gap-3">
                  {value === "furnishing" && (
                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Pick a suggested furnishing item"
                        value={furnishingPick}
                        onChange={(e) => setFurnishingPick(e.target.value)}
                        className={`${inputCls} h-9 w-48`}
                      >
                        <option value="">Select an item…</option>
                        {FURNISHING_PICKER_GROUPS.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.items.map(([key, itemLabel]) => (
                              <option key={key} value={itemLabel}>{itemLabel}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addPickedFurnishing}
                        disabled={!furnishingPick}
                        className="text-xs font-semibold text-navy-700 underline disabled:opacity-40"
                      >
                        Add item
                      </button>
                    </div>
                  )}
                  <button type="button" onClick={() => addLineItem(value)} className="text-xs font-semibold text-navy-700 underline">
                    Add row
                  </button>
                </div>
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-slate">No items yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {rows.map(({ r, i }) => {
                    const lumpSum = r.pricingMode === "lump_sum";
                    return (
                      <div key={i} className="rounded-md border border-line bg-cream/40 p-2.5">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_2rem]">
                          <input
                            aria-label="Item"
                            placeholder="Item, e.g. Sofa"
                            value={r.item}
                            onChange={(e) => setLineItem(i, { item: e.target.value })}
                            className={`${inputCls} font-medium`}
                          />
                          <select
                            aria-label="Pricing mode"
                            value={r.pricingMode}
                            onChange={(e) => setLineItem(i, { pricingMode: e.target.value as LineItemPricingMode })}
                            className={inputCls}
                          >
                            <option value="unit">Per unit</option>
                            <option value="lump_sum">Lump sum</option>
                          </select>
                          <button
                            type="button"
                            aria-label="Remove row"
                            onClick={() => set({ lineItems: t.lineItems.filter((_, j) => j !== i) })}
                            className="self-center text-sm font-semibold text-slate hover:text-error"
                          >
                            ×
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[2fr_0.6fr_0.7fr_0.9fr_0.9fr]">
                          <input
                            aria-label="Description"
                            placeholder="Description — brand, model, specifics"
                            value={r.description}
                            onChange={(e) => setLineItem(i, { description: e.target.value })}
                            className={`${inputCls} col-span-2 sm:col-span-1`}
                          />
                          <input
                            aria-label="Quantity" type="number" min={0}
                            value={r.quantity}
                            onChange={(e) => setLineItem(i, { quantity: Number(e.target.value) || 0 })}
                            className={inputCls}
                          />
                          <input
                            aria-label="Unit" disabled={lumpSum}
                            value={lumpSum ? "" : r.unit}
                            onChange={(e) => setLineItem(i, { unit: e.target.value })}
                            className={`${inputCls} ${lumpSum ? "bg-surface-gray" : ""}`}
                          />
                          <input
                            aria-label="Unit price" type="number" min={0} step="0.01" disabled={lumpSum}
                            value={lumpSum ? "" : r.unitPrice}
                            onChange={(e) => setLineItem(i, { unitPrice: Number(e.target.value) || 0 })}
                            className={`${inputCls} ${lumpSum ? "bg-surface-gray" : ""}`}
                          />
                          {lumpSum ? (
                            <input
                              aria-label="Amount" type="number" min={0} step="0.01"
                              value={r.amount}
                              onChange={(e) => setLineItem(i, { amount: Number(e.target.value) || 0 })}
                              className={inputCls}
                            />
                          ) : (
                            <input aria-label="Amount" readOnly value={formatPeso(r.amount)} className={`${inputCls} bg-surface-gray`} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 text-right text-sm text-slate">
                Subtotal: <span className="font-semibold text-navy">{formatPeso(categoryTotals[value])}</span>
              </p>
            </div>
          );
        })}

        <input type="hidden" name="grand_total_override" value={overrideOn ? String(t.grandTotalOverride) : ""} />
        <div className="border-t border-line pt-3">
          <label className="flex items-center justify-end gap-2 text-sm">
            <input
              type="checkbox"
              checked={overrideOn}
              onChange={(e) => set({ grandTotalOverride: e.target.checked ? computedTotal : null })}
              className="h-4 w-4 accent-navy"
            />
            <span className="text-slate">Override grand total (e.g. a package/discounted price)</span>
          </label>
          <div className="mt-2 flex items-center justify-end gap-3">
            {overrideOn ? (
              <>
                <span className="text-xs text-slate">Itemized sum: {formatPeso(computedTotal)}</span>
                <input
                  type="number" min={0} step="0.01"
                  aria-label="Custom grand total"
                  value={t.grandTotalOverride ?? 0}
                  onChange={(e) => set({ grandTotalOverride: Number(e.target.value) || 0 })}
                  className={`${inputCls} w-40 text-right`}
                />
              </>
            ) : (
              <>
                <span className="text-sm text-slate">Grand total: </span>
                <span className="font-display text-lg font-bold text-navy">{formatPeso(grandTotal)}</span>
              </>
            )}
          </div>
        </div>
      </fieldset>

      <Group title="Scope of work">
        <div className="sm:col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-navy">Describe the overall scope of work</span>
            {aiEnabled && (
              <button
                type="button"
                onClick={handleGenerateScope}
                disabled={genPending}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-navy disabled:opacity-50"
              >
                <Icon name={genPending ? "progress_activity" : "auto_awesome"} size={16} className={genPending ? "animate-spin" : ""} />
                {genPending ? "Generating…" : "Generate with AI"}
              </button>
            )}
          </div>
          <textarea
            ref={scopeRef}
            name="scope_of_work"
            rows={5}
            defaultValue={init.scopeOfWork}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
          />
          {genError && <p role="alert" className="mt-1 text-xs text-error">{genError}</p>}
        </div>
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

      <Group title="Bank Details for Payment">
        <F label="Account name">
          <input name="bank_name" defaultValue={init.bankDetails.name} className={inputCls} />
        </F>
        <F label="Bank">
          <input name="bank_bank" value={t.bankDetails.bank} onChange={(e) => set({ bankDetails: { ...t.bankDetails, bank: e.target.value } })} className={inputCls} />
        </F>
        <F label="Branch">
          <input name="bank_branch" value={t.bankDetails.branch} onChange={(e) => set({ bankDetails: { ...t.bankDetails, branch: e.target.value } })} className={inputCls} />
        </F>
        <F label="Account number">
          <input name="bank_account_number" defaultValue={init.bankDetails.accountNumber} className={inputCls} />
        </F>
      </Group>

      <Group title="Terms & Conditions">
        <F label="Payment terms" span>
          <textarea
            name="terms_payment" rows={2} defaultValue={init.termsPayment}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
          />
        </F>
        <F label="Completion timeline" span>
          <textarea
            name="terms_completion" rows={2} defaultValue={init.termsCompletion}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
          />
        </F>
        <F label="Warranty" span>
          <textarea
            name="terms_warranty" rows={2} defaultValue={init.termsWarranty}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
          />
        </F>
        <F label="Quotation validity" span>
          <textarea
            name="terms_validity" rows={2} defaultValue={init.termsValidity}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
          />
        </F>
      </Group>

      <Group title="Notes">
        <F label="Additional notes" hint="Printed on the quotation, visible to the recipient" span>
          <textarea
            name="notes" rows={3} defaultValue={init.notes}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
          />
        </F>
      </Group>

      <div>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
