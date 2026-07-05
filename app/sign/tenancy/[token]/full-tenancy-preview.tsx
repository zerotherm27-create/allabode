"use client";

import {
  buildTenancyClausesBeforeTables, buildTenancyClausesAfterTables,
  recitalDate, BLANK,
  DEFAULT_BANK_DETAILS, DEFAULT_PAYMENT_PARTICULARS,
  TENANCY_INTERPRETATION, TENANCY_REMINDERS,
  type TenancyClause, type ClauseParagraph, type TenancyTenantDetails,
  type PaymentScheduleRow,
} from "@/lib/pm/tenancy-clauses";
import type { TenancyAgreementRecord } from "@/app/sign/tenancy-actions";

function Para({ p }: { p: ClauseParagraph }) {
  return (
    <>
      {p.fields && (
        <div className="my-2 flex flex-col gap-1 pl-6">
          {p.fields.map(([label, value]) => (
            <p key={label} className="text-sm">
              <span className="inline-block w-44 font-semibold">{label}</span>: {value}
            </p>
          ))}
        </div>
      )}
      {p.text && (
        p.sub ? (
          <div className="mb-2 flex gap-2 text-sm">
            <span className="w-8 shrink-0 font-semibold">{p.sub}</span>
            <span>
              {p.subTitle ? <span className="block font-semibold">{p.subTitle}</span> : null}
              {p.text}
            </span>
          </div>
        ) : (
          <p className="mb-2 text-sm">{p.text}</p>
        )
      )}
      {p.numbered && (
        <div className="mb-2 flex flex-col gap-1 pl-10">
          {p.numbered.map((n) => (
            <p key={n.marker} className="text-sm">
              <span className="inline-block w-8">{n.marker}</span>{n.text}
            </p>
          ))}
        </div>
      )}
    </>
  );
}

function ClauseList({ clauses }: { clauses: TenancyClause[] }) {
  return (
    <>
      {clauses.map((c, i) => (
        <div key={`${c.no}-${i}`}>
          {c.title ? <h4 className="mb-1.5 mt-4 text-sm font-bold text-navy">{c.no}. {c.title}</h4> : null}
          {c.paras.map((p, j) => <Para key={j} p={p} />)}
        </div>
      ))}
    </>
  );
}

function PartyLines({ name, idNumber, address }: { name?: string; idNumber?: string; address?: string }) {
  return (
    <div className="my-2 flex flex-col gap-1 pl-6">
      {([["NAME", name], ["ID NUMBER", idNumber], ["ADDRESS", address]] as const).map(([label, value]) => (
        <p key={label} className="text-sm">
          <span className="inline-block w-28 font-semibold">{label}</span>: {value || BLANK}
        </p>
      ))}
    </div>
  );
}

/**
 * Full-text on-screen review of the Tenancy Agreement, built from the same
 * clause source as the PDF (lib/pm/tenancy-clauses.ts) so they never drift.
 * `tenantDetails`/`occupants` are passed separately so the tenant wizard can
 * preview unsaved edits; the landlord page passes the stored values.
 */
export function FullTenancyPreview({
  record, tenantDetails, occupants,
}: {
  record: TenancyAgreementRecord;
  tenantDetails: TenancyTenantDetails;
  occupants: string[];
}) {
  const terms = {
    propertyDetails: record.property_details ?? {},
    leaseMonths: record.lease_months,
    leaseStartDate: record.lease_start_date,
    leaseEndDate: record.lease_end_date,
    rentAmount: record.rent_amount !== null ? Number(record.rent_amount) : null,
    rentAmountWords: record.rent_amount_words,
    advanceDepositAmount: record.advance_deposit_amount !== null ? Number(record.advance_deposit_amount) : null,
    advanceDepositWords: record.advance_deposit_words,
    depositAmount: record.deposit_amount !== null ? Number(record.deposit_amount) : null,
    depositAmountWords: record.deposit_amount_words,
    rentDueDay: record.rent_due_day,
    occupants: occupants.filter((o) => o.trim()),
  };
  const bank = { ...DEFAULT_BANK_DETAILS, ...(record.bank_details ?? {}) };
  const schedule: PaymentScheduleRow[] = record.payment_schedule?.length
    ? record.payment_schedule
    : DEFAULT_PAYMENT_PARTICULARS.map((particulars, i) => ({ dueDate: i < 2 ? "Immediately" : "", amount: "", particulars }));
  const inventory = (record.inventory ?? []).filter((r) => r.particulars?.trim());
  const ld = record.landlord_details ?? {};

  return (
    <div className="text-ink">
      <h3 className="mb-3 text-center font-display text-base font-bold text-navy">TENANCY AGREEMENT</h3>
      <p className="mb-2 text-sm">AN AGREEMENT made on the {recitalDate(record.agreement_date)}.</p>
      <p className="mb-1 text-center text-sm font-semibold">BETWEEN</p>
      <PartyLines name={ld.name} idNumber={ld.idNumber} address={ld.address} />
      <p className="mb-2 text-sm">
        (hereinafter called &quot;the Landlord&quot; which expression shall where the context so admits include the
        person entitled for the time being to the reversion immediately expectant on the term hereby created) of the
        one part
      </p>
      <p className="mb-1 text-center text-sm font-semibold">AND</p>
      <PartyLines name={tenantDetails.name} idNumber={tenantDetails.idNumber} address={tenantDetails.address} />
      <p className="mb-2 text-sm">
        (hereinafter called &quot;the Tenant&quot; which expression shall where the context so admits include the
        Tenant&#x2019;s successors and assigns) of the other part.
      </p>
      <p className="mb-2 text-sm font-semibold">NOW IT IS HEREBY AGREED as follows:</p>

      <ClauseList clauses={buildTenancyClausesBeforeTables(terms)} />

      <table className="my-3 w-full border-collapse text-sm">
        <tbody>
          {([["Name", bank.name], ["Bank", bank.bank], ["Branch", bank.branch], ["Account number", bank.accountNumber]] as const).map(([k, v]) => (
            <tr key={k}>
              <td className="w-40 border border-line px-2 py-1 font-medium">{k}</td>
              <td className="border border-line px-2 py-1">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="my-3 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-line px-2 py-1 text-left">Due Date</th>
            <th className="border border-line px-2 py-1 text-left">Amount</th>
            <th className="border border-line px-2 py-1 text-left">Particulars</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((r, i) => (
            <tr key={i}>
              <td className="border border-line px-2 py-1">{r.dueDate || " "}</td>
              <td className="border border-line px-2 py-1">{r.amount || " "}</td>
              <td className="border border-line px-2 py-1">{r.particulars || " "}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ClauseList clauses={buildTenancyClausesAfterTables(terms)} />

      <div className="mt-4">
        {TENANCY_INTERPRETATION.map((t, i) => (
          <p key={i} className="mb-2 text-sm">{t}</p>
        ))}
      </div>

      <p className="mb-2 mt-4 text-sm">
        IN WITNESS WHEREOF the parties have hereunto set their hands as shown below — the Landlord and the Tenant sign
        electronically.
      </p>

      {inventory.length > 0 && (
        <>
          <h4 className="mb-1.5 mt-4 text-sm font-bold text-navy">INVENTORY LIST</h4>
          <table className="my-2 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-line px-2 py-1 text-left">Quantity</th>
                <th className="border border-line px-2 py-1 text-left">Particulars</th>
                <th className="border border-line px-2 py-1 text-left">Brand</th>
                <th className="border border-line px-2 py-1 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((r, i) => (
                <tr key={i}>
                  <td className="border border-line px-2 py-1">{r.quantity || " "}</td>
                  <td className="border border-line px-2 py-1">{r.particulars}</td>
                  <td className="border border-line px-2 py-1">{r.brand || " "}</td>
                  <td className="border border-line px-2 py-1 italic">{r.remarks || " "}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h4 className="mb-1.5 mt-4 text-sm font-bold text-navy">Reminders</h4>
      <ol className="list-decimal pl-6 text-sm">
        {TENANCY_REMINDERS.map((t, i) => (
          <li key={i} className="mb-1">{t}</li>
        ))}
      </ol>
    </div>
  );
}
