/**
 * Renders each contract PDF with realistic, long-ish sample data and flags pages that are
 * (almost) empty, so layout regressions like "a signature alone on a page" or "a heading
 * stranded at the bottom" are caught.
 *
 *   npx -y tsx scripts/check-pdf-pages.tsx [tenancy|parking|str|addendum|pm|quotation]...
 *
 * Needs poppler (`pdftotext`, `pdfinfo`, `pdfimages`). Exits non-zero when a page is flagged.
 * Not part of `node --test` because of the poppler dependency.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

/** Min characters of body text (header/footer stripped) a page needs to not count as "blank". */
const MIN_BODY_CHARS = 200;

// ── helpers ──────────────────────────────────────────────────────────────────

function crc32(buf: Buffer): number {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Solid-colour PNG data URI — a stand-in for an uploaded ID photo / signature. */
export function solidPng(w: number, h: number, rgb: [number, number, number] = [200, 205, 212]): string {
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) row.set(rgb, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

const HEADER_FOOTER = [
  /^\+63 917/, /info@allabodeph\.com/, /www\.allabodeph\.com/,
  /^DISCLAIMER/i, /^Page \d+$/, /^PLEASE SIGN$/, /^LANDLORD$/, /^TENANT$/, /^(Tenant|Landlord|Owner)s?\b.*(consequences|representatives)/i,
  /^(Tenant|Tenancy|Parking|Agreement|Company)\b.*(disclaimer|prepared|responsible|submission)/i,
];

function pageStats(pdf: string) {
  const info = execFileSync("pdfinfo", [pdf]).toString();
  const pages = Number(/Pages:\s+(\d+)/.exec(info)?.[1] ?? 0);
  const out: { page: number; chars: number; bigImages: number; first: string }[] = [];
  for (let p = 1; p <= pages; p++) {
    const text = execFileSync("pdftotext", ["-f", String(p), "-l", String(p), "-layout", pdf, "-"]).toString();
    const body = text
      .split("\n").map((l) => l.trim()).filter(Boolean)
      // footer disclaimer wraps over several short lines; drop the very small-print block by keyword
      .filter((l) => !HEADER_FOOTER.some((re) => re.test(l)))
      .filter((l) => !/(DISCLAIMER|Tenant for review|consequences of|representatives and employees|prepared by All Abode|Both parties may seek)/i.test(l));
    const imgs = execFileSync("pdfimages", ["-list", "-f", String(p), "-l", String(p), pdf]).toString()
      .split("\n").slice(2).filter((l) => {
        const cols = l.trim().split(/\s+/);
        return cols.length > 4 && Number(cols[3]) >= 300; // width >= 300px → an ID / document image, not a logo/signature
      }).length;
    out.push({ page: p, chars: body.join(" ").length, bigImages: imgs, first: body[0]?.slice(0, 60) ?? "" });
  }
  // The logo / contact icons repeat on every page; only images *beyond* that baseline are content.
  const baseline = Math.min(...out.map((o) => o.bigImages));
  for (const o of out) o.bigImages -= baseline;
  return out;
}

// ── samples ──────────────────────────────────────────────────────────────────

const sig = solidPng(320, 90, [40, 60, 120]);
const idImg = solidPng(640, 400);

async function tenancyWith(extraIds: number) {
  const { renderTenancyPdf } = await import("@/lib/pdf/tenancy");
  const inventory = [
    ["1", "Aircon", "", "Cleaning upon move out c/o tenant"], ["2", "Bunkbeds w/ drawers", "", "with 4 Mattresses (Single)"],
    ["1", "Built In 4-door Cabinet", "", ""], ["1", "Keys", "", ""], ["4", "Access cards", "", ""], ["1", "Shoe rack", "", ""],
    ["1", "Built In Desk", "", ""], ["4", "Chairs", "", ""], ["1", "Ceiling Fan", "", ""], ["1", "Curtain rod", "", ""],
    ["2", "Curtains", "", "Laundry upon move out c/o Tenant"], ["1", "Fridge", "", ""], ["1", "Microwave", "", ""],
    ["1", "Rangehood", "", ""], ["1", "Induction Cooker", "", ""], ["1", "Rice Cooker", "", ""], ["1", "Electric Kettle", "", ""],
    ["", "Dinnerware set", "", ""], ["1", "Water Heater", "", ""], ["1", "Bidet", "", ""], ["1", "Bathroom Mirror", "", ""],
    ["1", "Shower rod w/ curtain", "", ""], ["", "Decors/Accessories", "", ""],
  ].map(([quantity, particulars, brand, remarks]) => ({ quantity, particulars, brand, remarks }));
  return renderTenancyPdf({
    id: "t1", referenceCode: "TA-0001", agreementDate: "2026-10-04",
    landlordDetails: { name: "Hanzzle Embon", idNumber: "P1302864B", address: "3069 Balance Circle, Fairfield, California, 94533" },
    tenantDetails: { name: "Crisavel Daileg", idNumber: "808942901", address: "Brgy. Soledad, San Pablo City, Laguna", email: "t@example.com" },
    terms: {
      propertyDetails: { buildingName: "878 España", floorUnit: "Unit 1006", address: "878 G. Tolentino Street, corner España Boulevard, Sampaloc" },
      leaseMonths: 7, leaseStartDate: "2026-11-07", leaseEndDate: "2027-06-06", rentAmount: 26000, rentAmountWords: null,
      advanceDepositAmount: 26000, advanceDepositWords: null, depositAmount: 52000, depositAmountWords: null, rentDueDay: 2,
      occupants: ["Crisavel Daileg", "Maryrose Gem De Guzman", "Andrhea Nicole Herradura", "Nicole Angela Marcelo"],
    },
    paymentSchedule: [
      { dueDate: "Immediately", amount: "26,000.00", particulars: "Nov 7-Dec 6, 2026" },
      { dueDate: "Nov 7, 2026", amount: "52,000.00", particulars: "2 months security deposit" },
      ...["Dec 2, 2026", "Jan 2, 2027", "Feb 2, 2027", "Mar 2, 2027", "Apr 2, 2027", "May 2, 2027"].map((d) => ({ dueDate: d, amount: "26,000.00", particulars: "1 month rent" })),
    ],
    bankDetails: { name: "All Abode Property Management Corp.", bank: "Union Bank of the Philippines", branch: "JTKC Building, Pasong Tamo Branch", accountNumber: "0020 2004 1280" },
    inventory,
    tenantIdTypeLabel: "Government ID", tenantIdNumber: "808942901", tenantIdIssuedDate: "2026-07-13", tenantIdImageDataUri: idImg,
    additionalOccupantIds: Array.from({ length: extraIds }, (_, i) => ({ name: `Occupant ${i + 1}`, idImageDataUri: idImg })),
    landlordIdTypeLabel: "Passport", landlordIdNumber: "P1302864B", landlordIdIssuedDate: "2019-04-01", landlordIdImageDataUri: idImg,
    tenantTypedName: "Crisavel H. Daileg", tenantSignatureDataUri: sig, tenantSignedAtManila: "Oct 5, 2026, 10:53 AM", tenantSignedIp: "1.2.3.4",
    landlordTypedName: "Hanzzle Embon", landlordSignatureDataUri: sig, landlordSignedAtManila: "Oct 5, 2026, 3:03 PM", landlordSignedIp: "5.6.7.8",
    landlordSignedVia: "remote", countersignerEmail: null, witnessName: null, witnessSignatureDataUri: null,
  });
}


const bank = { name: "All Abode Brokerage and Valuation OPC", bank: "Union Bank of the Philippines", branch: "JTKC Building, Pasong Tamo Branch", accountNumber: "0020 2004 1280" };
const common = {
  tenantIdTypeLabel: "Government ID", tenantIdNumber: "808942901", tenantIdIssuedDate: "2026-07-13", tenantIdImageDataUri: idImg,
  landlordIdTypeLabel: "Passport", landlordIdNumber: "P1302864B", landlordIdIssuedDate: "2019-04-01", landlordIdImageDataUri: idImg,
  tenantTypedName: "Crisavel H. Daileg", tenantSignatureDataUri: sig, tenantSignedAtManila: "Oct 5, 2026, 10:53 AM", tenantSignedIp: "1.2.3.4",
  landlordTypedName: "Hanzzle Embon", landlordSignatureDataUri: sig, landlordSignedAtManila: "Oct 5, 2026, 3:03 PM", landlordSignedIp: "5.6.7.8",
  landlordSignedVia: "remote" as const, countersignerEmail: null,
};
const landlord = { name: "Hanzzle Embon", idNumber: "P1302864B", address: "3069 Balance Circle, Fairfield, California, 94533" };
const tenant = { name: "Crisavel Daileg", address: "Brgy. Soledad, San Pablo City, Laguna", email: "t@example.com", contact: "0917 000 0000" };
const schedule = ["Nov 7, 2026", "Dec 2, 2026", "Jan 2, 2027", "Feb 2, 2027", "Mar 2, 2027", "Apr 2, 2027", "May 2, 2027"].map((d) => ({
  dueDate: d, amount: "3,000.00", bankBranch: "Union Bank / Pasong Tamo", coverage: "1 month rent",
}));

const tenancy = () => tenancyWith(3);

async function parking() {
  const { renderParkingPdf } = await import("@/lib/pdf/parking");
  return renderParkingPdf({
    id: "p1", referenceCode: "PK-0001", agreementDate: "2026-10-04", agreementCity: "Makati City",
    landlordDetails: landlord, tenantDetails: tenant,
    terms: {
      parkingDetails: { slotLabel: "P2-114", buildingName: "Makati Cinema Square", address: "Pasong Tamo, Makati City" },
      leaseStartDate: "2026-11-07", leaseEndDate: "2027-06-06", rentAmount: 3000, rentAmountWords: null,
      signingTotalAmount: 9000, signingTotalWords: null, stickerAmount: 500, rentDueDay: 2,
      vehicleDetails: { makeModel: "Toyota Vios", plateNo: "ABC 1234", color: "White" },
    },
    paymentSchedule: schedule, bankDetails: bank, ...common,
    additionalOccupantIds: [{ name: "Second driver", idImageDataUri: idImg }],
    witnessName: "Maria Witness", witnessSignatureDataUri: sig,
  });
}

async function str() {
  const { renderShortTermRentalPdf } = await import("@/lib/pdf/short-term-rental");
  return renderShortTermRentalPdf({
    id: "s1", referenceCode: "STR-0001", agreementDate: "2026-10-04",
    landlordDetails: { name: "Hanzzle Embon", address: landlord.address }, tenantDetails: tenant,
    terms: {
      propertyDetails: { buildingName: "878 España", unitNumber: "Unit 1006", address: "878 G. Tolentino Street, Sampaloc" },
      checkInDate: "2026-11-07", checkOutDate: "2026-11-14", occupants: ["Crisavel Daileg", "Maryrose Gem De Guzman"],
      amenityLocation: "7th floor", amenitiesList: "Pool, gym, function room", garbageDisposalLocation: "Basement 1",
    },
    feeItems: [{ label: "Rental", amount: 21000 }, { label: "Cleaning fee", amount: 1500 }],
    securityDepositAmount: 5000, bankDetails: bank,
    inventory: Array.from({ length: 20 }, (_, i) => ({ quantity: "1", particulars: `Item ${i + 1}`, brand: "", remarks: "" })),
    ...common,
  });
}

async function addendum() {
  const { renderAddendumPdf } = await import("@/lib/pdf/addendum");
  return renderAddendumPdf({
    id: "a1", referenceCode: "AD-0001", agreementDate: "2026-12-01",
    landlordDetails: { name: "Hanzzle Embon", address: landlord.address }, tenantDetails: tenant,
    terms: {
      parentType: "tenancy",
      parentSnapshot: { contractTitle: "Tenancy Agreement", referenceCode: "TA-0001", agreementDate: "2026-10-04", propertyDescription: "878 España Unit 1006", source: "system" },
      effectiveDate: "2027-01-01", newStartDate: "2027-01-01", newEndDate: "2027-12-31",
      feeItems: [{ label: "Monthly rent", amount: 28000 }],
      partyChanges: [{ action: "add", role: "Tenant", name: "New Occupant" }],
      amendedClauses: [{ ref: "Clause 3.1", heading: "Monthly Rent", mode: "replace", newText: "The monthly rent shall be Twenty Eight Thousand Pesos (PHP 28,000.00). ".repeat(6) }],
    },
    feeItems: [{ label: "Monthly rent", amount: 28000 }],
    paymentSchedule: schedule, bankDetails: bank,
    additionalPartyIds: [{ name: "New Occupant", idImageDataUri: idImg }],
    ...common,
  });
}

async function pm() {
  const { renderAgreementPdf } = await import("@/lib/pdf/agreement");
  // Sparse on purpose: the renderer treats every field as optional, and empty values still print as blanks.
  const input = {
    id: "m1", referenceCode: "PM-0001",
    ownerDetails: { name: "Hanzzle Embon", address: landlord.address, email: "o@example.com", mobile: "0917 000 0000" },
    propertyDetails: { buildingName: "878 España", unitNumber: "Unit 1006", address: "878 G. Tolentino Street, Sampaloc" },
    serviceSelections: {}, annexC: {}, annexB: {},
    payoutDay: 15, effectiveDate: "2026-10-04",
    ownerIdTypeLabel: "Passport", ownerIdNumber: "P1302864B", ownerIdIssuedDate: "2019-04-01", ownerIdImageDataUri: idImg,
    managerIdTypeLabel: "Passport", managerIdNumber: "P0000000A", managerIdIssuedDate: "2020-01-01", managerIdImageDataUri: idImg,
    ownerTypedName: "Hanzzle Embon", ownerSignatureDataUri: sig, ownerSignedAtManila: "Oct 5, 2026, 3:03 PM", ownerSignedIp: "5.6.7.8",
    managerSignatureDataUri: sig, managerSignedAtManila: "Oct 6, 2026, 9:00 AM", managerSignedIp: "9.9.9.9", managerSignerEmail: "m@example.com",
  };
  return renderAgreementPdf(input as unknown as Parameters<typeof renderAgreementPdf>[0]);
}

async function ats() {
  const { renderAuthorityToSellPdf } = await import("@/lib/pdf/authority-to-sell");
  return renderAuthorityToSellPdf({
    id: "a1", referenceCode: "ATS-0001", executionDate: "2026-10-24",
    ownerDetails: { name: "Hanzzle Embon", address: landlord.address, email: "o@example.com", contact: "0917 000 0000" },
    propertyDetails: { propertyType: "Condominium unit", location: "878 G. Tolentino Street, Sampaloc, Manila", titleNo: "CCT-123456", area: "45 sqm", improvements: "Fully furnished" },
    saleTerms: {
      authorityType: "exclusive", grossPrice: "5000000", minPrice: "4800000", paymentTerms: ["cash", "bank_financing"],
      commissionPct: "5", periodLength: "6", periodUnit: "months", periodStart: "2026-11-01", periodEnd: "2027-04-30",
      protectionDays: "90", terminationNoticeDays: "30", executionPlace: "Makati City",
    },
    ownerIdTypeLabel: "Passport", ownerIdNumber: "P1302864B", ownerIdIssuedDate: "2019-04-01", ownerIdImageDataUri: idImg,
    brokerIdTypeLabel: "PRC", brokerIdNumber: "0035712", brokerIdIssuedDate: "June 30, 2025", brokerIdImageDataUri: idImg,
    ownerTypedName: "Hanzzle Embon", ownerSignatureDataUri: sig, ownerSignedAtManila: "Oct 25, 2026, 3:03 PM", ownerSignedIp: "5.6.7.8",
    brokerSignatureDataUri: sig, brokerSignedAtManila: "Oct 26, 2026, 9:00 AM", brokerSignedIp: "9.9.9.9", brokerSignerEmail: "m@example.com",
  });
}

async function quotation() {
  const { renderQuotationPdf } = await import("@/lib/pdf/quotation");
  const cats = ["furnishing", "repairs", "others"] as const;
  const lineItems = Array.from({ length: 18 }, (_, i) => ({
    category: cats[i % 3], pricingMode: "unit" as const, item: `Item ${i + 1}`, description: "Brand / model / colour details for the line.",
    quantity: 2, unit: "pc", unitPrice: 1500, amount: 3000,
  }));
  return renderQuotationPdf({
    quotationNumber: "QT-0001", quotationDate: "2026-10-04", validUntil: "2026-11-04", title: "Unit fit-out", propertyReference: "878 España Unit 1006",
    recipientDetails: { name: "Hanzzle Embon", email: "o@example.com", phone: "0917 000 0000", address: landlord.address }, recipientEmail: "o@example.com",
    lineItems, grandTotalOverride: null, scopeOfWork: "Supply and install the items listed above. ".repeat(12), notes: "Prices are subject to change. ".repeat(6),
    paymentTermsType: "progress_billing", paymentTermsNotes: null,
    progressMilestones: [{ description: "Downpayment", percentageOrAmount: "50%", triggerCondition: "Upon signing" }, { description: "Completion", percentageOrAmount: "50%", triggerCondition: "On turnover" }],
    termsPayment: "Payment terms text. ".repeat(20), termsCompletion: "Completion terms text. ".repeat(20), termsWarranty: "Warranty text. ".repeat(20), termsValidity: "Validity text. ".repeat(10),
    bankDetails: bank,
    companyTypedName: "Aremchel M. Cruzado", companySignatureDataUri: sig, companySignedAtManila: "Oct 5, 2026, 10:00 AM", companySignedIp: "1.1.1.1", companySignedVia: "remote",
    recipientTypedName: "Hanzzle Embon", recipientSignatureDataUri: sig, recipientSignedAtManila: "Oct 6, 2026, 10:00 AM", recipientSignedIp: "2.2.2.2",
  });
}

const RENDERERS: Record<string, () => Promise<Buffer>> = { tenancy, "tenancy-2ids": () => tenancyWith(0), "tenancy-4ids": () => tenancyWith(2), "tenancy-6ids": () => tenancyWith(4), "tenancy-8ids": () => tenancyWith(6), parking, str, addendum, pm, ats, quotation };

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const wanted = process.argv.slice(2);
  const names = wanted.length ? wanted : Object.keys(RENDERERS);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pdfcheck-"));
  let bad = 0;
  for (const name of names) {
    const render = RENDERERS[name];
    if (!render) { console.error(`unknown renderer: ${name}`); bad++; continue; }
    const file = path.join(dir, `${name}.pdf`);
    fs.writeFileSync(file, await render());
    const stats = pageStats(file);
    console.log(`\n${name}: ${stats.length} pages  (${file})`);
    for (const s of stats) {
      const flagged = s.chars < MIN_BODY_CHARS && s.bigImages === 0;
      if (flagged) bad++;
      console.log(`  p${String(s.page).padStart(2)}  ${String(s.chars).padStart(5)} chars  ${s.bigImages ? `${s.bigImages} img  ` : "        "}${flagged ? "  <-- NEARLY EMPTY" : ""}  ${s.first}`);
    }
  }
  if (bad) { console.error(`\n${bad} nearly-empty page(s)`); process.exit(1); }
  console.log("\nOK — no nearly-empty pages");
}

main().catch((e) => { console.error(e); process.exit(2); });
