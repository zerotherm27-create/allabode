"use client";

import { useState } from "react";
import { F, Group, inputCls, SubmitButton } from "@/components/admin/form-kit";
import { pesoAmountInWords, pesoAmountFigures } from "@/lib/pm/amount-words";
import {
  DEFAULT_BANK_DETAILS, DEFAULT_PAYMENT_PARTICULARS,
  type PaymentScheduleRow, type TenancyBankDetails,
} from "@/lib/pm/tenancy-clauses";

export type UnitOption = {
  id: string;
  unitLabel: string;
  baseRent: number | null;
  propertyName: string;
  propertyAddress: string;
};

export type TenancyTermsInitial = {
  tenantNameHint: string;
  tenantEmail: string;
  tenantAddress: string;
  tenantContact: string;
  landlordName: string;
  landlordIdNumber: string;
  landlordAddress: string;
  landlordEmail: string;
  unitId: string;
  agreementDate: string;
  buildingName: string;
  floorUnit: string;
  propertyAddress: string;
  leaseMonths: string;
  leaseStartDate: string;
  leaseEndDate: string;
  rentAmount: string;
  rentAmountWords: string;
  advanceDepositAmount: string;
  advanceDepositWords: string;
  depositAmount: string;
  depositAmountWords: string;
  rentDueDay: string;
  paymentSchedule: PaymentScheduleRow[];
  bankDetails: TenancyBankDetails;
};

function emptyTenancyTerms(): TenancyTermsInitial {
  return {
    tenantNameHint: "", tenantEmail: "", tenantAddress: "", tenantContact: "",
    landlordName: "", landlordIdNumber: "", landlordAddress: "", landlordEmail: "",
    unitId: "", agreementDate: "",
    buildingName: "", floorUnit: "", propertyAddress: "",
    leaseMonths: "12", leaseStartDate: "", leaseEndDate: "",
    rentAmount: "", rentAmountWords: "",
    advanceDepositAmount: "", advanceDepositWords: "",
    depositAmount: "", depositAmountWords: "",
    rentDueDay: "",
    paymentSchedule: [],
    bankDetails: { ...DEFAULT_BANK_DETAILS },
  };
}

function parseAmount(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function isoAddMonths(iso: string, months: number, dayOverride?: number | null): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const base = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, dayOverride ?? Number(m[3])));
  base.setUTCMonth(base.getUTCMonth() + months);
  return base.toISOString().slice(0, 10);
}

function isoMinusDays(iso: string, days: number): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const base = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  base.setUTCDate(base.getUTCDate() - days);
  return base.toISOString().slice(0, 10);
}

function humanDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    .toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function TenancyTermsForm({
  action, units, initial = null, submitLabel, lockTenant = false,
}: {
  action: (fd: FormData) => Promise<void>;
  units: UnitOption[];
  /** null = blank create form (server components can't call client helpers). */
  initial?: TenancyTermsInitial | null;
  submitLabel: string;
  /** On the edit form the recipient can't change (the link is already out). */
  lockTenant?: boolean;
}) {
  const [t, setT] = useState(initial ?? emptyTenancyTerms());
  // Mount-time snapshot for the uncontrolled (defaultValue) inputs.
  const [init] = useState(t);
  const set = (patch: Partial<TenancyTermsInitial>) => setT((prev) => ({ ...prev, ...patch }));

  function onUnitPick(unitId: string) {
    const u = units.find((x) => x.id === unitId);
    if (!u) { set({ unitId }); return; }
    set({
      unitId,
      buildingName: u.propertyName,
      floorUnit: u.unitLabel,
      propertyAddress: u.propertyAddress,
      ...(u.baseRent != null ? rentPatch(String(u.baseRent)) : {}),
    });
  }

  /** Auto-fill words + derived advance/deposit amounts whenever rent changes. */
  function rentPatch(raw: string): Partial<TenancyTermsInitial> {
    const rent = parseAmount(raw);
    if (rent == null) return { rentAmount: raw };
    return {
      rentAmount: raw,
      rentAmountWords: pesoAmountInWords(rent),
      advanceDepositAmount: String(rent * 3),
      advanceDepositWords: pesoAmountInWords(rent * 3),
      depositAmount: String(rent * 2),
      depositAmountWords: pesoAmountInWords(rent * 2),
    };
  }

  function endDatePatch(startDate: string, monthsRaw: string): Partial<TenancyTermsInitial> {
    const months = parseAmount(monthsRaw);
    if (!startDate || months == null || months < 1) return {};
    const end = isoMinusDays(isoAddMonths(startDate, months), 1);
    return end ? { leaseEndDate: end } : {};
  }

  function generateSchedule() {
    const rent = parseAmount(t.rentAmount);
    const deposit = parseAmount(t.depositAmount) ?? (rent != null ? rent * 2 : null);
    const months = Math.min(Math.max(Number(t.leaseMonths) || 12, 1), 12);
    const dueDay = Number(t.rentDueDay) || null;
    const rows: PaymentScheduleRow[] = DEFAULT_PAYMENT_PARTICULARS.slice(0, months + 1).map((particulars, i) => {
      if (i === 0) return { dueDate: "Immediately", amount: rent != null ? pesoAmountFigures(rent) : "", particulars };
      if (i === 1) return { dueDate: "Immediately", amount: deposit != null ? pesoAmountFigures(deposit) : "", particulars };
      const monthIndex = i - 1; // "2nd month advance" is the start month + 1
      const dueIso = t.leaseStartDate ? isoAddMonths(t.leaseStartDate, monthIndex, dueDay) : "";
      return { dueDate: dueIso ? humanDate(dueIso) : "", amount: rent != null ? pesoAmountFigures(rent) : "", particulars };
    });
    set({ paymentSchedule: rows });
  }

  function setRow(i: number, patch: Partial<PaymentScheduleRow>) {
    const rows = t.paymentSchedule.map((r, j) => (j === i ? { ...r, ...patch } : r));
    set({ paymentSchedule: rows });
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="payment_schedule" value={JSON.stringify(t.paymentSchedule)} />
      <input type="hidden" name="unit_id" value={t.unitId} />
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

      <Group title="Landlord (property owner)">
        <F label="Landlord full name">
          <input name="landlord_name" required defaultValue={init.landlordName} className={inputCls} />
        </F>
        <F label="Landlord ID number" hint="Printed in the parties block; the landlord confirms it when signing">
          <input name="landlord_id_number" defaultValue={init.landlordIdNumber} className={inputCls} />
        </F>
        <F label="Landlord address" span>
          <input name="landlord_address" defaultValue={init.landlordAddress} className={inputCls} />
        </F>
        <F label="Landlord email" hint="Their signing link is sent here after the tenant signs (optional if staff will countersign)">
          <input name="landlord_email" type="email" defaultValue={init.landlordEmail} className={inputCls} />
        </F>
      </Group>

      <Group title="Property">
        {units.length > 0 && (
          <F label="Link a managed unit" hint="Optional — prefills the property and creates the lease record automatically on completion" span>
            <select value={t.unitId} onChange={(e) => onUnitPick(e.target.value)} className={inputCls}>
              <option value="">Not linked — enter manually</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.propertyName} — {u.unitLabel}</option>
              ))}
            </select>
          </F>
        )}
        <F label="Building name">
          <input name="building_name" required value={t.buildingName} onChange={(e) => set({ buildingName: e.target.value })} className={inputCls} />
        </F>
        <F label="Floor / unit number">
          <input name="floor_unit" required value={t.floorUnit} onChange={(e) => set({ floorUnit: e.target.value })} className={inputCls} />
        </F>
        <F label="Property address" span>
          <input name="property_address" required value={t.propertyAddress} onChange={(e) => set({ propertyAddress: e.target.value })} className={inputCls} />
        </F>
      </Group>

      <Group title="Lease period">
        <F label="Agreement date" hint="'AN AGREEMENT made on the …' recital">
          <input name="agreement_date" type="date" defaultValue={init.agreementDate} className={inputCls} />
        </F>
        <F label="Lease period (months)">
          <input
            name="lease_months" type="number" min={1} required value={t.leaseMonths}
            onChange={(e) => set({ leaseMonths: e.target.value, ...endDatePatch(t.leaseStartDate, e.target.value) })}
            className={inputCls}
          />
        </F>
        <F label="Start date">
          <input
            name="lease_start_date" type="date" required value={t.leaseStartDate}
            onChange={(e) => set({ leaseStartDate: e.target.value, ...endDatePatch(e.target.value, t.leaseMonths) })}
            className={inputCls}
          />
        </F>
        <F label="End date" hint="Auto-calculated — adjust if needed">
          <input name="lease_end_date" type="date" value={t.leaseEndDate} onChange={(e) => set({ leaseEndDate: e.target.value })} className={inputCls} />
        </F>
      </Group>

      <Group title="Rent & deposits">
        <F label="Monthly rent (₱)">
          <input name="rent_amount" required value={t.rentAmount} onChange={(e) => set(rentPatch(e.target.value))} className={inputCls} />
        </F>
        <F label="Rent due day of the month" hint="Clause 3.3 — 'on or before the … day of each month'">
          <input name="rent_due_day" type="number" min={1} max={31} value={t.rentDueDay} onChange={(e) => set({ rentDueDay: e.target.value })} className={inputCls} />
        </F>
        <F label="Rent in words" hint="Auto-filled — override if you prefer different wording" span>
          <input name="rent_amount_words" value={t.rentAmountWords} onChange={(e) => set({ rentAmountWords: e.target.value })} className={inputCls} />
        </F>
        <F label="Advance + deposit total (₱)" hint="1 month advance + 2 months deposit (clause 3.2)">
          <input name="advance_deposit_amount" value={t.advanceDepositAmount} onChange={(e) => set({ advanceDepositAmount: e.target.value })} className={inputCls} />
        </F>
        <F label="Advance + deposit in words">
          <input name="advance_deposit_words" value={t.advanceDepositWords} onChange={(e) => set({ advanceDepositWords: e.target.value })} className={inputCls} />
        </F>
        <F label="Security deposit (₱)" hint="2 months' rent (clause 4)">
          <input name="deposit_amount" value={t.depositAmount} onChange={(e) => set({ depositAmount: e.target.value })} className={inputCls} />
        </F>
        <F label="Security deposit in words">
          <input name="deposit_amount_words" value={t.depositAmountWords} onChange={(e) => set({ depositAmountWords: e.target.value })} className={inputCls} />
        </F>
      </Group>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Payment schedule</legend>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate">Printed as the schedule table under clause 3. Rows are free text.</p>
          <button type="button" onClick={generateSchedule} className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-navy hover:bg-surface-gray">
            Generate from terms
          </button>
        </div>
        {t.paymentSchedule.length === 0 ? (
          <p className="text-sm text-slate">No rows yet — generate from the terms above, or add rows manually.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="hidden grid-cols-[1fr_1fr_1.4fr_2rem] gap-2 text-xs font-semibold text-slate sm:grid">
              <span>Due date</span><span>Amount</span><span>Particulars</span><span />
            </div>
            {t.paymentSchedule.map((r, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1.4fr_2rem]">
                <input aria-label="Due date" value={r.dueDate} onChange={(e) => setRow(i, { dueDate: e.target.value })} className={inputCls} />
                <input aria-label="Amount" value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value })} className={inputCls} />
                <input aria-label="Particulars" value={r.particulars} onChange={(e) => setRow(i, { particulars: e.target.value })} className={inputCls} />
                <button
                  type="button"
                  aria-label="Remove row"
                  onClick={() => set({ paymentSchedule: t.paymentSchedule.filter((_, j) => j !== i) })}
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
          onClick={() => set({ paymentSchedule: [...t.paymentSchedule, { dueDate: "", amount: "", particulars: "" }] })}
          className="mt-3 text-xs font-semibold text-navy-700 underline"
        >
          Add row
        </button>
      </fieldset>

      <Group title="Bank details (clause 3.3)">
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
      </Group>

      <div>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
