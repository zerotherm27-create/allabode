// Single source of truth for the Parking Space Rental Agreement's contract
// text, matching the reference template verbatim. Isomorphic (no server-only
// imports) so both the PDF template (lib/pdf/parking.tsx) and the public
// signing pages' full-text review share it and can never drift.
//
// Reuses the clause/paragraph shapes and date helpers from the tenancy
// agreement's clause lib — same rendering model, different contract.

import { numberToWords, pesoAmountFigures } from "@/lib/pm/amount-words";
import {
  recitalDateParts, ordinalNumber, BLANK,
  type TenancyClause, type TenancyBankDetails,
} from "@/lib/pm/tenancy-clauses";

export type ParkingClause = TenancyClause;
export type ParkingBankDetails = TenancyBankDetails;

export type ParkingLandlordDetails = { name?: string; idNumber?: string; address?: string };
export type ParkingTenantDetails = { name?: string; address?: string; contact?: string; email?: string };
export type ParkingSpaceDetails = { slotLabel?: string; buildingName?: string; address?: string };
export type VehicleDetails = { makeModel?: string; plateNo?: string; color?: string };
export type ParkingScheduleRow = { dueDate: string; amount: string; bankBranch: string; coverage: string };

export const DEFAULT_PARKING_BANK_DETAILS: ParkingBankDetails = {
  name: "All Abode Property Management Corp.",
  bank: "Banco de Oro (BDO)",
  branch: "Makati Cinema Square",
  accountNumber: "004290181697",
};

export const PARKING_DISCLAIMER =
  "DISCLAIMER: This Parking Space Rental Agreement has been prepared by All Abode Brokerage and Valuation OPC " +
  "for submission to the Landlord and to the Tenant for review and approval. No representation or recommendation " +
  "is made by the Company, as to the legal sufficiency, legal effect, or tax consequences of this agreement. " +
  "Both parties may seek legal advice when in doubt. All Abode Brokerage and Valuation OPC, its owners, " +
  "representatives and employees, shall not be held responsible for any disputes arising from non-compliance " +
  "of either parties to this agreement.";

/** ISO date → "May 15, 2026" (or a blank line when unset). */
export function longDate(iso: string | null | undefined): string {
  const m = (iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return BLANK;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "made and entered into on the 15th day of May 2026, in Makati City, Philippines" */
export function parkingRecital(agreementDate: string | null | undefined, city: string | null | undefined): string {
  const p = recitalDateParts(agreementDate);
  const when = p ? `${p.day} day of ${p.month} ${p.year}` : "___ day of __________ 20__";
  return (
    `This Parking Space Rental Agreement, made and entered into on the ${when}, in ` +
    `${city?.trim() || "____________"}, Philippines, by and between:`
  );
}

export function landlordProse(ld: ParkingLandlordDetails): string {
  return (
    `${ld.name?.trim() || BLANK}, Filipino, of legal age with residential address at ` +
    `${ld.address?.trim() || BLANK}, hereinafter known as LANDLORD.`
  );
}

export function tenantProse(td: ParkingTenantDetails): string {
  return (
    `${td.name?.trim() || BLANK}, Filipino, of legal age, with residential address at ` +
    `${td.address?.trim() || BLANK}, hereinafter referred to as TENANT.`
  );
}

export function parkingWhereas(pd: ParkingSpaceDetails): string {
  return (
    `WHEREAS, the LANDLORD is the owner of the ${pd.slotLabel?.trim() || BLANK}, located at ` +
    `${[pd.buildingName?.trim(), pd.address?.trim()].filter(Boolean).join(", ") || BLANK}, ` +
    "hereinafter referred to as the PARKING SPACE;"
  );
}

export type ParkingTermsInput = {
  parkingDetails: ParkingSpaceDetails;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  rentAmount: number | null;
  rentAmountWords: string | null;
  signingTotalAmount: number | null;
  signingTotalWords: string | null;
  stickerAmount: number | null;
  rentDueDay: number | null;
  vehicleDetails: VehicleDetails;
};

function moneyWords(words: string | null | undefined, amount: number | null | undefined): string {
  return words?.trim() || (amount != null ? numberToWords(Math.floor(amount)) : "") || BLANK;
}
function moneyFigures(amount: number | null | undefined): string {
  return amount != null ? pesoAmountFigures(amount) : BLANK;
}

/**
 * Clauses 1 through 5's intro paragraph — after these, the reference prints
 * the bank-details table and the 4-column payment-schedule table, then
 * clauses 6-11 (buildParkingClausesAfterTables). Both consumers render in
 * that order.
 */
export function buildParkingClausesBeforeTables(t: ParkingTermsInput): ParkingClause[] {
  return [
    {
      no: 1,
      title: "DURATION.",
      paras: [
        {
          text:
            `The LANDLORD hereby leases to the TENANT the PARKING SPACE from ${longDate(t.leaseStartDate)}, ` +
            `to ${longDate(t.leaseEndDate)}.`,
        },
      ],
    },
    {
      no: 2,
      title: "PARKING SPACE CONDITION.",
      paras: [
        {
          text:
            "The LANDLORD warrants that the parking space shall be delivered to the TENANT in a clean and usable " +
            "condition on the commencement date. Any pre-existing damage or defect shall be documented and signed " +
            "by both parties within five (5) days of commencement and shall not be charged to the TENANT upon " +
            "vacating.",
        },
      ],
    },
    {
      no: 3,
      title: "MONTHLY RENTAL RATE.",
      paras: [
        {
          text:
            `The TENANT shall pay to the LANDLORD a monthly rental rate of ${moneyWords(t.rentAmountWords, t.rentAmount)} ` +
            `Pesos (Php ${moneyFigures(t.rentAmount)}), Philippine currency, payable on or before the ` +
            `${t.rentDueDay ? ordinalNumber(t.rentDueDay) : "____"} of each month. A PENALTY of four percent (4%) ` +
            "will be imposed for late payment of monthly rental.",
        },
      ],
    },
    {
      no: 4,
      title: "ADVANCE RENT AND SECURITY DEPOSIT.",
      paras: [
        {
          text:
            "In addition to the payment of two months’ ADVANCE RENT, which will be applied as the tenant's rental " +
            "payment for the first two months of the parking lease, the TENANT shall pay the LANDLORD a SECURITY " +
            "DEPOSIT equal to one month's rent.",
        },
        {
          text:
            `This results in a total amount of ${moneyWords(t.signingTotalWords, t.signingTotalAmount)} Pesos ` +
            `(Php ${moneyFigures(t.signingTotalAmount)}) due upon signing of this Parking Space Agreement. ` +
            `A parking sticker amounting to Php ${t.stickerAmount != null ? pesoAmountFigures(t.stickerAmount) : "________"} ` +
            "shall be payable by the TENANT to the Property Management Office (PMO) of " +
            `${t.parkingDetails.buildingName?.trim() || BLANK}.`,
        },
      ],
    },
  ];
}

/** Clause 5's intro paragraph, printed immediately before the bank table. */
export function parkingClause5Intro(t: ParkingTermsInput, bank: ParkingBankDetails): ParkingClause {
  return {
    no: 5,
    title: "",
    paras: [
      {
        text:
          `The TENANT shall pay via bank transfer payable to ${bank.name} at ` +
          `Php ${moneyFigures(t.rentAmount)} per month. The bank details for transfer are as follows:`,
      },
    ],
  };
}

/** Clauses 6-11, printed after the bank/schedule tables. */
export function buildParkingClausesAfterTables(t: ParkingTermsInput): ParkingClause[] {
  const v = t.vehicleDetails ?? {};
  return [
    {
      no: 6,
      title: "",
      paras: [
        {
          text:
            "The LANDLORD is not responsible for any vehicle or any items left in the vehicle parked in the " +
            "designated space.",
        },
      ],
    },
    {
      no: 7,
      title: "AUTHORIZED USE OF PARKING SPACE.",
      paras: [
        {
          text:
            "The TENANT may only park a vehicle that is registered in the TENANT's name. TENANT may not assign, " +
            "sublet, or allow any other person to use this space. This space is exclusively used for the parking " +
            "of passenger automobiles by the TENANT. No other vehicle or item may be stored in this space without " +
            "prior written consent of the LANDLORD.",
        },
        {
          text: "Authorized Vehicle Details",
          numbered: [
            { marker: "•", text: `Make/Model: ${v.makeModel?.trim() || BLANK}` },
            { marker: "•", text: `Plate No.: ${v.plateNo?.trim() || BLANK}` },
            { marker: "•", text: `Color: ${v.color?.trim() || BLANK}` },
          ],
        },
      ],
    },
    {
      no: 8,
      title: "MISUSE OF PARKING SPACE.",
      paras: [
        {
          text:
            "TENANT may not wash, repair, or paint in this space or in any other common area in the premises. " +
            "Only vehicles that are fully operational may park in this space.",
        },
      ],
    },
    {
      no: 9,
      title: "PRE-TERMINATION.",
      paras: [
        {
          text:
            "Should the TENANT need to pre-terminate this Agreement before the end of the Rental Period, the " +
            "TENANT shall provide the LANDLORD with a written notice of at least thirty (30) days before the " +
            "intended termination date. In the event of pre-termination, the Security Deposit shall be forfeited " +
            "in favor of the LANDLORD as liquidated damages, unless the pre-termination is due to causes " +
            "attributable to the LANDLORD.",
        },
      ],
    },
    {
      no: 10,
      title: "TERMINATION OF LEASE.",
      paras: [
        {
          text:
            "The LANDLORD shall return the Security Deposit to the TENANT within thirty (30) days after the " +
            "termination or expiry of this Agreement, less any unpaid rentals, penalties, or damages attributable " +
            "to the TENANT.",
        },
      ],
    },
    {
      no: 11,
      title: "LEASE RENEWAL.",
      paras: [
        {
          text:
            "The TENANT shall have the right to renew this Agreement for another one (1) year term, subject to " +
            "mutual written agreement of both parties on the rental rate, to be communicated no later than thirty " +
            "(30) days before the expiry of the current term.",
        },
      ],
    },
  ];
}
