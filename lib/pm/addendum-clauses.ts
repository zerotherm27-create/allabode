// Single source of truth for the Addendum's contract text. Isomorphic (no
// server-only imports) so both the PDF template (lib/pdf/addendum.tsx) and the
// public signing pages' full-text review share it and can never drift.
//
// Reuses the clause/paragraph shapes, date helpers and peso-words helpers from
// the tenancy agreement's clause lib — same rendering model, different
// instrument.
//
// Unlike the other four flows, an Addendum is an *amending* instrument: it
// identifies a parent contract, states only what changes, and ratifies
// everything else. Sections 3-6 are conditional — each is emitted only when
// staff filled that kind of amendment, and the sections that follow renumber
// accordingly (see buildAddendumClauses), so an addendum that only extends a
// term prints as a clean 6-section document with no empty headings.

import { pesoAmountFigures, pesoAmountInWords } from "@/lib/pm/amount-words";
import {
  BLANK, recitalDateParts,
  type TenancyClause, type TenancyBankDetails,
} from "@/lib/pm/tenancy-clauses";

export type AddendumClause = TenancyClause;
export type AddendumBankDetails = TenancyBankDetails;

/** Which of the four sibling flows this addendum amends. */
export type AddendumParentType = "pm" | "tenancy" | "parking" | "short_term_rental";

/**
 * Whether the amended contract was executed in this system or signed elsewhere
 * and uploaded. An uploaded parent has no `parent_id` to point at — its
 * identity lives entirely in the snapshot below.
 */
export type AddendumParentSource = "system" | "uploaded";

/**
 * The parent contract's identity, copied at creation time rather than joined
 * live. An executed addendum must keep printing the parent as it stood when
 * signed — if it read through to the parent row, editing that contract would
 * retroactively alter an already-signed legal document.
 */
export type AddendumParentSnapshot = {
  contractTitle?: string;
  referenceCode?: string;
  agreementDate?: string;
  propertyDescription?: string;
  /**
   * Where the parent came from. `"uploaded"` means it was signed outside this
   * system and staff attached the executed copy — the recital then says so, so
   * a reader can tell why no in-system reference number is being cited.
   */
  source?: AddendumParentSource;
};

export type AddendumLandlordDetails = { name?: string; address?: string };
export type AddendumTenantDetails = { name?: string; address?: string; contact?: string; email?: string };

export type AddendumFeeItem = { label: string; amount: number };
export type AddendumScheduleRow = { dueDate: string; amount: string; bankBranch: string; coverage: string };

/** One line of Section 5 — a change to the parties or registered occupants. */
export type AddendumPartyChange = {
  action: "add" | "remove" | "substitute";
  role: string;
  name: string;
  outgoingName?: string;
  notes?: string;
};

/** One free-form amended provision of the parent contract (Section 6). */
export type AddendumAmendedClause = {
  ref: string;
  heading?: string;
  mode: "replace" | "add";
  newText: string;
};

export const DEFAULT_ADDENDUM_BANK_DETAILS: AddendumBankDetails = {
  name: "All Abode Brokerage and Valuation OPC",
  bank: "Union Bank of the Philippines",
  branch: "JTKC Building, Pasong Tamo Branch",
  accountNumber: "0020 2003 7938",
};

export const PARENT_TYPE_TITLE: Record<AddendumParentType, string> = {
  pm: "Property Management Agreement",
  tenancy: "Tenancy Agreement",
  parking: "Parking Space Rental Agreement",
  short_term_rental: "Short Term Rental Agreement",
};

/**
 * Party role labels, which depend on what is being amended. A Property
 * Management Agreement runs between the Owner and All Abode as Manager — it
 * would be plainly wrong to print "TENANT" over an owner's signature. The
 * three tenant-side contracts use Landlord/Tenant.
 *
 * `counterparty` is whoever signs on the first (tenant) token; `principal` is
 * whoever signs second, whether remotely or by staff countersignature. The
 * database columns keep their `tenant_` and `landlord_` prefixes across all
 * parent types — only the printed and on-screen labels vary.
 */
export type AddendumRoles = { counterparty: string; principal: string };

export function addendumRoles(parentType: AddendumParentType): AddendumRoles {
  return parentType === "pm"
    ? { counterparty: "Owner", principal: "Manager" }
    : { counterparty: "Tenant", principal: "Landlord" };
}

export const ADDENDUM_DISCLAIMER =
  "DISCLAIMER: This Addendum has been prepared by All Abode Brokerage and Valuation OPC for submission to the " +
  "Landlord and to the Tenant for review and approval. No representation or recommendation is made by the " +
  "Company, as to the legal sufficiency, legal effect, or tax consequences of this addendum. Both parties may " +
  "seek legal advice when in doubt. All Abode Brokerage and Valuation OPC, its owners, representatives and " +
  "employees, shall not be held responsible for any disputes arising from non-compliance of either parties to " +
  "this agreement.";

export type AddendumTermsInput = {
  parentType: AddendumParentType;
  parentSnapshot: AddendumParentSnapshot;
  effectiveDate: string | null;
  newStartDate: string | null;
  newEndDate: string | null;
  feeItems: AddendumFeeItem[];
  partyChanges: AddendumPartyChange[];
  amendedClauses: AddendumAmendedClause[];
};

/** ISO date → "August 1, 2026" (or a blank line when unset). */
function longDate(iso: string | null | undefined): string {
  const m = (iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return BLANK;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export const addendumLongDate = longDate;

export function addendumMoneyFigures(amount: number | null | undefined): string {
  return amount != null ? pesoAmountFigures(amount) : BLANK;
}

/** The document's own title, e.g. "ADDENDUM TO TENANCY AGREEMENT". */
export function addendumTitle(t: Pick<AddendumTermsInput, "parentType">): string {
  return `ADDENDUM TO ${(PARENT_TYPE_TITLE[t.parentType] ?? "AGREEMENT").toUpperCase()}`;
}

// ── Which optional sections are in play ─────────────────────────────────────
//
// Presence is derived from the data itself rather than from separate boolean
// flags — a flag that can disagree with its own data is a bug waiting to
// happen.

export function amendsTerm(t: AddendumTermsInput): boolean {
  return !!(t.newStartDate || t.newEndDate);
}
export function amendsFees(t: AddendumTermsInput): boolean {
  return (t.feeItems ?? []).length > 0;
}
export function amendsParties(t: AddendumTermsInput): boolean {
  return (t.partyChanges ?? []).length > 0;
}
export function amendsClauses(t: AddendumTermsInput): boolean {
  return (t.amendedClauses ?? []).length > 0;
}

/**
 * Section numbers for this particular addendum. Conditional sections that are
 * not in play are skipped entirely and everything after them shifts up, so the
 * printed document never shows a gap or an empty heading. Both the PDF and the
 * on-screen preview read these numbers so their cross-references agree.
 */
export type AddendumSectionNumbers = {
  original: number;
  effectivity: number;
  term: number | null;
  fees: number | null;
  parties: number | null;
  provisions: number | null;
  ratification: number;
  conflict: number;
  entire: number;
  governingLaw: number;
};

export function addendumSectionNumbers(t: AddendumTermsInput): AddendumSectionNumbers {
  let n = 2; // 1 = The Original Agreement, 2 = Effectivity
  const next = () => (n += 1);
  const term = amendsTerm(t) ? next() : null;
  const fees = amendsFees(t) ? next() : null;
  const parties = amendsParties(t) ? next() : null;
  const provisions = amendsClauses(t) ? next() : null;
  return {
    original: 1,
    effectivity: 2,
    term, fees, parties, provisions,
    ratification: next(),
    conflict: next(),
    entire: next(),
    governingLaw: next(),
  };
}

/**
 * The opening recital — the formal "KNOW ALL MEN BY THESE PRESENTS" register
 * used by the Tenancy and Parking agreements (not STR's plain-language
 * opener), because an addendum is an amending instrument. Returned as parts so
 * the PDF can bold the party names and the WHEREAS markers.
 */
export type AddendumRecital = {
  opener: string;
  intro: string;
  landlordName: string;
  landlordLine: string;
  tenantName: string;
  tenantLine: string;
  partiesNote: string;
  whereas: string[];
  nowTherefore: string;
};

export function buildAddendumRecital(
  t: AddendumTermsInput,
  landlord: AddendumLandlordDetails,
  tenant: AddendumTenantDetails,
  addendumDate: string | null,
): AddendumRecital {
  const d = recitalDateParts(addendumDate);
  const snap = t.parentSnapshot ?? {};
  const parentTitle = snap.contractTitle?.trim() || PARENT_TYPE_TITLE[t.parentType] || "Agreement";
  const roles = addendumRoles(t.parentType);

  return {
    opener: "KNOW ALL MEN BY THESE PRESENTS:",
    intro:
      `This Addendum (the "Addendum") is made and entered into this ${d ? d.day : "____"} day of ` +
      `${d ? d.month : "____________"} ${d ? d.year : "20__"}, by and between:`,
    landlordName: landlord.name?.trim() || BLANK,
    landlordLine:
      `, of legal age, with address at ${landlord.address?.trim() || BLANK}, hereinafter referred to as the ` +
      `"${roles.principal.toUpperCase()}";`,
    tenantName: tenant.name?.trim() || BLANK,
    tenantLine:
      `, of legal age, with address at ${tenant.address?.trim() || BLANK}, hereinafter referred to as the ` +
      `"${roles.counterparty.toUpperCase()}";`,
    partiesNote: '(each a "Party" and collectively the "Parties")',
    whereas: [
      `the Parties executed a ${parentTitle} dated ${snap.agreementDate ? longDate(snap.agreementDate) : BLANK}, ` +
        `bearing reference number ${snap.referenceCode?.trim() || BLANK}, covering ` +
        `${snap.propertyDescription?.trim() || BLANK} (the "Original Agreement")` +
        (snap.source === "uploaded"
          ? ", a copy of which is on file with the Company and has been furnished to both Parties;"
          : ";"),
      "the Original Agreement remains in full force and effect as of the date of this Addendum, and the Parties " +
        "now desire to amend certain of its provisions as set forth below;",
    ],
    nowTherefore:
      "for and in consideration of the foregoing premises and the mutual covenants herein, the Parties agree as " +
      "follows:",
  };
}

/**
 * Clauses 1 through the last, in print order. The fee table, bank table and
 * payment schedule are rendered by the consumer immediately after paragraph
 * `{fees}.1` (a ClauseParagraph cannot express a table); both the PDF and the
 * preview split the fees clause at that point and render the tables between.
 */
export function buildAddendumClauses(t: AddendumTermsInput): AddendumClause[] {
  const s = addendumSectionNumbers(t);
  const snap = t.parentSnapshot ?? {};
  const parentTitle = snap.contractTitle?.trim() || PARENT_TYPE_TITLE[t.parentType] || "Agreement";
  const roles = addendumRoles(t.parentType);
  const clauses: AddendumClause[] = [];

  clauses.push({
    no: s.original,
    title: "THE ORIGINAL AGREEMENT",
    paras: [
      {
        sub: `${s.original}.1`,
        fields: [
          ["ORIGINAL AGREEMENT", parentTitle],
          ["DATE EXECUTED", snap.agreementDate ? longDate(snap.agreementDate) : BLANK],
          ["REFERENCE NUMBER", snap.referenceCode?.trim() || BLANK],
          ["PROPERTY", snap.propertyDescription?.trim() || BLANK],
        ],
      },
      {
        sub: `${s.original}.2`,
        text:
          "Capitalized terms used but not defined in this Addendum have the meanings given to them in the " +
          "Original Agreement. References in the Original Agreement to “this Agreement” shall be read to " +
          "mean the Original Agreement as amended by this Addendum.",
      },
    ],
  });

  clauses.push({
    no: s.effectivity,
    title: "EFFECTIVITY",
    paras: [
      {
        sub: `${s.effectivity}.1`,
        fields: [["EFFECTIVE DATE OF THIS ADDENDUM", longDate(t.effectiveDate)]],
      },
      {
        sub: `${s.effectivity}.2`,
        text:
          "This Addendum takes effect on the Effective Date stated above and continues for the remaining term of " +
          "the Original Agreement" +
          (s.term ? `, unless the Term is amended under Section ${s.term} below.` : "."),
      },
    ],
  });

  if (s.term) {
    clauses.push({
      no: s.term,
      title: "AMENDMENT OF TERM",
      paras: [
        {
          sub: `${s.term}.1`,
          fields: [
            ["AMENDED COMMENCEMENT DATE", longDate(t.newStartDate)],
            ["AMENDED EXPIRATION DATE", longDate(t.newEndDate)],
          ],
        },
        {
          sub: `${s.term}.2`,
          text:
            "The Term of the Original Agreement is hereby extended and amended to run from the Amended " +
            "Commencement Date to the Amended Expiration Date. All provisions of the Original Agreement " +
            "governing the Term, including those on renewal, holdover, and notice of non-renewal, shall apply to " +
            "the amended Term as though the amended dates had been set out in the Original Agreement.",
        },
      ],
    });
  }

  if (s.fees) {
    const total = (t.feeItems ?? []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    clauses.push({
      no: s.fees,
      title: "AMENDMENT OF RENT AND FEES",
      paras: [
        {
          sub: `${s.fees}.1`,
          text:
            "Effective on the Effective Date, the rent and fees payable under the Original Agreement are amended " +
            "to the amounts set out in the table below. These amounts supersede the corresponding amounts in the " +
            "Original Agreement in their entirety.",
        },
        {
          sub: `${s.fees}.2`,
          text:
            `The total amended amount payable is ${pesoAmountInWords(total) || BLANK} PHILIPPINE PESO ` +
            `(PHP ${pesoAmountFigures(total)}).`,
        },
        {
          sub: `${s.fees}.3`,
          text:
            "All other charges, deposits, and payment obligations under the Original Agreement that are not " +
            "expressly amended above remain payable in accordance with the Original Agreement. Any security " +
            `deposit held under the Original Agreement is carried over and continues to secure the ${roles.counterparty}'s ` +
            "obligations as amended, unless expressly stated otherwise in this Addendum.",
        },
        {
          sub: `${s.fees}.4`,
          text:
            "All amounts stated are exclusive of any government taxes that may apply, which shall be for the " +
            `${roles.counterparty}'s account if legally imposed on the ${roles.counterparty}.`,
        },
      ],
    });
  }

  if (s.parties) {
    clauses.push({
      no: s.parties,
      title: "CHANGE OF PARTIES AND OCCUPANTS",
      paras: [
        {
          sub: `${s.parties}.1`,
          text: "The following changes to the parties and registered occupants of the Property are hereby made:",
          numbered: (t.partyChanges ?? []).map((c, i) => ({
            marker: `${i + 1})`,
            text: partyChangeSentence(c),
          })),
        },
        {
          sub: `${s.parties}.2`,
          text:
            "A copy of a valid government-issued identification document for each person added or substituted " +
            "above is attached to this Addendum. Each such person, by signing or by being presented for " +
            "registration, consents to the processing of their personal data for the purposes of the Original " +
            "Agreement as amended, consistent with Republic Act No. 10173 (Data Privacy Act of 2012).",
        },
        {
          sub: `${s.parties}.3`,
          text:
            "Occupancy of the Property remains subject to the occupancy limits and house rules of the Original " +
            "Agreement and of the condominium or subdivision in which the Property is located.",
        },
      ],
    });
  }

  if (s.provisions) {
    clauses.push({
      no: s.provisions,
      title: "AMENDED PROVISIONS",
      paras: [
        {
          sub: `${s.provisions}.1`,
          text:
            "The following provisions of the Original Agreement are amended as set out below. Each amendment " +
            "takes effect on the Effective Date.",
        },
        ...(t.amendedClauses ?? []).map((c, i) => ({
          sub: `${s.provisions}.${i + 2}`,
          subTitle: c.heading?.trim()
            ? `Section ${c.ref.trim() || BLANK} (${c.heading.trim()}).`
            : `Section ${c.ref.trim() || BLANK}.`,
          text: amendedClauseSentence(c),
        })),
      ],
    });
  }

  clauses.push({
    no: s.ratification,
    title: "RATIFICATION OF THE ORIGINAL AGREEMENT",
    paras: [
      {
        sub: `${s.ratification}.1`,
        text:
          "Except as expressly amended by this Addendum, all terms, covenants, and conditions of the Original " +
          "Agreement remain unchanged and in full force and effect, and are hereby ratified and confirmed by the " +
          "Parties.",
      },
      {
        sub: `${s.ratification}.2`,
        text:
          "This Addendum does not constitute a novation of the Original Agreement. No waiver of any right under " +
          "the Original Agreement is implied by the execution of this Addendum.",
      },
    ],
  });

  clauses.push({
    no: s.conflict,
    title: "CONFLICT",
    paras: [
      {
        sub: `${s.conflict}.1`,
        text:
          "In the event of any conflict or inconsistency between the provisions of this Addendum and the " +
          "provisions of the Original Agreement, the provisions of this Addendum shall prevail, but only to the " +
          "extent of the conflict and only as to the matters expressly amended herein.",
      },
    ],
  });

  clauses.push({
    no: s.entire,
    title: "ENTIRE AGREEMENT AND COUNTERPARTS",
    paras: [
      {
        sub: `${s.entire}.1`,
        text:
          "The Original Agreement, together with its annexes, and this Addendum constitute the entire agreement " +
          "of the Parties with respect to the Property and supersede all prior negotiations and understandings " +
          "on the matters amended herein.",
      },
      {
        sub: `${s.entire}.2`,
        text:
          "This Addendum may be executed electronically and in counterparts, each of which shall be deemed an " +
          "original and all of which together shall constitute one and the same instrument. The Parties " +
          "acknowledge the validity of electronic signatures under Republic Act No. 8792 (Electronic Commerce " +
          "Act of 2000).",
      },
    ],
  });

  clauses.push({
    no: s.governingLaw,
    title: "GOVERNING LAW",
    paras: [
      {
        sub: `${s.governingLaw}.1`,
        text:
          "This Addendum shall be governed by and construed in accordance with the laws of the Republic of the " +
          "Philippines. Any dispute arising out of or in connection with this Addendum shall be submitted to the " +
          "proper courts of the city or municipality where the Property is located, to the exclusion of all " +
          "other venues.",
      },
    ],
  });

  return clauses;
}

function partyChangeSentence(c: AddendumPartyChange): string {
  const role = c.role?.trim() || "occupant";
  const name = c.name?.trim() || BLANK;
  const notes = c.notes?.trim() ? ` ${c.notes.trim()}` : "";

  if (c.action === "remove") {
    return (
      `${name} is hereby removed as a registered ${role} of the Property, effective on the Effective Date, and ` +
      `is released from obligations accruing after that date, without prejudice to any liability accrued before ` +
      `it.${notes}`
    );
  }
  if (c.action === "substitute") {
    return (
      `${c.outgoingName?.trim() || BLANK} is hereby substituted by ${name} as a registered ${role} of the ` +
      `Property, effective on the Effective Date.${notes}`
    );
  }
  return (
    `${name} is hereby added as a registered ${role} of the Property, effective on the Effective Date, and by ` +
    `signing this Addendum assumes all obligations of a ${role} under the Original Agreement as amended.${notes}`
  );
}

function amendedClauseSentence(c: AddendumAmendedClause): string {
  const ref = c.ref?.trim() || BLANK;
  const body = c.newText?.trim() || BLANK;
  if (c.mode === "add") {
    return `Section ${ref} of the Original Agreement is hereby amended by adding the following: “${body}”`;
  }
  return (
    `Section ${ref} of the Original Agreement is hereby deleted in its entirety and replaced with the ` +
    `following: “${body}”`
  );
}

/** Bank-details lead-in printed between the fee table and the bank table. */
export function addendumBankIntro(bank: AddendumBankDetails): string {
  return `Bank Details for Payment — Bank: ${bank.bank}, Account Name: ${bank.name}, Account Number: ${bank.accountNumber}.`;
}
