"use client";

import { useState } from "react";
import { F, Group, inputCls, SubmitButton } from "@/components/admin/form-kit";
import { pesoAmountInWords, pesoAmountFigures } from "@/lib/pm/amount-words";
import {
  DEFAULT_PARKING_BANK_DETAILS,
  type ParkingScheduleRow, type ParkingBankDetails,
} from "@/lib/pm/parking-clauses";

export type ParkingTermsInitial = {
  tenantNameHint: string;
  tenantEmail: string;
  tenantAddress: string;
  tenantContact: string;
  landlordName: string;
  landlordAddress: string;
  landlordEmail: string;
  agreementDate: string;
  agreementCity: string;
  slotLabel: string;
  buildingName: string;
  parkingAddress: string;
  leaseStartDate: string;
  leaseEndDate: string;
  rentAmount: string;
  rentAmountWords: string;
  signingTotalAmount: string;
  signingTotalWords: string;
  stickerAmount: string;
  rentDueDay: string;
  paymentSchedule: ParkingScheduleRow[];
  bankDetails: ParkingBankDetails;
};

function emptyParkingTerms(): ParkingTermsInitial {
  return {
    tenantNameHint: "", tenantEmail: "", tenantAddress: "", tenantContact: "",
    landlordName: "", landlordAddress: "", landlordEmail: "",
    agreementDate: "", agreementCity: "Makati City",
    slotLabel: "", buildingName: "", parkingAddress: "",
    leaseStartDate: "", leaseEndDate: "",
    rentAmount: "", rentAmountWords: "",
    signingTotalAmount: "", signingTotalWords: "",
    stickerAmount: "",
    rentDueDay: "",
    paymentSchedule: [],
    bankDetails: { ...DEFAULT_PARKING_BANK_DETAILS },
  };
}

function parseAmount(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseIso(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function addMonths(d: Date, months: number, dayOverride?: number | null): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), dayOverride ?? d.getUTCDate()));
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}

function minusDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() - days);
  return out;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function longDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "Jul 15 – Aug 14, 2026" (year printed once when both ends share it). */
function coverageRange(from: Date, to: Date): string {
  const f = (x: Date, withYear: boolean) =>
    x.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });
  return from.getUTCFullYear() === to.getUTCFullYear()
    ? `${f(from, false)} – ${f(to, true)}`
    : `${f(from, true)} – ${f(to, true)}`;
}

/** "Banco de Oro (BDO)" → "BDO"; otherwise the full bank name. */
function bankShortName(bank: string): string {
  return bank.match(/\(([^)]+)\)/)?.[1] ?? bank;
}

export function ParkingTermsForm({
  action, initial = null, submitLabel, lockTenant = false,
}: {
  action: (fd: FormData) => Promise<void>;
  /** null = blank create form (server components can't call client helpers). */
  initial?: ParkingTermsInitial | null;
  submitLabel: string;
  /** On the edit form the recipient can't change (the link is already out). */
  lockTenant?: boolean;
}) {
  const [t, setT] = useState(initial ?? emptyParkingTerms());
  // Mount-time snapshot for the uncontrolled (defaultValue) inputs.
  const [init] = useState(t);
  const set = (patch: Partial<ParkingTermsInitial>) => setT((prev) => ({ ...prev, ...patch }));

  /** Auto-fill words + the 3-month signing total whenever rent changes. */
  function rentPatch(raw: string): Partial<ParkingTermsInitial> {
    const rent = parseAmount(raw);
    if (rent == null) return { rentAmount: raw };
    return {
      rentAmount: raw,
      rentAmountWords: pesoAmountInWords(rent),
      signingTotalAmount: String(rent * 3),
      signingTotalWords: pesoAmountInWords(rent * 3),
    };
  }

  function endDatePatch(startIso: string): Partial<ParkingTermsInitial> {
    const start = parseIso(startIso);
    if (!start) return {};
    return { leaseEndDate: toIso(minusDays(addMonths(start, 12), 1)) };
  }

  function generateSchedule() {
    const rent = parseAmount(t.rentAmount);
    const total = parseAmount(t.signingTotalAmount) ?? (rent != null ? rent * 3 : null);
    const start = parseIso(t.leaseStartDate);
    if (!start) return;
    const end = parseIso(t.leaseEndDate) ?? minusDays(addMonths(start, 12), 1);
    const dueDay = Number(t.rentDueDay) || null;
    const bankBranch = `${bankShortName(t.bankDetails.bank)} – ${t.bankDetails.branch}`;

    // Row 1: total (2 months' advance + 1 month deposit) covering the first
    // two months; then one row per remaining month until the lease ends.
    const rows: ParkingScheduleRow[] = [{
      dueDate: "Upon signing",
      amount: total != null ? `Php ${pesoAmountFigures(total)}` : "",
      bankBranch,
      coverage: `${coverageRange(start, minusDays(addMonths(start, 2), 1))} with 1 month security deposit`,
    }];
    for (let m = 2; m < 24; m++) {
      const from = addMonths(start, m);
      if (from > end) break;
      const to = minusDays(addMonths(start, m + 1), 1);
      rows.push({
        dueDate: longDate(addMonths(start, m, dueDay)),
        amount: rent != null ? `Php ${pesoAmountFigures(rent)}` : "",
        bankBranch,
        coverage: coverageRange(from, to > end ? end : to),
      });
    }
    set({ paymentSchedule: rows });
  }

  function setRow(i: number, patch: Partial<ParkingScheduleRow>) {
    set({ paymentSchedule: t.paymentSchedule.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="payment_schedule" value={JSON.stringify(t.paymentSchedule)} />
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

      <Group title="Landlord (parking space owner)">
        <F label="Landlord full name">
          <input name="landlord_name" required defaultValue={init.landlordName} className={inputCls} />
        </F>
        <F label="Landlord residential address" span>
          <input name="landlord_address" defaultValue={init.landlordAddress} className={inputCls} />
        </F>
        <F label="Landlord email" hint="Their signing link is sent here after the tenant signs (optional if staff will countersign)">
          <input name="landlord_email" type="email" defaultValue={init.landlordEmail} className={inputCls} />
        </F>
      </Group>

      <Group title="Parking space">
        <F label="Slot label" hint="e.g. Basement Parking Slot 1-K">
          <input name="slot_label" required value={t.slotLabel} onChange={(e) => set({ slotLabel: e.target.value })} className={inputCls} />
        </F>
        <F label="Building" hint="Also names the PMO in clause 4">
          <input name="building_name" required value={t.buildingName} onChange={(e) => set({ buildingName: e.target.value })} className={inputCls} />
        </F>
        <F label="Address" span>
          <input name="parking_address" required value={t.parkingAddress} onChange={(e) => set({ parkingAddress: e.target.value })} className={inputCls} />
        </F>
      </Group>

      <Group title="Term">
        <F label="Agreement date" hint="'made and entered into on the …' recital">
          <input name="agreement_date" type="date" defaultValue={init.agreementDate} className={inputCls} />
        </F>
        <F label="City" hint="'in … , Philippines'">
          <input name="agreement_city" defaultValue={init.agreementCity} className={inputCls} />
        </F>
        <F label="Rental period start">
          <input
            name="lease_start_date" type="date" required value={t.leaseStartDate}
            onChange={(e) => set({ leaseStartDate: e.target.value, ...endDatePatch(e.target.value) })}
            className={inputCls}
          />
        </F>
        <F label="Rental period end" hint="Auto-set to 12 months — adjust if needed">
          <input name="lease_end_date" type="date" required value={t.leaseEndDate} onChange={(e) => set({ leaseEndDate: e.target.value })} className={inputCls} />
        </F>
      </Group>

      <Group title="Rent & amounts">
        <F label="Monthly rental rate (₱)">
          <input name="rent_amount" required value={t.rentAmount} onChange={(e) => set(rentPatch(e.target.value))} className={inputCls} />
        </F>
        <F label="Rent due day of the month" hint="Clause 3 — 'on or before the … of each month'">
          <input name="rent_due_day" type="number" min={1} max={31} value={t.rentDueDay} onChange={(e) => set({ rentDueDay: e.target.value })} className={inputCls} />
        </F>
        <F label="Rent in words" hint="Auto-filled — override if you prefer different wording" span>
          <input name="rent_amount_words" value={t.rentAmountWords} onChange={(e) => set({ rentAmountWords: e.target.value })} className={inputCls} />
        </F>
        <F label="Total due upon signing (₱)" hint="2 months' advance + 1 month deposit (clause 4)">
          <input name="signing_total_amount" value={t.signingTotalAmount} onChange={(e) => set({ signingTotalAmount: e.target.value })} className={inputCls} />
        </F>
        <F label="Total due in words">
          <input name="signing_total_words" value={t.signingTotalWords} onChange={(e) => set({ signingTotalWords: e.target.value })} className={inputCls} />
        </F>
        <F label="Parking sticker (₱)" hint="Payable by the tenant to the building's PMO">
          <input name="sticker_amount" defaultValue={init.stickerAmount} className={inputCls} />
        </F>
      </Group>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Payment schedule</legend>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate">Printed as the schedule table under clause 5. Rows are free text.</p>
          <button type="button" onClick={generateSchedule} className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-navy hover:bg-surface-gray">
            Generate from terms
          </button>
        </div>
        {t.paymentSchedule.length === 0 ? (
          <p className="text-sm text-slate">No rows yet — generate from the terms above, or add rows manually.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="hidden grid-cols-[1fr_0.8fr_1fr_1.4fr_2rem] gap-2 text-xs font-semibold text-slate sm:grid">
              <span>Date due</span><span>Amount</span><span>Bank/branch</span><span>Coverage</span><span />
            </div>
            {t.paymentSchedule.map((r, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_0.8fr_1fr_1.4fr_2rem]">
                <input aria-label="Date due" value={r.dueDate} onChange={(e) => setRow(i, { dueDate: e.target.value })} className={inputCls} />
                <input aria-label="Amount" value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value })} className={inputCls} />
                <input aria-label="Bank/branch" value={r.bankBranch} onChange={(e) => setRow(i, { bankBranch: e.target.value })} className={inputCls} />
                <input aria-label="Coverage" value={r.coverage} onChange={(e) => setRow(i, { coverage: e.target.value })} className={inputCls} />
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
          onClick={() => set({ paymentSchedule: [...t.paymentSchedule, { dueDate: "", amount: "", bankBranch: "", coverage: "" }] })}
          className="mt-3 text-xs font-semibold text-navy-700 underline"
        >
          Add row
        </button>
      </fieldset>

      <Group title="Bank details (clause 5)">
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

      <div>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
