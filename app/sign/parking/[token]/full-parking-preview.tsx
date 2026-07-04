"use client";

import {
  buildParkingClausesBeforeTables, parkingClause5Intro, buildParkingClausesAfterTables,
  parkingRecital, landlordProse, parkingWhereas,
  DEFAULT_PARKING_BANK_DETAILS,
  type ParkingClause, type ParkingTenantDetails, type VehicleDetails,
  type ParkingScheduleRow,
} from "@/lib/pm/parking-clauses";
import { BLANK, type ClauseParagraph } from "@/lib/pm/tenancy-clauses";
import type { ParkingAgreementRecord } from "@/app/sign/parking-actions";

/** "N. TITLE. body…" numbered clauses; number prefixes the plain text when a clause has no bold title. */
function ClauseList({ clauses }: { clauses: ParkingClause[] }) {
  const para = (c: ParkingClause, p: ClauseParagraph, j: number) => (
    <div key={j}>
      {p.text && (
        <div className="mb-2 flex gap-2 text-sm">
          <span className="w-6 shrink-0">{j === 0 ? `${c.no}.` : ""}</span>
          <span>
            {j === 0 && c.title ? <span className="font-bold">{c.title} </span> : null}
            {p.text}
          </span>
        </div>
      )}
      {p.numbered && (
        <div className="mb-2 flex flex-col gap-1 pl-14">
          {p.numbered.map((n) => (
            <p key={n.marker + n.text} className="text-sm">
              <span className="inline-block w-5">{n.marker}</span>{n.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
  return <>{clauses.map((c) => <div key={c.no}>{c.paras.map((p, j) => para(c, p, j))}</div>)}</>;
}

/**
 * Full-text on-screen review of the Parking Space Rental Agreement, built
 * from the same clause source as the PDF (lib/pm/parking-clauses.ts) so they
 * never drift. `tenantDetails`/`vehicleDetails` are passed separately so the
 * tenant wizard can preview unsaved edits; the landlord page passes the
 * stored values.
 */
export function FullParkingPreview({
  record, tenantDetails, vehicleDetails,
}: {
  record: ParkingAgreementRecord;
  tenantDetails: ParkingTenantDetails;
  vehicleDetails: VehicleDetails;
}) {
  const terms = {
    parkingDetails: record.parking_details ?? {},
    leaseStartDate: record.lease_start_date,
    leaseEndDate: record.lease_end_date,
    rentAmount: record.rent_amount !== null ? Number(record.rent_amount) : null,
    rentAmountWords: record.rent_amount_words,
    signingTotalAmount: record.signing_total_amount !== null ? Number(record.signing_total_amount) : null,
    signingTotalWords: record.signing_total_words,
    stickerAmount: record.sticker_amount !== null ? Number(record.sticker_amount) : null,
    rentDueDay: record.rent_due_day,
    vehicleDetails,
  };
  const bank = { ...DEFAULT_PARKING_BANK_DETAILS, ...(record.bank_details ?? {}) };
  const schedule: ParkingScheduleRow[] = record.payment_schedule ?? [];
  const ld = record.landlord_details ?? {};

  return (
    <div className="text-ink">
      <h3 className="mb-3 text-center font-display text-base font-bold text-navy">PARKING SPACE RENTAL AGREEMENT</h3>
      <p className="mb-2 text-center text-sm">KNOW ALL MEN BY THESE PRESENTS:</p>
      <p className="mb-2 text-sm">{parkingRecital(record.agreement_date, record.agreement_city)}</p>
      <p className="mb-2 text-sm">{landlordProse(ld)}</p>
      <p className="mb-2 text-center text-sm">- and -</p>
      <p className="mb-2 text-sm">
        <span className="font-bold">{tenantDetails.name?.trim() || BLANK},</span>{" "}
        Filipino, of legal age, with residential address at {tenantDetails.address?.trim() || BLANK}, hereinafter
        referred to as TENANT.
      </p>
      <p className="mb-2 text-center text-sm">WITNESSETH THAT:</p>
      <p className="mb-2 text-sm">{parkingWhereas(terms.parkingDetails)}</p>

      <ClauseList clauses={buildParkingClausesBeforeTables(terms)} />
      <ClauseList clauses={[parkingClause5Intro(terms, bank)]} />

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

      {schedule.length > 0 && (
        <table className="my-3 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-line px-2 py-1 text-left">DATE DUE</th>
              <th className="border border-line px-2 py-1 text-left">AMOUNT</th>
              <th className="border border-line px-2 py-1 text-left">BANK/BRANCH</th>
              <th className="border border-line px-2 py-1 text-left">COVERAGE</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((r, i) => (
              <tr key={i}>
                <td className="border border-line px-2 py-1">{r.dueDate || " "}</td>
                <td className="border border-line px-2 py-1">{r.amount || " "}</td>
                <td className="border border-line px-2 py-1">{r.bankBranch || " "}</td>
                <td className="border border-line px-2 py-1">{r.coverage || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ClauseList clauses={buildParkingClausesAfterTables(terms)} />

      <p className="mb-2 mt-4 text-sm">
        IN WITNESS WHEREOF, the parties hereto have signed this instrument on the day, year, and place hereinbefore
        mentioned — the Landlord and the Tenant sign electronically.
      </p>
    </div>
  );
}
