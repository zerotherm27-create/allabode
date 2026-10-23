// Authority to Sell contract text, written once and shared by the on-screen
// preview and the PDF so they can't drift. Kept dependency-free on purpose:
// the signing wizard is a client component, and tests compile it standalone.

/** Commission rate suggested to the owner (percent of the Gross Selling Price). */
export const DEFAULT_COMMISSION_PCT = 5;

/** Fixed broker party — never entered or edited by the owner. */
export const BROKER = {
  name: "Aremchel Cruzado",
  signatoryName: "Aremchel M. Cruzado",
  prcLicenseNo: "0035712",
  ptrNo: "2948777",
  dhsudRegNo: "NCR-B-10104",
  address: "B4 L9 Frontera cor. Ventura Sts. Cerritos Heights Ph 2, Molino 4, Bacoor, Cavite",
  contactNo: "0993 523 4099",
} as const;

export const ATS_DISCLAIMER =
  "DISCLAIMER: This Authority to Sell has been prepared by All Abode Brokerage and Valuation OPC for " +
  "submission to the Owner for review and approval. No representation or recommendation is made by the Broker " +
  "as to the legal sufficiency, legal effect, or tax consequences of this authority. The Owner may " +
  "seek legal advice when in doubt. All Abode Brokerage and Valuation OPC, its owners, representatives and " +
  "employees, shall not be held responsible for any disputes arising from non-compliance to this agreement.";

export type AtsOwnerDetails = {
  name?: string; nationality?: string; civilStatus?: string; address?: string; email?: string; contact?: string;
};
export type AtsPropertyDetails = {
  propertyType?: string; location?: string; titleNo?: string; area?: string; improvements?: string;
};
export type AtsPaymentTerm = "cash" | "bank_financing" | "installment" | "others";
export type AtsSaleTerms = {
  authorityType?: "exclusive" | "non_exclusive" | "";
  grossPrice?: string;
  minPrice?: string;
  paymentTerms?: AtsPaymentTerm[];
  paymentOther?: string;
  commissionPct?: string;
  periodLength?: string;
  periodUnit?: "days" | "months";
  periodStart?: string;
  periodEnd?: string;
  protectionDays?: string;
  terminationNoticeDays?: string;
  executionPlace?: string;
};

export type AtsBlock =
  | { type: "p"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "checks"; items: { label: string; checked: boolean; body?: string }[] };

export type AtsSection = { heading: string; blocks: AtsBlock[] };

const BLANK = "__________";

function or(v: string | undefined | null, blank = BLANK) {
  const t = (v ?? "").trim();
  return t || blank;
}

/** "2026-10-24" -> "October 24, 2026" (date-only strings are not timezone-shifted). */
export function formatAtsDate(iso: string | null | undefined): string {
  if (!iso) return BLANK;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return BLANK;
  return d.toLocaleDateString("en-PH", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
}

/** "1500000" -> "1,500,000"; non-numeric input is kept as typed. */
export function formatAtsMoney(v: string | undefined | null): string {
  const t = (v ?? "").trim().replace(/,/g, "");
  if (!t) return BLANK;
  const n = Number(t);
  return Number.isFinite(n) ? n.toLocaleString("en-PH", { maximumFractionDigits: 2 }) : (v ?? "").trim();
}

export function atsIntro(executionDate: string | null | undefined, place: string | undefined): string {
  return `This Authority to Sell (“Agreement”) is made and entered into on ${formatAtsDate(executionDate)}, at ${or(place, "__________________")}, Philippines, by and between:`;
}

export function atsPaymentTermsLabel(terms: AtsSaleTerms): string {
  const map: Record<AtsPaymentTerm, string> = {
    cash: "Cash", bank_financing: "Bank Financing", installment: "Installment", others: "Others",
  };
  return (terms.paymentTerms ?? [])
    .map((t) => (t === "others" ? `Others: ${or(terms.paymentOther)}` : map[t]))
    .join(", ");
}

export function buildAtsSections(
  property: AtsPropertyDetails,
  terms: AtsSaleTerms,
): AtsSection[] {
  const pay = new Set(terms.paymentTerms ?? []);
  const exclusive = terms.authorityType === "exclusive";
  const nonExclusive = terms.authorityType === "non_exclusive";

  return [
    {
      heading: "1. PROPERTY DETAILS",
      blocks: [
        { type: "p", text: "The OWNER hereby authorizes the BROKER to offer for sale the following property:" },
        {
          type: "bullets",
          items: [
            `Property Type: ${or(property.propertyType)}`,
            `Location: ${or(property.location)}`,
            `Title No./Tax Declaration No.: ${or(property.titleNo)}`,
            `Lot Area/Floor Area: ${or(property.area)}`,
            `Improvements (if any): ${or(property.improvements, "None")}`,
          ],
        },
      ],
    },
    {
      heading: "2. AUTHORITY GRANTED",
      blocks: [
        {
          type: "p",
          text: "The OWNER grants the BROKER the authority to market, advertise, negotiate, and assist in the sale of the above-described property under the following terms.",
        },
      ],
    },
    {
      heading: "3. TYPE OF AUTHORITY",
      blocks: [
        { type: "p", text: "Please check one:" },
        {
          type: "checks",
          items: [
            {
              label: "Exclusive Authority to Sell",
              checked: exclusive,
              body: "The OWNER appoints the BROKER as the sole and exclusive agent. The OWNER shall not engage other brokers or personally sell the property without the BROKER’s written consent. Commission is due to the BROKER regardless of who procures the buyer during the term.",
            },
            {
              label: "Non-Exclusive Authority to Sell",
              checked: nonExclusive,
              body: "The OWNER may appoint other brokers and may personally sell the property. Commission shall be due only to the BROKER who successfully introduces the buyer and facilitates the transaction.",
            },
          ],
        },
      ],
    },
    {
      heading: "4. SELLING PRICE AND TERMS",
      blocks: [
        {
          type: "bullets",
          items: [
            `Gross Selling Price: PHP ${formatAtsMoney(terms.grossPrice)}`,
            `Minimum Acceptable Price (if applicable): PHP ${terms.minPrice?.trim() ? formatAtsMoney(terms.minPrice) : "N/A"}`,
            "Terms of Payment:",
          ],
        },
        {
          type: "checks",
          items: [
            { label: "Cash", checked: pay.has("cash") },
            { label: "Bank Financing", checked: pay.has("bank_financing") },
            { label: "Installment", checked: pay.has("installment") },
            { label: `Others: ${pay.has("others") ? or(terms.paymentOther) : "____________________"}`, checked: pay.has("others") },
          ],
        },
        {
          type: "p",
          text: "The OWNER agrees not to sell below the minimum acceptable price without written notice to the BROKER.",
        },
      ],
    },
    {
      heading: "5. BROKER’S COMMISSION",
      blocks: [
        { type: "p", text: "The OWNER agrees to pay the BROKER a commission equivalent to:" },
        { type: "p", text: `${or(terms.commissionPct, "_____")}% of the Gross Selling Price` },
        {
          type: "bullets",
          items: [
            "Commission shall be deemed earned upon the signing of the Deed of Absolute Sale or Contract to Sell and receipt of earnest money or payment from the buyer.",
            "Commission shall be payable in full upon closing unless otherwise agreed.",
          ],
        },
      ],
    },
    {
      heading: "6. AUTHORITY PERIOD",
      blocks: [
        { type: "p", text: "This Agreement shall be valid for a period of:" },
        {
          type: "p",
          text: `${or(terms.periodLength, "_____")} ${terms.periodUnit === "months" ? "months" : terms.periodUnit === "days" ? "days" : "days/months"}, commencing on ${formatAtsDate(terms.periodStart)} and ending on ${formatAtsDate(terms.periodEnd)}.`,
        },
        {
          type: "p",
          text: `A protection period of ${or(terms.protectionDays, "_____")} days shall apply after expiration. If the property is sold to a buyer introduced by the BROKER within this period, commission remains due.`,
        },
      ],
    },
    {
      heading: "7. OWNER’S RESPONSIBILITIES",
      blocks: [
        { type: "p", text: "The OWNER agrees to:" },
        {
          type: "bullets",
          items: [
            "Provide true and correct property documents (Title, Tax Declaration, etc.)",
            "Ensure the property is free from liens and encumbrances, unless disclosed",
            "Allow reasonable access for property viewing and marketing",
            "Inform the BROKER of any direct inquiries or offers received",
          ],
        },
      ],
    },
    {
      heading: "8. BROKER’S RESPONSIBILITIES",
      blocks: [
        { type: "p", text: "The BROKER agrees to:" },
        {
          type: "bullets",
          items: [
            "Act in good faith and represent the OWNER’s best interest",
            "Market the property using lawful and ethical means",
            "Screen and qualify prospective buyers",
            "Assist in negotiation and documentation",
          ],
        },
      ],
    },
    {
      heading: "9. TAXES AND EXPENSES",
      blocks: [
        { type: "p", text: "Unless otherwise agreed:" },
        {
          type: "bullets",
          items: [
            "Seller’s Account: Broker’s Commission, Capital Gains Tax (CGT), Documentary Stamp Tax (DST), unpaid real property taxes, and other seller-related expenses.",
            "Buyer’s Account: Transfer Tax, Registration Fees, and other buyer-related expenses",
          ],
        },
      ],
    },
    {
      heading: "10. TERMINATION",
      blocks: [
        { type: "p", text: "This Agreement may be terminated:" },
        {
          type: "bullets",
          items: [
            "Upon expiration of the authority period",
            "By mutual written agreement",
            `By either party with ${or(terms.terminationNoticeDays, "_____")} days written notice`,
          ],
        },
      ],
    },
    {
      heading: "11. GENERAL PROVISIONS",
      blocks: [
        {
          type: "bullets",
          items: [
            "This Agreement shall be governed by the laws of the Philippines",
            "Any disputes shall be settled amicably or through proper legal channels",
            "This document constitutes the entire agreement between the parties",
          ],
        },
        {
          type: "p",
          text: "IN WITNESS WHEREOF, the parties have signed this Agreement on the date and place first above written.",
        },
      ],
    },
  ];
}

/**
 * Signature images end up in `<Image src>` inside the PDF renderer, which fetches
 * any URL it is given — so only inline PNG/JPEG data URIs are ever accepted.
 */
export function isSafeSignatureDataUrl(v: unknown): v is string {
  return typeof v === "string" && v.length <= 1_500_000 && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v);
}

export function atsPropertyError(property: AtsPropertyDetails): string | null {
  if (!property.propertyType?.trim() || !property.location?.trim()) return "Please enter the property type and location.";
  if (!property.titleNo?.trim()) return "Please enter the Title No. or Tax Declaration No.";
  return null;
}

/** Why a draft can't proceed to signing yet; null when the sale terms are complete. */
export function atsTermsError(property: AtsPropertyDetails, terms: AtsSaleTerms, executionDate: string | null | undefined): string | null {
  const propertyErr = atsPropertyError(property);
  if (propertyErr) return propertyErr;
  if (!terms.authorityType) return "Please choose the type of authority.";
  if (!terms.grossPrice?.trim()) return "Please enter the gross selling price.";
  if (!(terms.paymentTerms ?? []).length) return "Please select at least one payment term.";
  if ((terms.paymentTerms ?? []).includes("others") && !terms.paymentOther?.trim()) return "Please describe the other payment term.";
  const pct = Number(terms.commissionPct);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return "Please enter a commission rate between 0 and 100%.";
  if (!terms.periodLength?.trim() || !terms.periodStart || !terms.periodEnd) return "Please enter the authority period and its start and end dates.";
  if (terms.periodEnd < terms.periodStart) return "The authority period must end after it starts.";
  if (!terms.protectionDays?.trim() || !terms.terminationNoticeDays?.trim()) return "Please enter the protection period and termination notice days.";
  if (!executionDate || !terms.executionPlace?.trim()) return "Please enter the signing date and place.";
  return null;
}
