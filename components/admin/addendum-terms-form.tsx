"use client";

import { useState } from "react";
import { F, Group, inputCls, SubmitButton } from "@/components/admin/form-kit";
import {
  DEFAULT_ADDENDUM_BANK_DETAILS, addendumRoles,
  type AddendumFeeItem, type AddendumScheduleRow, type AddendumBankDetails,
  type AddendumPartyChange, type AddendumAmendedClause, type AddendumParentType,
} from "@/lib/pm/addendum-clauses";
import type { ParentContractOption } from "@/app/admin/addendum-actions";

export type AddendumTermsInitial = {
  parentType: AddendumParentType | "";
  parentId: string;
  parentContractTitle: string;
  parentReferenceCode: string;
  parentAgreementDate: string;
  parentPropertyDescription: string;

  tenantNameHint: string;
  tenantEmail: string;
  tenantAddress: string;
  tenantContact: string;

  landlordName: string;
  landlordAddress: string;
  landlordEmail: string;

  agreementDate: string;
  effectiveDate: string;

  newStartDate: string;
  newEndDate: string;

  feeItems: AddendumFeeItem[];
  paymentSchedule: AddendumScheduleRow[];
  bankDetails: AddendumBankDetails;

  partyChanges: AddendumPartyChange[];
  amendedClauses: AddendumAmendedClause[];
};

export function emptyAddendumTerms(): AddendumTermsInitial {
  return {
    parentType: "", parentId: "",
    parentContractTitle: "", parentReferenceCode: "", parentAgreementDate: "", parentPropertyDescription: "",
    tenantNameHint: "", tenantEmail: "", tenantAddress: "", tenantContact: "",
    landlordName: "", landlordAddress: "", landlordEmail: "",
    agreementDate: "", effectiveDate: "",
    newStartDate: "", newEndDate: "",
    feeItems: [], paymentSchedule: [],
    bankDetails: { ...DEFAULT_ADDENDUM_BANK_DETAILS },
    partyChanges: [], amendedClauses: [],
  };
}

export function AddendumTermsForm({
  action, initial = null, submitLabel, parentOptions = [], lockParent = false, lockTenant = false,
}: {
  action: (fd: FormData) => Promise<void>;
  /** null = blank create form (server components can't call client helpers). */
  initial?: AddendumTermsInitial | null;
  submitLabel: string;
  parentOptions?: ParentContractOption[];
  /** The amended contract can't change once the addendum exists. */
  lockParent?: boolean;
  /** On the edit form the recipient can't change (the link is already out). */
  lockTenant?: boolean;
}) {
  const [t, setT] = useState(initial ?? emptyAddendumTerms());
  const [init] = useState(t);
  const set = (patch: Partial<AddendumTermsInitial>) => setT((prev) => ({ ...prev, ...patch }));

  const roles = addendumRoles((t.parentType || "tenancy") as AddendumParentType);

  /** Selecting a parent snapshots its identity and prefills both parties. */
  function onParentChange(key: string) {
    const opt = parentOptions.find((o) => `${o.parentType}:${o.parentId}` === key);
    if (!opt) {
      set({ parentType: "", parentId: "" });
      return;
    }
    set({
      parentType: opt.parentType,
      parentId: opt.parentId,
      parentContractTitle: opt.contractTitle,
      parentReferenceCode: opt.referenceCode,
      parentAgreementDate: opt.agreementDate?.slice(0, 10) ?? "",
      parentPropertyDescription: opt.propertyDescription,
      tenantNameHint: t.tenantNameHint || opt.counterpartyName,
      tenantEmail: t.tenantEmail || opt.counterpartyEmail,
      landlordName: t.landlordName || opt.landlordName,
    });
  }

  function setFeeItem(i: number, patch: Partial<AddendumFeeItem>) {
    set({ feeItems: t.feeItems.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }
  function setScheduleRow(i: number, patch: Partial<AddendumScheduleRow>) {
    set({ paymentSchedule: t.paymentSchedule.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }
  function setPartyChange(i: number, patch: Partial<AddendumPartyChange>) {
    set({ partyChanges: t.partyChanges.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }
  function setAmendedClause(i: number, patch: Partial<AddendumAmendedClause>) {
    set({ amendedClauses: t.amendedClauses.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }

  const feeTotal = t.feeItems.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const removeCls = "self-center text-sm font-semibold text-slate hover:text-error";
  const addCls = "mt-3 text-xs font-semibold text-navy-700 underline";

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="parent_type" value={t.parentType} />
      <input type="hidden" name="parent_id" value={t.parentId} />
      <input type="hidden" name="parent_contract_title" value={t.parentContractTitle} />
      <input type="hidden" name="parent_reference_code" value={t.parentReferenceCode} />
      <input type="hidden" name="parent_agreement_date" value={t.parentAgreementDate} />
      <input type="hidden" name="parent_property_description" value={t.parentPropertyDescription} />
      <input type="hidden" name="fee_items" value={JSON.stringify(t.feeItems.filter((r) => r.label.trim()))} />
      <input type="hidden" name="payment_schedule" value={JSON.stringify(t.paymentSchedule.filter((r) => r.dueDate.trim() || r.amount.trim()))} />
      <input type="hidden" name="party_changes" value={JSON.stringify(t.partyChanges.filter((r) => r.name.trim()))} />
      <input type="hidden" name="amended_clauses" value={JSON.stringify(t.amendedClauses.filter((r) => r.ref.trim() && r.newText.trim()))} />
      {lockTenant && <input type="hidden" name="tenant_email" value={init.tenantEmail} />}

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Contract being amended</legend>
        {lockParent ? (
          <p className="text-sm text-ink">
            <span className="font-semibold">{t.parentContractTitle}</span>
            {t.parentReferenceCode ? ` · ${t.parentReferenceCode}` : ""}
            {t.parentPropertyDescription ? ` · ${t.parentPropertyDescription}` : ""}
          </p>
        ) : (
          <>
            <F label="Original agreement" hint="Only fully executed contracts can be amended">
              <select
                aria-label="Original agreement"
                value={t.parentType && t.parentId ? `${t.parentType}:${t.parentId}` : ""}
                onChange={(e) => onParentChange(e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Select a contract…</option>
                {parentOptions.map((o) => (
                  <option key={`${o.parentType}:${o.parentId}`} value={`${o.parentType}:${o.parentId}`}>
                    {o.referenceCode} · {o.contractTitle} · {o.counterpartyName} · {o.propertyDescription}
                  </option>
                ))}
              </select>
            </F>
            {parentOptions.length === 0 && (
              <p className="mt-2 text-xs text-slate">
                There are no fully executed contracts to amend yet.
              </p>
            )}
          </>
        )}
      </fieldset>

      <Group title={roles.counterparty}>
        <F label={`${roles.counterparty} name`} hint="Used in the email greeting and as a fallback label">
          <input name="tenant_name_hint" value={t.tenantNameHint} onChange={(e) => set({ tenantNameHint: e.target.value })} className={inputCls} />
        </F>
        <F label={`${roles.counterparty} email`} hint={lockTenant ? "The signing link was already issued to this address" : "The signing link is sent here"}>
          <input name="tenant_email" type="email" required value={t.tenantEmail} onChange={(e) => set({ tenantEmail: e.target.value })} disabled={lockTenant} className={inputCls} />
        </F>
        <F label={`${roles.counterparty} address`} span>
          <input name="tenant_address" defaultValue={init.tenantAddress} className={inputCls} />
        </F>
        <F label={`${roles.counterparty} contact number`}>
          <input name="tenant_contact" defaultValue={init.tenantContact} className={inputCls} />
        </F>
      </Group>

      <Group title={roles.principal}>
        <F label={`${roles.principal} full name`}>
          <input name="landlord_name_hint" required value={t.landlordName} onChange={(e) => set({ landlordName: e.target.value })} className={inputCls} />
        </F>
        <F label={`${roles.principal} address`} span>
          <input name="landlord_address" defaultValue={init.landlordAddress} className={inputCls} />
        </F>
        <F label={`${roles.principal} email`} hint={`Their signing link is sent here after the ${roles.counterparty.toLowerCase()} signs (optional if staff will countersign)`}>
          <input name="landlord_email" type="email" defaultValue={init.landlordEmail} className={inputCls} />
        </F>
      </Group>

      <Group title="Dates">
        <F label="Addendum date" hint="“made and entered into this __ day of ____”">
          <input name="agreement_date" type="date" defaultValue={init.agreementDate} className={inputCls} />
        </F>
        <F label="Effective date" hint="When the amendments take effect">
          <input name="effective_date" type="date" defaultValue={init.effectiveDate} className={inputCls} />
        </F>
      </Group>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Amendment of term</legend>
        <p className="mb-4 text-xs text-slate">
          Leave both blank to omit this section from the addendum entirely.
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <F label="Amended commencement date">
            <input name="new_start_date" type="date" defaultValue={init.newStartDate} className={inputCls} />
          </F>
          <F label="Amended expiration date">
            <input name="new_end_date" type="date" defaultValue={init.newEndDate} className={inputCls} />
          </F>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Amendment of rent and fees</legend>
        <p className="mb-4 text-xs text-slate">
          Leave empty to omit this section. Amounts here supersede the corresponding amounts in the original contract.
        </p>
        <div className="flex flex-col gap-2">
          {t.feeItems.length > 0 && (
            <div className="hidden grid-cols-[2fr_1fr_2rem] gap-2 text-xs font-semibold text-slate sm:grid">
              <span>Item</span><span>Amount (₱)</span><span />
            </div>
          )}
          {t.feeItems.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_2rem]">
              <input aria-label="Fee item" placeholder="e.g. Monthly rent" value={r.label} onChange={(e) => setFeeItem(i, { label: e.target.value })} className={inputCls} />
              <input aria-label="Amount" type="number" min={0} step="0.01" value={r.amount} onChange={(e) => setFeeItem(i, { amount: Number(e.target.value) || 0 })} className={inputCls} />
              <button type="button" aria-label="Remove fee item" onClick={() => set({ feeItems: t.feeItems.filter((_, j) => j !== i) })} className={removeCls}>×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set({ feeItems: [...t.feeItems, { label: "", amount: 0 }] })} className={addCls}>
          Add fee item
        </button>
        {t.feeItems.length > 0 && (
          <p className="mt-3 text-sm font-semibold text-navy">
            Total: ₱{feeTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}

        {t.feeItems.length > 0 && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-navy">Payment schedule (optional)</h4>
            <div className="flex flex-col gap-2">
              {t.paymentSchedule.map((r, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.2fr_1.2fr_2rem]">
                  <input aria-label="Date due" placeholder="Date due" value={r.dueDate} onChange={(e) => setScheduleRow(i, { dueDate: e.target.value })} className={inputCls} />
                  <input aria-label="Amount" placeholder="Amount" value={r.amount} onChange={(e) => setScheduleRow(i, { amount: e.target.value })} className={inputCls} />
                  <input aria-label="Bank/branch" placeholder="Bank / branch" value={r.bankBranch} onChange={(e) => setScheduleRow(i, { bankBranch: e.target.value })} className={inputCls} />
                  <input aria-label="Coverage" placeholder="Coverage" value={r.coverage} onChange={(e) => setScheduleRow(i, { coverage: e.target.value })} className={inputCls} />
                  <button type="button" aria-label="Remove schedule row" onClick={() => set({ paymentSchedule: t.paymentSchedule.filter((_, j) => j !== i) })} className={removeCls}>×</button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => set({ paymentSchedule: [...t.paymentSchedule, { dueDate: "", amount: "", bankBranch: `${t.bankDetails.bank} / ${t.bankDetails.branch}`, coverage: "" }] })}
              className={addCls}
            >
              Add schedule row
            </button>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <F label="Account name">
                <input name="bank_name" defaultValue={init.bankDetails.name} className={inputCls} />
              </F>
              <F label="Bank">
                <input name="bank_bank" defaultValue={init.bankDetails.bank} className={inputCls} />
              </F>
              <F label="Branch">
                <input name="bank_branch" defaultValue={init.bankDetails.branch} className={inputCls} />
              </F>
              <F label="Account number">
                <input name="bank_account_number" defaultValue={init.bankDetails.accountNumber} className={inputCls} />
              </F>
            </div>
          </>
        )}
      </fieldset>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Change of parties and occupants</legend>
        <p className="mb-4 text-xs text-slate">
          Leave empty to omit this section. Anyone added or substituted must upload a valid ID when signing.
        </p>
        <div className="flex flex-col gap-2">
          {t.partyChanges.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.4fr_1.4fr_2rem]">
              <select aria-label="Action" value={r.action} onChange={(e) => setPartyChange(i, { action: e.target.value as AddendumPartyChange["action"] })} className={inputCls}>
                <option value="add">Add</option>
                <option value="remove">Remove</option>
                <option value="substitute">Substitute</option>
              </select>
              <input aria-label="Role" placeholder="Role (e.g. occupant)" value={r.role} onChange={(e) => setPartyChange(i, { role: e.target.value })} className={inputCls} />
              <input aria-label="Name" placeholder="Name" value={r.name} onChange={(e) => setPartyChange(i, { name: e.target.value })} className={inputCls} />
              {r.action === "substitute" ? (
                <input aria-label="Outgoing name" placeholder="Person being replaced" value={r.outgoingName ?? ""} onChange={(e) => setPartyChange(i, { outgoingName: e.target.value })} className={inputCls} />
              ) : (
                <input aria-label="Notes" placeholder="Notes (optional)" value={r.notes ?? ""} onChange={(e) => setPartyChange(i, { notes: e.target.value })} className={inputCls} />
              )}
              <button type="button" aria-label="Remove change" onClick={() => set({ partyChanges: t.partyChanges.filter((_, j) => j !== i) })} className={removeCls}>×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set({ partyChanges: [...t.partyChanges, { action: "add", role: "occupant", name: "" }] })} className={addCls}>
          Add party change
        </button>
      </fieldset>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Amended provisions</legend>
        <p className="mb-4 text-xs text-slate">
          Leave empty to omit this section. Each item names a section of the original contract and its new wording.
        </p>
        <div className="flex flex-col gap-4">
          {t.amendedClauses.map((r, i) => (
            <div key={i} className="rounded-md border border-line p-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.6fr_1fr_2rem]">
                <input aria-label="Section reference" placeholder="Section no. (e.g. 4.2)" value={r.ref} onChange={(e) => setAmendedClause(i, { ref: e.target.value })} className={inputCls} />
                <input aria-label="Section heading" placeholder="Section heading (optional)" value={r.heading ?? ""} onChange={(e) => setAmendedClause(i, { heading: e.target.value })} className={inputCls} />
                <select aria-label="Amendment mode" value={r.mode} onChange={(e) => setAmendedClause(i, { mode: e.target.value as AddendumAmendedClause["mode"] })} className={inputCls}>
                  <option value="replace">Replace in full</option>
                  <option value="add">Add to it</option>
                </select>
                <button type="button" aria-label="Remove provision" onClick={() => set({ amendedClauses: t.amendedClauses.filter((_, j) => j !== i) })} className={removeCls}>×</button>
              </div>
              <textarea
                aria-label="New wording"
                placeholder="The new wording, exactly as it should appear in the addendum"
                value={r.newText}
                onChange={(e) => setAmendedClause(i, { newText: e.target.value })}
                rows={4}
                className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
              />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set({ amendedClauses: [...t.amendedClauses, { ref: "", heading: "", mode: "replace", newText: "" }] })} className={addCls}>
          Add amended provision
        </button>
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
