// Single source of truth for the Short Term Rental Agreement's contract
// text, matching the reference template ("Short Term Rental Agreement
// TEMPLATE") verbatim. Isomorphic (no server-only imports) so both the PDF
// template (lib/pdf/short-term-rental.tsx) and the public signing pages'
// full-text review share it and can never drift.
//
// Reuses the clause/paragraph shapes and date helpers from the tenancy
// agreement's clause lib — same rendering model, different contract. The
// property-side party is called "Landlord" (not "Landlord") throughout,
// matching the reference template.

import { pesoAmountFigures } from "@/lib/pm/amount-words";
import {
  BLANK,
  type TenancyClause, type TenancyBankDetails,
} from "@/lib/pm/tenancy-clauses";

export type StrClause = TenancyClause;
export type StrBankDetails = TenancyBankDetails;

export type StrLandlordDetails = { name?: string; address?: string };
export type StrTenantDetails = { name?: string; address?: string; contact?: string; email?: string };
export type StrPropertyDetails = { buildingName?: string; unitNumber?: string; address?: string };
export type StrFeeItem = { label: string; amount: number };
export type StrInventoryRow = { quantity: string; particulars: string; brand: string; remarks: string };

export const DEFAULT_STR_BANK_DETAILS: StrBankDetails = {
  name: "All Abode Brokerage and Valuation OPC",
  bank: "Union Bank of the Philippines",
  branch: "JTKC Building, Pasong Tamo Branch",
  accountNumber: "0020 2003 7938",
};

/** The opening recital paragraph — a modern plain-language intro (not the
 *  "KNOW ALL MEN BY THESE PRESENTS" boilerplate used by Tenancy/Parking). */
export function strRecital(landlordName: string | null | undefined, tenantName: string | null | undefined): string {
  return (
    `This Short Term Rental Agreement (the "Agreement") is entered into by and between ` +
    `${landlordName?.trim() || BLANK} (the "Landlord") and ${tenantName?.trim() || BLANK} (the "Tenant"), ` +
    `each a "Party" and collectively the "Parties," as of the date last set forth on the signature page of this ` +
    `Agreement (the "Effective Date"). This Agreement is administered on the Landlord's behalf by All Abode ` +
    `Brokerage and Valuation OPC (the "Property Manager"). For good and valuable consideration, the sufficiency ` +
    `of which is acknowledged, the Parties agree as follows:`
  );
}

export const STR_DISCLAIMER =
  "DISCLAIMER: This Short Term Rental Agreement has been prepared by All Abode Brokerage and Valuation OPC for " +
  "submission to the Landlord and to the Tenant for review and approval. No representation or recommendation is " +
  "made by the Company, as to the legal sufficiency, legal effect, or tax consequences of this agreement. Both " +
  "parties may seek legal advice when in doubt. All Abode Brokerage and Valuation OPC, its owners, representatives " +
  "and employees, shall not be held responsible for any disputes arising from non-compliance of either parties to " +
  "this agreement.";

/** Annex B — Rental Rules (static boilerplate, with two per-booking blanks). */
export function strRentalRules(garbageDisposalLocation: string | null | undefined): string[] {
  return [
    "Smoking is strictly NOT allowed.",
    "Tenants are not allowed to exceed the registered occupancy limit.",
    "Only registered tenants may stay and use the condominium facilities. Visitors are not allowed to sleep over. " +
      "For visitor requests, email the request and the visitor's ID to info@allabodeph.com.",
    "Tenants should not create excessive noise that disturbs neighbors.",
    "All units are privately owned; the Landlord is not responsible for any accident, injury, or illness occurring " +
      "on the premises or its facilities, nor for loss of the Tenant's or guests' personal belongings or valuables.",
    "Keep the property and all furnishings in good order.",
    "Only use appliances for their intended purpose.",
    "Pets are NOT allowed.",
    "Housekeeping is available for a fee: Php 1,000/cleaning (quick), Php 1,500/cleaning (general), " +
      "Php 1,000/aircon cleaning, Php 1,000/grease-trap cleaning.",
    `Garbage must be placed in the proper garbage or recycling receptacle at ${garbageDisposalLocation?.trim() || BLANK}.`,
    "Bathroom: DO NOT flush anything other than toilet paper. No feminine products should be flushed at any time; " +
      "if flushing feminine products is found to have clogged the septic system, the Tenant may be charged damages " +
      "of up to Php 10,000.",
    "Fitness Gym: proper workout attire required; please provide a unit number to use the gym. Food, drinks, " +
      "cigarettes, and liquor are strictly prohibited inside the gym.",
    "Function Hall: reservation must be pre-arranged and is subject to an extra fee.",
    "For concerns or questions, contact All Abode PH at 0917-159-6808 or info@allabodeph.com.",
  ];
}

/** Annex C — Move-Out Checklist (static boilerplate). */
export const STR_MOVE_OUT_CHECKLIST: string[] = [
  "Email the list of items to be removed from the unit at least three (3) days before the move-out date, for gate " +
    "pass preparation.",
];

export type StrTermsInput = {
  propertyDetails: StrPropertyDetails;
  checkInDate: string | null;
  checkOutDate: string | null;
  occupants: string[];
  amenityLocation: string | null;
  amenitiesList: string | null;
  garbageDisposalLocation: string | null;
};

function moneyFigures(amount: number | null | undefined): string {
  return amount != null ? pesoAmountFigures(amount) : BLANK;
}

/** ISO date → "August 1, 2026" (or a blank line when unset). */
function longDate(iso: string | null | undefined): string {
  const m = (iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return BLANK;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * Clauses 1 through 5, plus clause 6's lead-in — after these, the reference
 * prints the fee table then the bank-details table, then clause 6.1 onward
 * (buildStrClausesAfterTable). Both consumers render in that order.
 */
export function buildStrClausesBeforeTable(t: StrTermsInput): StrClause[] {
  const pd = t.propertyDetails ?? {};
  const occupantLines = (t.occupants ?? []).map((name) => name.trim()).filter(Boolean);
  const renderedOccupantLines = occupantLines.length > 0 ? occupantLines : [BLANK];

  return [
    {
      no: 1,
      title: "THE PROPERTY",
      paras: [
        {
          sub: "1.1",
          fields: [["BUILDING", pd.buildingName || BLANK]],
        },
        {
          sub: "1.2",
          fields: [["UNIT", pd.unitNumber || BLANK]],
        },
        {
          sub: "1.3",
          fields: [["ADDRESS", pd.address || BLANK]],
        },
        {
          sub: "1.4",
          text:
            "The Property is furnished per the attached Rental Agreement Checklist (Annex A). The Tenant shall " +
            "inspect the Property at Check-in and confirm its condition and inventory. Any discrepancy, damage, or " +
            "missing item must be reported in writing to the Landlord or the Property Manager within twenty-four " +
            "(24) hours of Check-in; absent such notice, the Property and its furnishings shall be deemed accepted " +
            "in good order and condition.",
        },
      ],
    },
    {
      no: 2,
      title: "OCCUPANTS",
      paras: [
        {
          sub: "2.1",
          text: "Registered Occupant(s):",
          numbered: renderedOccupantLines.map((name, i) => ({ marker: `${i + 1})`, text: name })),
        },
        {
          sub: "2.2",
          text:
            "Only the Tenant and any additional occupants disclosed in writing and approved in advance by the " +
            "Landlord or Property Manager may reside at or overnight in the Property. Unregistered visitors may " +
            "not stay overnight, consistent with the Rental Rules (Annex B).",
        },
      ],
    },
    {
      no: 3,
      title: "TERM",
      paras: [
        {
          sub: "3.1",
          fields: [["CHECK-IN DATE", longDate(t.checkInDate)]],
        },
        {
          sub: "3.2",
          fields: [["CHECKOUT DATE", longDate(t.checkOutDate)]],
        },
        {
          sub: "3.3",
          subTitle: "Holdover.",
          text:
            "If the Tenant remains in the Property after the Checkout Date without the Landlord's prior written " +
            "consent, the Tenant shall pay a holdover fee equivalent to the prevailing nightly rate for each day or " +
            "part thereof beyond the Checkout Date, without prejudice to the Landlord's right to recover " +
            "possession of the Property and pursue any other remedy available at law.",
        },
        {
          sub: "3.4",
          subTitle: "Extension.",
          text:
            "Any extension of the Term must be agreed in writing in advance, is subject to unit availability and " +
            "prevailing rates, and the corresponding fees are due in full prior to the start of the extension " +
            "period.",
        },
      ],
    },
    {
      no: 4,
      title: "RENTAL RULES",
      paras: [
        {
          text:
            "The Tenant agrees to comply with the Rental Rules (Annex B) and the condominium's own house rules at " +
            "all times. A material and uncured breach of the Rental Rules constitutes a material breach of this " +
            "Agreement and may result in termination under Section 9 (Termination for Cause).",
        },
      ],
    },
    {
      no: 5,
      title: "CONDOMINIUM AMENITIES",
      paras: [
        {
          text:
            `Condominium amenities are located at ${t.amenityLocation?.trim() || BLANK}: ` +
            `${t.amenitiesList?.trim() || BLANK}, subject to the condominium's own rules and any applicable ` +
            "reservation fees. Use of any amenity is at the Tenant's and its guests' own risk, as further set out " +
            "in Section 10 (Waiver and Release).",
        },
      ],
    },
    {
      no: 6,
      title: "RENTAL RATES AND FEES",
      paras: [
        { text: "The rental rates and fees for this booking are set out in the table below." },
      ],
    },
  ];
}

/** Clause 6.1 (bank details lead-in) and 6.2, printed immediately after the fee/bank tables. */
export function strClause61Intro(bank: StrBankDetails): string {
  return `Bank Details for Payment — Bank: ${bank.bank}, Account Name: ${bank.name}, Account Number: ${bank.accountNumber}.`;
}

/** Clauses 6.2 through 17, printed after the fee/bank tables. */
export function buildStrClausesAfterTable(): StrClause[] {
  return [
    {
      no: 6,
      title: "",
      paras: [
        {
          sub: "6.2",
          text:
            "All amounts stated are exclusive of any government taxes that may apply, which shall be for the " +
            "Tenant's account if legally imposed on the Tenant.",
        },
      ],
    },
    {
      no: 7,
      title: "SECURITY DEPOSIT",
      paras: [
        {
          sub: "7.1",
          text: "The Security Deposit shall be refunded within thirty (30) days from the Checkout Date, less any deductions for:",
          numbered: [
            { marker: "•", text: "Damage to the Property or its furnishings beyond ordinary wear and tear;" },
            { marker: "•", text: "Unit cleaning, including aircon and grease-trap cleaning;" },
            { marker: "•", text: "Unpaid bills or other charges properly due under this Agreement; and" },
            { marker: "•", text: "Any other cost or expense reasonably and actually incurred by the Landlord arising from the Tenant's stay, including breach of the Rental Rules." },
          ],
        },
        {
          sub: "7.2",
          text:
            "The Landlord or Property Manager shall provide the Tenant an itemized statement of any deductions " +
            "within the same thirty (30)-day period. The Tenant may dispute a deduction in writing within seven " +
            "(7) days of receiving the statement; absent a timely dispute, the statement shall be deemed final and " +
            "binding.",
        },
        {
          sub: "7.3",
          text:
            "The Security Deposit is not a cap on the Tenant's liability. The Landlord may pursue the Tenant " +
            "directly for costs or damages exceeding the Security Deposit.",
        },
      ],
    },
    {
      no: 8,
      title: "CANCELLATION POLICY",
      paras: [
        {
          sub: "8.1",
          text:
            "If the Tenant cancels the reservation for any reason prior to the Check-in Date, the Security " +
            "Deposit shall be forfeited in favor of the Landlord, without prejudice to the Landlord's right to " +
            "recover any additional actual damages caused by the cancellation.",
        },
        {
          sub: "8.2",
          text:
            "If the Landlord must cancel the reservation prior to Check-in for reasons beyond its reasonable " +
            "control (see Section 12, Force Majeure), the Landlord's sole liability shall be to refund amounts " +
            "actually paid by the Tenant, and the Landlord shall have no further liability for consequential, " +
            "incidental, or special damages.",
        },
      ],
    },
    {
      no: 9,
      title: "TERMINATION FOR CAUSE",
      paras: [
        {
          sub: "9.1",
          text:
            "The Landlord or Property Manager may terminate this Agreement immediately upon written notice, " +
            "without refund of any amount paid, and may require the Tenant to vacate the Property within " +
            "twenty-four (24) hours, if the Tenant:",
          numbered: [
            { marker: "•", text: "uses the Property for any illegal purpose;" },
            { marker: "•", text: "causes substantial damage to the Property or poses a safety risk to other occupants of the condominium;" },
            { marker: "•", text: "materially breaches the Rental Rules (including but not limited to smoking, keeping pets, exceeding the registered occupancy, or allowing unregistered visitors to stay overnight) and fails to cure the breach, if curable, within twenty-four (24) hours of notice; or" },
            { marker: "•", text: "fails to pay any amount due under this Agreement." },
          ],
        },
        {
          sub: "9.2",
          text:
            "Termination under this Section is without prejudice to the Landlord's right to retain the Security " +
            "Deposit and pursue any other remedy available at law.",
        },
      ],
    },
    {
      no: 10,
      title: "WAIVER AND RELEASE OF LIABILITY",
      paras: [
        {
          sub: "10.1",
          text:
            "The Tenant, for itself and its guests, waives and releases any claim against the Landlord, the " +
            "Property Manager, and their respective successors, assigns, employees, and representatives for any " +
            "injury, loss, or death arising from or in connection with the Tenant's or its guests' use of the " +
            "Property or any common facilities or amenities, except to the extent caused by the gross negligence " +
            "or willful misconduct of the Landlord or Property Manager.",
        },
        {
          sub: "10.2",
          text:
            "The Tenant shall be liable for, and shall indemnify and hold harmless the Landlord and Property " +
            "Manager from, any loss or damage to the Property, its furnishings, or the condominium's common areas " +
            "caused by the Tenant or its guests.",
        },
        {
          sub: "10.3",
          text: "The Landlord and Property Manager are not responsible for the loss of the Tenant's or its guests' personal belongings or valuables.",
        },
      ],
    },
    {
      no: 11,
      title: "RIGHT OF ENTRY",
      paras: [
        {
          text:
            "The Landlord or Property Manager may enter the Property, upon at least twenty-four (24) hours' " +
            "prior notice to the Tenant, to conduct inspections, maintenance, or repairs, or to show the Property " +
            "to prospective tenants during the last seven (7) days of the Term. No prior notice is required in " +
            "cases of emergency threatening life, safety, or property.",
        },
      ],
    },
    {
      no: 12,
      title: "FORCE MAJEURE",
      paras: [
        {
          text:
            "Neither Party shall be liable for any failure or delay in performance under this Agreement to the " +
            "extent caused by events beyond its reasonable control, including natural disasters, fire, government " +
            "action, or building-wide utility interruption. If the Property becomes uninhabitable due to such an " +
            "event, the Landlord's sole obligation shall be to refund the pro-rated Rental Rate for the unused " +
            "portion of the Term.",
        },
      ],
    },
    {
      no: 13,
      title: "DATA PRIVACY",
      paras: [
        {
          sub: "13.1",
          text:
            "The Tenant consents to the collection, use, and processing by the Landlord and Property Manager of " +
            "the Tenant's personal information, including copies of government-issued identification, solely for " +
            "identity verification, contract administration, and compliance with condominium and legal " +
            "requirements, in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173).",
        },
        {
          sub: "13.2",
          text:
            "The Landlord and Property Manager shall retain such information only for as long as reasonably " +
            "necessary for the purposes stated above and shall implement reasonable measures to protect it from " +
            "unauthorized access or disclosure.",
        },
      ],
    },
    {
      no: 14,
      title: "ASSIGNMENT AND SUBLETTING",
      paras: [
        {
          text: "The Tenant may not assign this Agreement or sublet the Property, in whole or in part, without the Landlord's prior written consent.",
        },
      ],
    },
    {
      no: 15,
      title: "GOVERNING LAW AND DISPUTE RESOLUTION",
      paras: [
        {
          text:
            "This Agreement is governed by the laws of the Republic of the Philippines. The Parties shall first " +
            "attempt to resolve any dispute amicably; failing which, the dispute shall be brought exclusively " +
            "before the appropriate courts of Makati City.",
        },
      ],
    },
    {
      no: 16,
      title: "NOTICES",
      paras: [
        {
          text: "All notices under this Agreement shall be in writing and delivered by email or such other contact details as either Party may designate in writing from time to time.",
        },
      ],
    },
    {
      no: 17,
      title: "ENTIRE AGREEMENT; SEVERABILITY",
      paras: [
        {
          text:
            "This Agreement, together with its Annexes, constitutes the entire agreement between the Parties on " +
            "its subject matter and supersedes all prior agreements or understandings, written or oral. If any " +
            "provision of this Agreement is held invalid or unenforceable, the remaining provisions shall continue " +
            "in full force and effect.",
        },
      ],
    },
  ];
}

export { moneyFigures as strMoneyFigures, longDate as strLongDate };
