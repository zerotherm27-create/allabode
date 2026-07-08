// Single source of truth for the Tenancy Agreement's contract text, matching
// the reference document ("Tenancy Agreement — All Abode x Tenant") verbatim.
// Kept isomorphic (no server-only imports) so both the PDF template
// (lib/pdf/tenancy.tsx) and the public signing pages' full-text review can
// import it without pulling Node-only code into the browser bundle — and so
// the on-screen preview and the generated PDF can never drift apart.

import { numberToWords, pesoAmountFigures } from "@/lib/pm/amount-words";

// ── Shapes stored in tenancy_agreements jsonb columns ───────────────────────

export type TenancyLandlordDetails = { name?: string; idNumber?: string; address?: string };
export type TenancyTenantDetails = { name?: string; idNumber?: string; address?: string; contact?: string; email?: string };
export type TenancyPropertyDetails = { buildingName?: string; floorUnit?: string; address?: string };
export type PaymentScheduleRow = { dueDate: string; amount: string; particulars: string };
export type InventoryRow = { quantity: string; particulars: string; brand: string; remarks: string };
export type TenancyBankDetails = { name: string; bank: string; branch: string; accountNumber: string };

export const DEFAULT_BANK_DETAILS: TenancyBankDetails = {
  name: "All Abode Brokerage and Valuation OPC",
  bank: "Union Bank of the Philippines",
  branch: "JTKC Building, Pasong Tamo Branch",
  accountNumber: "0020 2003 7938",
};

export const DEFAULT_INVENTORY: InventoryRow[] = [
  { quantity: "1", particulars: "Aircon", brand: "", remarks: "Cleaning every 6 months and before move out c/o tenant" },
  { quantity: "1", particulars: "Grease trap", brand: "", remarks: "Cleaning every move out or as needed." },
  { quantity: "1", particulars: "Fire Extinguisher", brand: "", remarks: "" },
  { quantity: "", particulars: "Keys", brand: "", remarks: "" },
  { quantity: "", particulars: "Access cards", brand: "", remarks: "" },
];

/** Particulars column of the reference payment schedule, in print order. */
export const DEFAULT_PAYMENT_PARTICULARS = [
  "1 month advance/Reservation",
  "2 months security deposit",
  "2nd month advance",
  "3rd month advance",
  "4th month advance",
  "5th month advance",
  "6th month advance",
  "7th month advance",
  "8th month advance",
  "9th month advance",
  "10th month advance",
  "11th month advance",
  "12th month advance",
];

export const TENANCY_HEADER_CONTACT = "M: +63 917 159 6808 | E: info@allabodeph.com | W: www.allabodeph.com";

export const TENANCY_DISCLAIMER =
  "DISCLAIMER: This Tenancy Agreement has been prepared by All Abode Brokerage and Valuation OPC for " +
  "submission to the Landlord and to the Tenant for review and approval. No representation or recommendation " +
  "is made by the Company, as to the legal sufficiency, legal effect, or tax consequences of this tenancy " +
  "agreement. Both parties may seek legal advice when in doubt. All Abode Brokerage and Valuation OPC, its " +
  "owners, representatives and employees, shall not be held responsible for any disputes arising from " +
  "non-compliance of either parties to this agreement.";

export const TENANCY_REMINDERS = [
  "Please follow building rules and regulations. Kindly review building house rules for reference.",
  "For bank transfer payments, please email your transfer slip via email at info@allabodeph.com with a Subject header: Rental Payment due (Month) – Bldg. & Unit Number – Date of Transfer",
  "Move out reminders: General Cleaning, Aircon Cleaning, Grease Trap Cleaning must be done on or after move out.",
  "Emergency cases such as electric outage in your unit, leakage, contact maintenance personnel for checking. Please let us know the update.",
  "Any concerns or requests, please send via email. For urgent matter, please call or SMS +63 917 159 6808",
];

// ── Date/blank helpers ──────────────────────────────────────────────────────

export function ordinalNumber(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** ISO date → parts for "the {day} of {month} {year}" recitals. */
export function recitalDateParts(iso: string | null | undefined): { day: string; month: string; year: string } | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { day: ordinalNumber(Number(m[3])), month: MONTHS[Number(m[2]) - 1] ?? "", year: m[1] };
}

/** ISO date → "1st of August 2026" (or a blank line when unset). */
export function recitalDate(iso: string | null | undefined): string {
  const p = recitalDateParts(iso);
  return p ? `${p.day} of ${p.month} ${p.year}` : "____ of ____________ 20__";
}

export const BLANK = "____________________";

// ── Clause text ─────────────────────────────────────────────────────────────

export type ClauseParagraph = {
  /** Sub-clause number like "3.1" or "22.1" (printed before the text). */
  sub?: string;
  /** Bold heading for a titled sub-clause (e.g. 22.1 RIGHT OF RE-ENTRY). */
  subTitle?: string;
  text?: string;
  /** "LABEL: value" field lines (clause 1 property block). */
  fields?: [string, string][];
  /** Numbered list lines ((a)… for 3.1, 1)… for occupants). */
  numbered?: { marker: string; text: string }[];
};

export type TenancyClause = {
  no: number;
  title: string;
  paras: ClauseParagraph[];
};

export type TenancyTermsInput = {
  propertyDetails: TenancyPropertyDetails;
  leaseMonths: number | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  rentAmount: number | null;
  rentAmountWords: string | null;
  advanceDepositAmount: number | null;
  advanceDepositWords: string | null;
  depositAmount: number | null;
  depositAmountWords: string | null;
  rentDueDay: number | null;
  occupants: string[];
};

function moneyWords(words: string | null | undefined, amount: number | null | undefined): string {
  return words?.trim() || (amount != null ? numberToWords(Math.floor(amount)) : "") || BLANK;
}
function moneyFigures(amount: number | null | undefined): string {
  return amount != null ? pesoAmountFigures(amount) : BLANK;
}

/**
 * Clauses 1 through 3.4 — after these, the reference prints the bank-details
 * and payment-schedule tables, then clause 3.5 and clauses 4-30
 * (buildTenancyClausesAfterTables). Both consumers render in that order.
 */
export function buildTenancyClausesBeforeTables(t: TenancyTermsInput): TenancyClause[] {
  const pd = t.propertyDetails ?? {};
  const start = recitalDateParts(t.leaseStartDate);
  const end = recitalDateParts(t.leaseEndDate);
  const months = t.leaseMonths;

  return [
    {
      no: 1,
      title: "LEASED PROPERTY",
      paras: [
        { text: "The Landlord agrees to let and the Tenant agrees to take all that property known as" },
        {
          fields: [
            ["BUILDING NAME", pd.buildingName || BLANK],
            ["FLOOR/UNIT NUMBER", pd.floorUnit || BLANK],
            ["ADDRESS", pd.address || BLANK],
          ],
        },
        {
          text:
            "(hereinafter called “the said premises”) together with the furniture, fixtures and fittings therein " +
            "belonging to the Landlord as specified in the Schedule annexed hereto (hereinafter called “the " +
            "furniture”) TO HOLD unto the Tenant.",
        },
      ],
    },
    {
      no: 2,
      title: "LEASE PERIOD",
      paras: [
        {
          text:
            `The term of this Agreement shall be for a definite period of ${months ? numberToWords(months) : BLANK} ` +
            `(${months ?? "___"}) month/s, starting from the ${start ? `${start.day} of ${start.month} ${start.year}` : "____ of ______________ 20__"} ` +
            `to ${end ? `${end.day} day of ${end.month} ${end.year}` : "____ day of ____________ 20___"}.`,
        },
      ],
    },
    {
      no: 3,
      title: "MONTHLY RENT",
      paras: [
        {
          sub: "3.1",
          text:
            `The agreed rent payment is ${moneyWords(t.rentAmountWords, t.rentAmount)} PHILIPPINE PESO, ` +
            `(PHP ${moneyFigures(t.rentAmount)}) per month comprising:-`,
          numbered: [
            { marker: "(a)", text: `Php ${moneyFigures(t.rentAmount)} being rental in respect of the said premises and the use of furniture inside the premises.` },
            { marker: "(b)", text: "The rental includes building association dues." },
          ],
        },
        {
          sub: "3.2",
          text:
            "Upon signing of this contract, the Tenant shall give (1) Month advance rental and 2 months security " +
            `deposit amounting to ${moneyWords(t.advanceDepositWords, t.advanceDepositAmount)} PHILIPPINE PESO, ` +
            `(PHP ${moneyFigures(t.advanceDepositAmount)}) and shall be applied as the first months’ payment and ` +
            "2 months security deposit.",
        },
        {
          sub: "3.3",
          text:
            `The Payment of ${moneyWords(t.rentAmountWords, t.rentAmount)} PHILIPPINE PESO, ` +
            `(PHP ${moneyFigures(t.rentAmount)}) is payable monthly in advance without deduction whatsoever on or ` +
            `before the ${t.rentDueDay ? ordinalNumber(t.rentDueDay) : "_____"} day of each month via Bank ` +
            "Transfer/Postdated Check to below bank details and as per payment schedule.",
        },
        {
          sub: "3.4",
          text:
            "In the event the rent remaining unpaid fourteen (14) days after becoming payable (whether formally " +
            "demanded or not), it shall be lawful for the Landlord to claim interest at four percent (4%) per month " +
            "on the amount unpaid calculated from after the date due to the date of actual payment.",
        },
      ],
    },
  ];
}

/** Clause 3.5 and clauses 4-30, printed after the bank/schedule tables. */
export function buildTenancyClausesAfterTables(t: TenancyTermsInput): TenancyClause[] {
  const occupantLines = [...(t.occupants ?? [])];
  while (occupantLines.length < 4) occupantLines.push("");

  return [
    {
      no: 3,
      title: "",
      paras: [
        {
          sub: "3.5",
          text:
            "The Tenant hereby agrees with the Landlord to pay the said monthly rent at the times and in the manner " +
            "aforesaid without the necessity of prior notice or demand.",
        },
      ],
    },
    {
      no: 4,
      title: "SECURITY DEPOSIT",
      paras: [
        {
          text:
            `The Tenant agrees to pay a security deposit amounting to ${moneyWords(t.depositAmountWords, t.depositAmount)} ` +
            `PHILIPPINE PESO (Php ${moneyFigures(t.depositAmount)}) being equal to two (2) months’ rent of the ` +
            `premises and furniture on ${recitalDate(t.leaseStartDate)}, (the receipt whereof the Landlord hereby ` +
            "acknowledges) as security for the due performance and observance by the Tenant of all covenants, " +
            "conditions and stipulations on the part of the Tenant herein contained, failing which the Tenant shall " +
            "forfeit to the Landlord the said deposit or such part thereof as may be necessary to remedy any such " +
            "default. PROVIDED ALWAYS that if the Tenant shall duly perform the said covenants, conditions and " +
            "stipulations as aforesaid, up to and including the date of expiration of the term hereby created, the " +
            "Landlord shall repay the said deposit within sixty (60) days from the date of such expiration without " +
            "any interest. This Deposit shall not be utilized as set-off for any rent due and payable during the " +
            "currency of this Agreement.",
        },
      ],
    },
    {
      no: 5,
      title: "OCCUPANTS",
      paras: [
        {
          text:
            "Only the following persons are permitted to occupy the said premises, and provided that such occupancy " +
            "is for the purpose stated in this Tenancy Agreement:-",
          numbered: occupantLines.map((name, i) => ({ marker: `${i + 1})`, text: name || BLANK })),
        },
      ],
    },
    {
      no: 6,
      title: "UTILITY/CABLE TV/ INTERNET CHARGES",
      paras: [
        {
          text:
            "The Tenant agrees to pay all charges for the supply of water, electricity, and any water borne sewerage " +
            "system, any such installations installed or used at the said premises, including any tax payable " +
            "thereon. Further, to pay all charges for Internet and Cable facilities if any has been subscribed and " +
            "installed in the premises.",
        },
      ],
    },
    {
      no: 7,
      title: "MAINTENANCE OF FIXTURES & FITTINGS",
      paras: [
        {
          text:
            "The Tenant agrees to keep the interior of the said premises including the sanitary and water apparatus " +
            "and the furniture and the doors and windows thereof in good and tenantable repair and condition " +
            "throughout this tenancy (fair wear and tear and damage by any act beyond the control of the Tenant are " +
            "excepted). To maintain the structural condition of the said premises including sanitary pipes and " +
            "electrical wiring and to keep the roof of the said premises in good and tenantable repair and condition.",
        },
      ],
    },
    {
      no: 8,
      title: "MAINTENANCE OF THE AIR-CON",
      paras: [
        {
          text:
            "The Tenant agrees to take up a service contract with a qualified air-conditioning contractor to service " +
            "and maintain the air-conditioning units, including the topping-up of gas and chemical cleaning (if " +
            "required), installed at the said premises, at least every six (6) months at the expense of the Tenant " +
            "and to keep them in good and tenantable repair and condition, throughout the term of this agreement. A " +
            "copy of the service contract shall be forwarded to the Landlord.",
        },
      ],
    },
    {
      no: 9,
      title: "YIELD UP PREMISES",
      paras: [
        {
          text:
            "The Tenant agrees to yield up the said premises at the expiration or sooner termination of this tenancy " +
            "in such good and tenantable repair and condition (fair wear and tear excepted), including the aircon " +
            "cleaning and grease trap, dry cleaning of curtains and linens, pillows and mattresses provided (if any) " +
            "as shall be in accordance with the conditions, covenants and stipulations herein contained and with all " +
            "locks keys and the furniture.",
        },
      ],
    },
    {
      no: 10,
      title: "NO UNAUTHORIZED ALTERATIONS",
      paras: [
        {
          text:
            "The Tenant agrees not to make or permit any structural alterations to the said premises without the " +
            "consent or approval of the Landlord. Upon expiration, or pre-termination of the lease for whatever " +
            "cause, renovation or improvements introduced by the tenant shall be the exclusive property/ies of the " +
            "landlord. However, the Landlord has the exclusive right to demand and require the Tenant, at its own " +
            "expense, to remove any alterations, improvements and renovations introduced by the Tenant, if the " +
            "Landlord desires.",
        },
      ],
    },
    {
      no: 11,
      title: "MINOR REPAIRS & LIABILITIES FOR DAMAGES",
      paras: [
        {
          text:
            "The Tenant agrees to replace electric light bulbs, bidet and tubes and to be responsible for all minor " +
            "repairs and replacement of parts and other expendable items at its own expense. The Tenant hereby " +
            "agrees that any or all damages, except for the ordinary wear and tear, caused by the tenant, its " +
            "agents, visitors or any third person shall be the exclusive responsibility and liability of the Tenant " +
            "and must be immediately repaired without the need of demand of the Landlord.",
        },
      ],
    },
    {
      no: 12,
      title: "ACCESS TO PREMISES",
      paras: [
        {
          text:
            "The Tenant agrees to permit the Landlord and its agents or property managers, surveyors and workmen " +
            "with all necessary appliances to enter upon the said premises at all reasonable times by prior " +
            "appointment (except in the case of emergency where no appointment is required) for the purpose whether " +
            "of viewing the condition thereof or of doing such works and things as may be required for any repairs, " +
            "alterations or improvements whether of the said premises or of any parts of any building to which the " +
            "said premises may form a part of or adjoin.",
        },
      ],
    },
    {
      no: 13,
      title: "VIEWING OF PREMISES",
      paras: [
        {
          text:
            "During the two (2) months immediately preceding the expiration of the tenancy herein, the Tenant agrees " +
            "to permit the Landlord or its representatives at all reasonable times and by prior appointment to bring " +
            "interested parties to view the said premises for the purpose of letting the same.",
        },
      ],
    },
    {
      no: 14,
      title: "COMPLY WITH MANAGEMENT CORPORATION",
      paras: [
        {
          text:
            "The Tenant agrees to comply with all such rules and regulations and terms and conditions as may be " +
            "imposed from time to time on occupiers of the building by the Management Corporation or other bodies " +
            "(where applicable) for the proper management of the same.",
        },
      ],
    },
    {
      no: 15,
      title: "USE OF PREMISES",
      paras: [
        {
          text:
            "The Tenant agrees to use the said premises strictly as a private residence only and not to do or permit " +
            "to be done upon the said premises any act or thing which may be or may become a nuisance or annoyance " +
            "to or in any way interfere with the quiet or comfort of any other adjoining occupiers or to give " +
            "reasonable cause for complaint from the occupants of neighbouring premises and not to use the said " +
            "premises for any unlawful or immoral purposes.",
        },
      ],
    },
    {
      no: 16,
      title: "NO SUBLETTING",
      paras: [
        {
          text:
            "The Tenant agrees not to assign sublet or part with the possession of the said premises or any part " +
            "thereof without the written consent of the Landlord which consent shall not be unreasonably withheld in " +
            "the case of a respectable and responsible tenant. This prohibition shall not apply to the occupation of " +
            "the said premises or any part thereof by any person or persons employed or engaged by the Tenant or " +
            "members of the Tenant’s family where applicable.",
        },
      ],
    },
    {
      no: 17,
      title: "NO UNAUTHORISED STORAGE",
      paras: [
        {
          text:
            "The Tenant agrees not to keep or permit to be kept on the said premises or any part thereof any " +
            "materials of a dangerous or explosive nature or the keeping of which may contravene any statute or " +
            "subsidiary legislation like any illegal substances etc.",
        },
      ],
    },
    {
      no: 18,
      title: "VOID OF INSURANCE",
      paras: [
        {
          text:
            "The Tenant agrees not to do or permit to be done anything whereby the policy or policies of insurance " +
            "on the said premises against damage by fire may become void or voidable or whereby the premium thereon " +
            "may be increased.",
        },
      ],
    },
    {
      no: 19,
      title: "INSURANCE",
      paras: [
        {
          text:
            "The Landlord agrees to insure the said premises against loss or damage by fire and to pay all premium " +
            "thereon. For avoidance of doubt such insurance coverage shall be for the loss and/or damage of the " +
            "Landlord’s property and shall not cover any loss and/or damage of the Tenant’s property.",
        },
      ],
    },
    {
      no: 20,
      title: "INDEMNIFY LANDLORD",
      paras: [
        {
          text:
            "The Tenant shall at all times ensure that all occupants of the said premises comply with all applicable " +
            "laws in Philippines, and without prejudice to the generality of this sub-clause:",
        },
        {
          sub: "20.1",
          text:
            "To indemnify and keep the Landlord indemnified (against any fines, summons, convictions etc.) to the " +
            "fullest extent as allowed by the laws of the Republic of Philippines, for any violation or " +
            "non-conformance by the Tenant and/or permitted occupants, of the Philippine Laws.",
        },
      ],
    },
    {
      no: 21,
      title: "REPAIR OF AIR-CON",
      paras: [
        {
          text:
            "The Tenant agrees to be responsible for the repair and replacement of parts in respect of the " +
            "air-conditioning units installed at the said premises, where the same are caused by any act, default, " +
            "neglect or omission on the part of the Tenant or any of its occupier’s contractors, guests or visitors.",
        },
      ],
    },
    {
      no: 22,
      title: "QUIET ENJOYMENT",
      paras: [
        {
          text:
            "That the Tenant paying the rent hereby reserved and observing and performing the several conditions, " +
            "covenants and stipulations on the Tenant's part herein contained shall peaceably hold and enjoy the " +
            "said premises during this tenancy without any interruption by the Landlord or any person rightfully " +
            "claiming under or in trust for the Landlord.",
        },
        { text: "Provided always and it is expressly agreed as follows:" },
        {
          sub: "22.1",
          subTitle: "RIGHT OF RE-ENTRY",
          text:
            "If the rent hereby reserved shall not be paid for fourteen (14) days after its due date or if there " +
            "shall be a breach of any of the conditions, covenants or stipulations on the part of the Tenant herein " +
            "contained, the Landlord shall be entitled to re-enter upon the said premises and thereupon this tenancy " +
            "shall immediately absolutely determine but without prejudice to any right of action of the Landlord for " +
            "damage or otherwise in respect of any such breach or any antecedent breach.",
        },
      ],
    },
    {
      no: 23,
      title: "EXCLUSION OF LIABILITY",
      paras: [
        {
          text:
            "The Landlord shall not be liable to the Tenant or the Tenant’s servants or agents or other persons in " +
            "the said premises or persons calling upon the Tenant for any accidents happening, injury suffered, " +
            "damage to or loss of any chattel property sustained on the said premises.",
        },
      ],
    },
    {
      no: 24,
      title: "PREMISES DAMAGED OR DESTROYED",
      paras: [
        {
          text:
            "In case the said premises or any part thereof shall at any time during this tenancy be destroyed or " +
            "damaged by fire lightning riot explosion or any other cause beyond the control of the parties hereto so " +
            "as to be unfit for occupation and use, then and in every such case (unless the insurance money shall be " +
            "wholly or partially irrecoverable by reason solely or in part of any act, default, neglect or omission " +
            "of the Tenant or any of their servants agents occupiers guests or visitors), the rent hereby reserved " +
            "or a just and fair proportion thereof according to the nature and extent of the destruction or damage " +
            "sustained shall be suspended and cease to be payable in respect of any period while the said premises " +
            "shall continue to be unfit for occupation and use by reason of such destruction or damage.",
        },
      ],
    },
    {
      no: 25,
      title: "RIGHT TO TERMINATE",
      paras: [
        {
          text:
            "In case the said premises shall be destroyed or damaged as aforesaid, either party shall be at liberty " +
            "by notice in writing to the other to determine this tenancy, and upon such notice being given, this " +
            "tenancy or the balance thereof shall absolutely cease and determine and the deposit paid hereunder " +
            "together with a reasonable proportion of such advance rent as has been paid hereunder, where " +
            "applicable, shall be refunded to the Tenant forthwith but without prejudice to any right of action of " +
            "either party in respect of any antecedent breach of this Agreement by the other.",
        },
      ],
    },
    {
      no: 26,
      title: "EARLY TERMINATION",
      paras: [
        {
          text:
            "If the Tenant shall desire to terminate the tenancy hereby created, a written notice must be sent to " +
            "the Landlord 1 month prior to the intended move out. The security deposit will be forfeited in favour " +
            "of the Landlord without any further notice, demand and formalities.",
        },
      ],
    },
    {
      no: 27,
      title: "OPTION TO RENEW",
      paras: [
        {
          text:
            "The Landlord shall on the written request of the Tenant made not less than two (2) months before the " +
            "date of expiry of this tenancy, and if there shall not at the time of such request be any existing " +
            "breach or any non-observance of any of the conditions, covenants or stipulations on the part of the " +
            "Tenant herein contained, at the expense of the Tenant, grant to the Tenant a tenancy of the said " +
            "premises for a further term of 12 months from the date of expiry of this tenancy at a rent to be " +
            "mutually agreed between the parties but otherwise containing the like conditions, covenants and " +
            "stipulations as are herein contained with the exception of this option for renewal. The calculation of " +
            "the security deposit for the new term shall be based on the revised rent.",
        },
      ],
    },
    {
      no: 28,
      title: "GOVERNING LAW",
      paras: [
        { text: "This Agreement shall be subject to the laws of the Republic of the Philippines." },
      ],
    },
    {
      no: 29,
      title: "JUDICIAL RELIEF",
      paras: [
        {
          text:
            "In case of the Landlord be compelled to seek judicial relief against the Tenant, the Landlord shall " +
            "have the right to demand and be entitled to collect from the Tenant the damages, attorney’s fee and " +
            "other legal fees for litigation.",
        },
      ],
    },
    {
      no: 30,
      title: "MARGINAL NOTES",
      paras: [
        {
          text:
            "The marginal notes appearing in this Agreement are inserted only as a matter of convenience and in no " +
            "way define, limit, construe or describe the scope or intent of the sections or clauses of this " +
            "Agreement nor in any way affect this Agreement",
        },
      ],
    },
  ];
}

/** Interpretation block printed after clause 30. */
export const TENANCY_INTERPRETATION: string[] = [
  "In this Agreement unless the context otherwise requires:-",
  "The expression \"the Landlord\":- (1) where the Landlord is a person shall include its personal representatives " +
    "and assigns; and (2) where the Landlord is a company shall include its successors-in-title and assigns;",
  "The expression \"the Tenant\":- (1) where the Tenant is a person shall include its personal representatives and " +
    "permitted assigns; and (2) where the Tenant is a company shall include its successors-in-title and permitted assigns;",
  "Where the Landlord consists of two (2) or more persons, all covenants and stipulations made by or applicable to " +
    "such persons are made or applicable jointly and severally;",
  "Where the Tenant consists of two (2) or more persons, all covenants and stipulations made by or applicable to " +
    "such persons are made or applicable jointly and severally;",
  "The expression \"person\" shall mean any individual, firm, company or other legal entity;",
  "Words importing the neuter gender shall include the masculine and feminine genders and vice versa; and",
  "Words in the singular shall include the plural and vice versa.",
  "Should any provision of this Agreement be declared void, unenforceable or illegal by any competent authority or " +
    "court, this shall not affect the other provisions of this Agreement which are capable of severance, which " +
    "shall continue unaffected.",
];
