"use client";

import {
  buildStrClausesBeforeTable, buildStrClausesAfterTable, strClause61Intro,
  strRecital, strRentalRules, STR_MOVE_OUT_CHECKLIST,
  DEFAULT_STR_BANK_DETAILS,
  type StrClause, type StrTenantDetails,
  type StrFeeItem, type StrInventoryRow,
} from "@/lib/pm/short-term-rental-clauses";
import type { ClauseParagraph } from "@/lib/pm/tenancy-clauses";
import type { StrAgreementRecord } from "@/app/sign/short-term-rental-actions";

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
            <p key={n.marker + n.text} className="text-sm">
              <span className="inline-block w-8">{n.marker}</span>{n.text}
            </p>
          ))}
        </div>
      )}
    </>
  );
}

function ClauseList({ clauses }: { clauses: StrClause[] }) {
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

/**
 * Full-text on-screen review of the Short Term Rental Agreement, built from
 * the same clause source as the PDF (lib/pm/short-term-rental-clauses.ts) so
 * they never drift. `tenantDetails`/`occupants` are passed separately so the
 * tenant wizard can preview unsaved edits; the landlord page passes the
 * stored values.
 */
export function FullStrPreview({
  record, tenantDetails, occupants,
}: {
  record: StrAgreementRecord;
  tenantDetails: StrTenantDetails;
  occupants: string[];
}) {
  const terms = {
    propertyDetails: record.property_details ?? {},
    checkInDate: record.check_in_date,
    checkOutDate: record.check_out_date,
    occupants: occupants.filter((o) => o.trim()),
    amenityLocation: record.amenity_location,
    amenitiesList: record.amenities_list,
    garbageDisposalLocation: record.garbage_disposal_location,
  };
  const bank = { ...DEFAULT_STR_BANK_DETAILS, ...(record.bank_details ?? {}) };
  const feeItems: StrFeeItem[] = record.fee_items ?? [];
  const feeTotal = feeItems.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) + (Number(record.security_deposit_amount) || 0);
  const inventory: StrInventoryRow[] = (record.inventory ?? []).filter((r) => r.particulars?.trim());
  const landlordName = record.landlord_details?.name;
  const peso = (n: number) => `PHP ${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="text-ink">
      <h3 className="mb-3 text-center font-display text-base font-bold text-navy">SHORT TERM RENTAL AGREEMENT</h3>
      <p className="mb-2 text-sm">{strRecital(landlordName, tenantDetails.name)}</p>

      <ClauseList clauses={buildStrClausesBeforeTable(terms)} />

      <table className="my-3 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-line px-2 py-1 text-left">Item</th>
            <th className="border border-line px-2 py-1 text-right">Amount (PHP)</th>
          </tr>
        </thead>
        <tbody>
          {feeItems.map((r, i) => (
            <tr key={i}>
              <td className="border border-line px-2 py-1">{r.label || " "}</td>
              <td className="border border-line px-2 py-1 text-right">{peso(Number(r.amount) || 0)}</td>
            </tr>
          ))}
          <tr>
            <td className="border border-line px-2 py-1">Security Deposit</td>
            <td className="border border-line px-2 py-1 text-right">{peso(Number(record.security_deposit_amount) || 0)}</td>
          </tr>
          <tr>
            <td className="border border-line px-2 py-1 font-semibold">TOTAL DUE (upon signing)</td>
            <td className="border border-line px-2 py-1 text-right font-semibold">{peso(feeTotal)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mb-2 text-sm">{strClause61Intro(bank)}</p>

      <table className="my-3 w-full border-collapse text-sm">
        <tbody>
          {([["Name", bank.name], ["Bank", bank.bank], ["Branch", bank.branch], ["Account No.", bank.accountNumber]] as const).map(([k, v]) => (
            <tr key={k}>
              <td className="w-36 border border-line px-2 py-1 font-medium">{k}</td>
              <td className="border border-line px-2 py-1">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ClauseList clauses={buildStrClausesAfterTable()} />

      <p className="mb-2 mt-4 text-sm">
        The Parties agree to the terms of this Short Term Rental Agreement — the Landlord and the Tenant sign
        electronically.
      </p>

      {inventory.length > 0 && (
        <>
          <h4 className="mb-1.5 mt-4 text-sm font-bold text-navy">ANNEX A — RENTAL AGREEMENT CHECKLIST</h4>
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
                  <td className="border border-line px-2 py-1">{r.quantity || " "}</td>
                  <td className="border border-line px-2 py-1">{r.particulars}</td>
                  <td className="border border-line px-2 py-1">{r.brand || " "}</td>
                  <td className="border border-line px-2 py-1 italic">{r.remarks || " "}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h4 className="mb-1.5 mt-4 text-sm font-bold text-navy">ANNEX B — RENTAL RULES</h4>
      <ul className="list-disc pl-6 text-sm">
        {strRentalRules(record.garbage_disposal_location).map((rule, i) => (
          <li key={i} className="mb-1">{rule}</li>
        ))}
      </ul>

      <h4 className="mb-1.5 mt-4 text-sm font-bold text-navy">ANNEX C — MOVE-OUT CHECKLIST</h4>
      <ul className="list-disc pl-6 text-sm">
        {STR_MOVE_OUT_CHECKLIST.map((item, i) => (
          <li key={i} className="mb-1">{item}</li>
        ))}
      </ul>
    </div>
  );
}
