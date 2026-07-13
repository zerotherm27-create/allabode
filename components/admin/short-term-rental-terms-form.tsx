"use client";

import { useState } from "react";
import { F, Group, inputCls, SubmitButton } from "@/components/admin/form-kit";
import { applianceBrandOptionsForParticulars, DEFAULT_APPLIANCE_BRAND_OPTIONS, type ApplianceBrandOptions } from "@/lib/pm/appliance-brand-catalog";
import {
  DEFAULT_STR_BANK_DETAILS,
  type StrFeeItem, type StrInventoryRow, type StrBankDetails,
} from "@/lib/pm/short-term-rental-clauses";

export type StrTermsInitial = {
  tenantNameHint: string;
  tenantEmail: string;
  tenantAddress: string;
  tenantContact: string;
  occupants: string[];
  homeownerName: string;
  homeownerAddress: string;
  homeownerEmail: string;
  agreementDate: string;
  buildingName: string;
  unitNumber: string;
  propertyAddress: string;
  checkInDate: string;
  checkOutDate: string;
  amenityLocation: string;
  amenitiesList: string;
  garbageDisposalLocation: string;
  feeItems: StrFeeItem[];
  securityDepositAmount: string;
  bankDetails: StrBankDetails;
  inventory: StrInventoryRow[];
};

function emptyStrTerms(): StrTermsInitial {
  return {
    tenantNameHint: "", tenantEmail: "", tenantAddress: "", tenantContact: "",
    occupants: [""],
    homeownerName: "", homeownerAddress: "", homeownerEmail: "",
    agreementDate: "",
    buildingName: "", unitNumber: "", propertyAddress: "",
    checkInDate: "", checkOutDate: "",
    amenityLocation: "", amenitiesList: "", garbageDisposalLocation: "",
    feeItems: [{ label: "Rental Rate", amount: 0 }],
    securityDepositAmount: "",
    bankDetails: { ...DEFAULT_STR_BANK_DETAILS },
    inventory: [],
  };
}

export function StrTermsForm({
  action, initial = null, submitLabel, lockTenant = false, brandOptions = DEFAULT_APPLIANCE_BRAND_OPTIONS,
}: {
  action: (fd: FormData) => Promise<void>;
  /** null = blank create form (server components can't call client helpers). */
  initial?: StrTermsInitial | null;
  submitLabel: string;
  /** On the edit form the recipient can't change (the link is already out). */
  lockTenant?: boolean;
  brandOptions?: ApplianceBrandOptions;
}) {
  const [t, setT] = useState(initial ?? emptyStrTerms());
  const [init] = useState(t);
  const set = (patch: Partial<StrTermsInitial>) => setT((prev) => ({ ...prev, ...patch }));

  function setOccupant(i: number, value: string) {
    set({ occupants: t.occupants.map((o, j) => (j === i ? value : o)) });
  }

  function setFeeItem(i: number, patch: Partial<StrFeeItem>) {
    set({ feeItems: t.feeItems.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }

  function setInventoryRow(i: number, patch: Partial<StrInventoryRow>) {
    set({ inventory: t.inventory.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }

  const feeSubtotal = t.feeItems.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const deposit = Number(t.securityDepositAmount) || 0;

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="occupants" value={JSON.stringify(t.occupants.map((o) => o.trim()).filter(Boolean))} />
      <input type="hidden" name="fee_items" value={JSON.stringify(t.feeItems.filter((r) => r.label.trim()))} />
      <input type="hidden" name="inventory" value={JSON.stringify(t.inventory.filter((r) => r.particulars.trim()))} />
      {lockTenant && <input type="hidden" name="tenant_email" value={init.tenantEmail} />}

      <Group title="Tenant">
        <F label="Tenant name" hint="Used in the email greeting and as a fallback label">
          <input name="tenant_name_hint" defaultValue={init.tenantNameHint} className={inputCls} />
        </F>
        <F label="Tenant email" hint={lockTenant ? "The signing link was already issued to this address" : "The signing link is sent here"}>
          <input name="tenant_email" type="email" required defaultValue={init.tenantEmail} disabled={lockTenant} className={inputCls} />
        </F>
        <F label="Tenant address" span>
          <input name="tenant_address" defaultValue={init.tenantAddress} className={inputCls} />
        </F>
        <F label="Tenant contact number">
          <input name="tenant_contact" defaultValue={init.tenantContact} className={inputCls} />
        </F>
      </Group>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Occupants (Section 2.1)</legend>
        <div className="flex flex-col gap-2">
          {t.occupants.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input aria-label={`Occupant ${i + 1}`} value={o} onChange={(e) => setOccupant(i, e.target.value)} className={inputCls} />
              <button
                type="button"
                aria-label="Remove occupant"
                onClick={() => set({ occupants: t.occupants.filter((_, j) => j !== i) })}
                className="self-center text-sm font-semibold text-slate hover:text-error"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set({ occupants: [...t.occupants, ""] })} className="mt-3 text-xs font-semibold text-navy-700 underline">
          Add occupant
        </button>
      </fieldset>

      <Group title="Homeowner">
        <F label="Homeowner full name">
          <input name="homeowner_name" required defaultValue={init.homeownerName} className={inputCls} />
        </F>
        <F label="Homeowner residential address" span>
          <input name="homeowner_address" defaultValue={init.homeownerAddress} className={inputCls} />
        </F>
        <F label="Homeowner email" hint="Their signing link is sent here after the tenant signs (optional if staff will countersign)">
          <input name="homeowner_email" type="email" defaultValue={init.homeownerEmail} className={inputCls} />
        </F>
      </Group>

      <Group title="Property">
        <F label="Building" hint="Also used in Annex A's checklist header">
          <input name="building_name" required defaultValue={init.buildingName} className={inputCls} />
        </F>
        <F label="Unit">
          <input name="unit_number" required defaultValue={init.unitNumber} className={inputCls} />
        </F>
        <F label="Address" span>
          <input name="property_address" required defaultValue={init.propertyAddress} className={inputCls} />
        </F>
      </Group>

      <Group title="Term">
        <F label="Agreement date">
          <input name="agreement_date" type="date" defaultValue={init.agreementDate} className={inputCls} />
        </F>
        <F label="Check-in date">
          <input name="check_in_date" type="date" required defaultValue={init.checkInDate} className={inputCls} />
        </F>
        <F label="Checkout date">
          <input name="check_out_date" type="date" required defaultValue={init.checkOutDate} className={inputCls} />
        </F>
      </Group>

      <Group title="Condominium amenities (clause 5)">
        <F label="Amenity location" hint="e.g. Roof Deck">
          <input name="amenity_location" defaultValue={init.amenityLocation} className={inputCls} />
        </F>
        <F label="Amenities list" hint="e.g. Fitness Gym, Swimming Pool, Function Hall" span>
          <input name="amenities_list" defaultValue={init.amenitiesList} className={inputCls} />
        </F>
        <F label="Garbage disposal location" hint="Printed in Annex B's rental rules" span>
          <input name="garbage_disposal_location" defaultValue={init.garbageDisposalLocation} className={inputCls} />
        </F>
      </Group>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Rental rates and fees (clause 6)</legend>
        <div className="flex flex-col gap-2">
          <div className="hidden grid-cols-[2fr_1fr_2rem] gap-2 text-xs font-semibold text-slate sm:grid">
            <span>Item</span><span>Amount (₱)</span><span />
          </div>
          {t.feeItems.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_2rem]">
              <input aria-label="Fee item" placeholder="e.g. Rental Rate — 1 month advance" value={r.label} onChange={(e) => setFeeItem(i, { label: e.target.value })} className={inputCls} />
              <input aria-label="Amount" type="number" min={0} step="0.01" value={r.amount} onChange={(e) => setFeeItem(i, { amount: Number(e.target.value) || 0 })} className={inputCls} />
              <button
                type="button"
                aria-label="Remove fee item"
                onClick={() => set({ feeItems: t.feeItems.filter((_, j) => j !== i) })}
                className="self-center text-sm font-semibold text-slate hover:text-error"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set({ feeItems: [...t.feeItems, { label: "", amount: 0 }] })} className="mt-3 text-xs font-semibold text-navy-700 underline">
          Add fee item
        </button>

        <div className="mt-4 border-t border-line pt-4">
          <F label="Security Deposit (₱)">
            <input name="security_deposit_amount" type="number" min={0} step="0.01" defaultValue={init.securityDepositAmount} className={inputCls} />
          </F>
          <p className="mt-2 text-right text-sm text-slate">
            Total due upon signing: <span className="font-semibold text-navy">₱{(feeSubtotal + deposit).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        </div>
      </fieldset>

      <Group title="Bank details (clause 6.1)">
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

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Annex A — Rental Agreement Checklist</legend>
        <p className="mb-3 text-xs text-slate">
          The furnishing checklist the tenant confirms at Check-in. Printed as Annex A.
        </p>
        <div className="flex flex-col gap-2">
          <div className="hidden grid-cols-[4.5rem_1.2fr_1fr_1.6fr_2rem] gap-2 text-xs font-semibold text-slate sm:grid">
            <span>Qty</span><span>Particulars</span><span>Brand</span><span>Remarks</span><span />
          </div>
          {t.inventory.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[4.5rem_1.2fr_1fr_1.6fr_2rem]">
              <input aria-label="Quantity" value={r.quantity} onChange={(e) => setInventoryRow(i, { quantity: e.target.value })} className={inputCls} />
              <input aria-label="Particulars" value={r.particulars} onChange={(e) => setInventoryRow(i, { particulars: e.target.value })} className={inputCls} />
              <input aria-label="Brand" value={r.brand} onChange={(e) => setInventoryRow(i, { brand: e.target.value })} list={`str_terms_brand_${i}`} className={inputCls} />
              <datalist id={`str_terms_brand_${i}`}>
                {applianceBrandOptionsForParticulars(brandOptions, r.particulars).map((brand) => <option key={brand} value={brand} />)}
              </datalist>
              <input aria-label="Remarks" value={r.remarks} onChange={(e) => setInventoryRow(i, { remarks: e.target.value })} className={inputCls} />
              <button
                type="button"
                aria-label="Remove inventory row"
                onClick={() => set({ inventory: t.inventory.filter((_, j) => j !== i) })}
                className="self-center text-sm font-semibold text-slate hover:text-error"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => set({ inventory: [...t.inventory, { quantity: "", particulars: "", brand: "", remarks: "" }] })}
          className="mt-3 text-xs font-semibold text-navy-700 underline"
        >
          Add row
        </button>
      </fieldset>

      <div>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
