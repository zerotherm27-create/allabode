import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import { KEY_ITEMS, FURNITURE_ITEMS, APPLIANCE_ITEMS, FIXTURE_ITEMS, CONDITION_AREAS } from "@/lib/pm/annex-b-fields";
import {
  LEASE_TERM_LABEL, PET_LABEL, SMOKING_LABEL, YN_LABEL, FURNISHING_LABEL,
  COMMS_LABEL, RESPONSE_LABEL, payoutScheduleLabel,
} from "@/lib/pm/agreement-labels";
import { COMPANY_SIGNATORY } from "@/lib/pm/company-signatory";
import { PageContactRow } from "@/lib/pdf/contact-icons";

let _logoBase64: string | null = null;
function getLogo(): string | null {
  if (_logoBase64 !== null) return _logoBase64;
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public/logo/logo-primary.png"));
    _logoBase64 = `data:image/png;base64,${buf.toString("base64")}`;
  } catch { _logoBase64 = ""; }
  return _logoBase64 || null;
}

const NAVY = "#0a2540";
const SLATE = "#5b6573";
const LINE = "#e2e6ec";
const INK = "#16202c";

// Same house style as the tenancy/parking agreement PDFs: per-page logo
// header + disclaimer/"PLEASE SIGN" footer, on every page.
const PM_DISCLAIMER =
  "DISCLAIMER: This Property Management Agreement has been prepared by All Abode Brokerage and Valuation OPC for " +
  "submission to the Owner for review and approval. No representation or recommendation is made by the Company, " +
  "as to the legal sufficiency, legal effect, or tax consequences of this management agreement. The Owner may " +
  "seek legal advice when in doubt. All Abode Brokerage and Valuation OPC, its owners, representatives and " +
  "employees, shall not be held responsible for any disputes arising from non-compliance to this agreement.";

const styles = StyleSheet.create({
  // Extra top/bottom padding vs the old layout: every page now carries the
  // fixed logo header and the disclaimer + "PLEASE SIGN" initials footer,
  // matching the tenancy/parking agreement PDFs.
  page: { paddingTop: 92, paddingBottom: 118, paddingHorizontal: 44, fontSize: 9.5, color: INK, fontFamily: "Helvetica", lineHeight: 1.4 },
  header: { position: "absolute", top: 22, left: 44, right: 44, alignItems: "center" },
  footer: { position: "absolute", top: 700, left: 44, right: 44, height: 70, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  footerLeft: { flex: 1, paddingRight: 10 },
  footerDisclaimer: { fontSize: 6, color: SLATE, lineHeight: 1.25 },
  footerPage: { fontSize: 7.5, color: SLATE, marginBottom: 2 },
  signBox: { width: 128, borderWidth: 0.75, borderColor: INK },
  signBoxTitle: { fontSize: 6.5, fontFamily: "Helvetica-Bold", textAlign: "center", borderBottomWidth: 0.75, borderBottomColor: INK, paddingVertical: 1.5 },
  signBoxRow: { flexDirection: "row" },
  signBoxCell: { flex: 1, alignItems: "center", paddingBottom: 2 },
  signBoxCellLeft: { borderRightWidth: 0.75, borderRightColor: INK },
  signBoxLabel: { fontSize: 6, paddingTop: 1.5 },
  signBoxImg: { width: 52, height: 18, objectFit: "contain" },
  signBoxBlank: { width: 52, height: 18 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 10, color: SLATE, textAlign: "center", marginBottom: 14 },
  intro: { textAlign: "center", marginBottom: 14 },
  h1: { fontFamily: "Helvetica-Bold", marginTop: 9, marginBottom: 5 },
  h2: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 4 },
  p: { marginBottom: 6, textAlign: "justify" },
  bold: { fontFamily: "Helvetica-Bold" },
  hr: { borderBottomWidth: 0.75, borderBottomColor: "#aaaaaa", marginVertical: 8 },
  table: { borderWidth: 0.75, borderColor: LINE, marginBottom: 8 },
  trow: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: LINE },
  trowLast: { flexDirection: "row" },
  thCell: { flex: 1, backgroundColor: "#f0f4f8", padding: 5, fontFamily: "Helvetica-Bold", borderRightWidth: 0.75, borderRightColor: LINE },
  tdCell: { flex: 1, padding: 5, borderRightWidth: 0.75, borderRightColor: LINE },
  tdCellLast: { flex: 1, padding: 5 },
  fieldRow: { flexDirection: "row", marginBottom: 4 },
  fieldLabel: { width: 150, fontFamily: "Helvetica-Bold", color: NAVY },
  fieldValue: { flex: 1, borderBottomWidth: 0.75, borderBottomColor: LINE, paddingBottom: 2 },
  listItem: { flexDirection: "row", marginBottom: 3 },
  checkBox: { width: 9, height: 9, borderWidth: 0.75, borderColor: INK, marginRight: 5, marginTop: 1 },
  checkBoxFilled: { width: 9, height: 9, backgroundColor: NAVY, marginRight: 5, marginTop: 1, alignItems: "center", justifyContent: "center" },
  checkMark: { color: "white", fontSize: 6 },
  sigBlock: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  sigCol: { width: "47%" },
  sigImg: { width: 160, height: 50, objectFit: "contain", marginTop: 4, marginBottom: 2 },
  sigLine: { borderBottomWidth: 0.75, borderBottomColor: INK, height: 50, marginTop: 4, marginBottom: 2 },
  annexTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "center", marginBottom: 6 },
});

function PageHeader() {
  const logo = getLogo();
  return (
    <View style={styles.header} fixed>
      {logo && (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={logo} style={{ width: 118, height: 34, objectFit: "contain" }} />
      )}
      <PageContactRow phone="+63 917 159 6808" email="info@allabodeph.com" website="www.allabodeph.com" color={SLATE} fontSize={7} />
    </View>
  );
}

function Check({ checked }: { checked?: boolean }) {
  return checked
    ? <View style={styles.checkBoxFilled}><Text style={styles.checkMark}>X</Text></View>
    : <View style={styles.checkBox} />;
}

function CheckItem({ checked, label }: { checked?: boolean; label: string }) {
  return (
    <View style={styles.listItem}>
      <Check checked={checked} />
      <Text>{label}</Text>
    </View>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

function Hr() { return <View style={styles.hr} />; }

/**
 * Same footer pattern as the tenancy/parking agreement PDFs: page number +
 * disclaimer on the left, and the "PLEASE SIGN" initials box (OWNER |
 * MANAGER) bottom right — stamped with small signature thumbnails once each
 * party has signed.
 */
function PageFooter({ ownerSig, managerSig }: { ownerSig: string | null; managerSig: string | null }) {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerLeft}>
        <Text style={styles.footerPage} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
        <Text style={styles.footerDisclaimer}>{PM_DISCLAIMER}</Text>
      </View>
      <View style={styles.signBox}>
        <Text style={styles.signBoxTitle}>PLEASE SIGN</Text>
        <View style={styles.signBoxRow}>
          <View style={[styles.signBoxCell, styles.signBoxCellLeft]}>
            <Text style={styles.signBoxLabel}>OWNER</Text>
            {ownerSig
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={ownerSig} style={styles.signBoxImg} />
              : <View style={styles.signBoxBlank} />}
          </View>
          <View style={styles.signBoxCell}>
            <Text style={styles.signBoxLabel}>MANAGER</Text>
            {managerSig
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={managerSig} style={styles.signBoxImg} />
              : <View style={styles.signBoxBlank} />}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Input shapes ─────────────────────────────────────────────────────────────

export type OwnerDetails = {
  name: string; nationality?: string; civilStatus?: string; address?: string; email?: string; contact?: string;
};
export type PropertyDetails = {
  condo?: string; unit?: string; address?: string; floorArea?: string; parking?: string; storage?: string;
  furnished?: boolean; inclusions?: string;
};
export type ServiceSelections = {
  fullPropertyManagement?: boolean; longTermLeasing?: boolean; shortTermLeasing?: boolean;
  tenantHunting?: boolean; condotelManagement?: boolean; otherServices?: string;
};
export type AnnexC = {
  minMonthlyRent?: string; leaseTerm?: string; leaseTermOther?: string;
  maxDiscountAmount?: string; maxDiscountPercent?: string;
  repairLimit?: string; repairLimitOther?: string;
  petPolicy?: string; petConditions?: string;
  smokingPolicy?: string; subleasing?: string; shortTermRentals?: string; furnishing?: string;
  preferredCommunication?: string; preferredResponseTime?: string;
  bankName?: string; bankAccountName?: string; bankAccountNo?: string;
  specialInstructions?: string;
};
type QtyCond = { qty?: string; condition?: string; remarks?: string; brand?: string };
export type AnnexB = {
  keys?: Record<string, QtyCond>;
  furniture?: Record<string, QtyCond>;
  appliances?: Record<string, QtyCond>;
  fixtures?: string[];
  conditionReport?: Record<string, string>;
} | null;

export type AgreementPdfInput = {
  id: string;
  referenceCode: string;
  ownerDetails: OwnerDetails;
  propertyDetails: PropertyDetails;
  serviceSelections: ServiceSelections;
  annexC: AnnexC;
  annexB: AnnexB;
  payoutDay?: number | null;
  effectiveDate?: string | null;
  ownerIdTypeLabel: string;
  ownerIdNumber: string;
  ownerIdIssuedDate?: string | null;
  ownerIdImageDataUri: string | null;
  managerIdTypeLabel: string;
  managerIdNumber: string;
  managerIdIssuedDate: string;
  managerIdImageDataUri: string | null;
  ownerTypedName: string;
  ownerSignatureDataUri: string;
  ownerSignedAtManila: string;
  ownerSignedIp: string;
  managerSignatureDataUri: string;
  managerSignedAtManila: string;
  managerSignedIp: string;
  managerSignerEmail: string;
};

export async function renderAgreementPdf(input: AgreementPdfInput): Promise<Buffer> {
  const od = input.ownerDetails;
  const pd = input.propertyDetails;
  const ss = input.serviceSelections;
  const ac = input.annexC;
  const ab = input.annexB;
  const hasAnnexB = !!ab && (
    (ab.keys && Object.keys(ab.keys).length) ||
    (ab.furniture && Object.keys(ab.furniture).length) ||
    (ab.appliances && Object.keys(ab.appliances).length) ||
    (ab.fixtures && ab.fixtures.length) ||
    (ab.conditionReport && Object.keys(ab.conditionReport).length)
  );
  const Footer = () => <PageFooter ownerSig={input.ownerSignatureDataUri || null} managerSig={input.managerSignatureDataUri || null} />;

  const doc = (
    <Document>
      {/* Main body flows continuously across as many pages as the content
          actually needs — do not hardcode page boundaries by section, or
          every page ends wherever the split falls instead of where the
          content runs out, leaving large trailing blank areas. */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Text style={styles.title}>PROPERTY MANAGEMENT AGREEMENT</Text>
        <Text style={styles.subtitle}>All Abode Brokerage and Valuation OPC</Text>
        <Text style={styles.intro}>
          This Agreement is entered into on {input.effectiveDate || "the date of full execution"}, by and between:
        </Text>

        <Text style={styles.h2}>PROPERTY OWNER</Text>
        <Field label="Name:" value={od.name} />
        <Field label="Nationality:" value={od.nationality || "Filipino"} />
        <Field label="Civil Status:" value={od.civilStatus} />
        <Field label="Address:" value={od.address} />
        <Field label="Email:" value={od.email} />
        <Field label="Contact:" value={od.contact} />
        <Text style={styles.p}>Hereinafter referred to as the &#x201C;Owner.&#x201D;</Text>
        <Text style={[styles.p, { textAlign: "center" }]}>&#x2014; and &#x2014;</Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>ALL ABODE BROKERAGE AND VALUATION OPC.</Text>, a One Person Corporation duly organized under
          Philippine law, with principal office at 2216 Chino Roces Ave., Makati, Laureano Di Trevi Towers, Tower 2 #2804,
          represented by its <Text style={styles.bold}>Chief Executive Officer (CEO), Aremchel M. Cruzado</Text>; hereinafter referred to as the{" "}
          <Text style={styles.bold}>&#x201C;Manager.&#x201D;</Text>
        </Text>
        <Hr />

        <Text style={styles.h1}>I. PROPERTY</Text>
        <Field label="Condominium / Building:" value={pd.condo} />
        <Field label="Unit Number:" value={pd.unit} />
        <Field label="Address:" value={pd.address} />
        <Field label="Floor Area:" value={pd.floorArea} />
        <Field label="Parking Slot:" value={pd.parking} />
        <Field label="Storage Unit:" value={pd.storage} />
        <Field label="Furnished:" value={pd.furnished ? "Yes" : "No"} />
        <Field label="Inclusions:" value={pd.inclusions} />
        <Text style={styles.p}>The Owner warrants that the above information is complete and accurate.</Text>
        <Hr />

        <Text style={styles.h1}>II. APPOINTMENT AND TERM</Text>
        <Text style={styles.p}>
          The Owner exclusively appoints <Text style={styles.bold}>All Abode Brokerage and Valuation OPC.</Text> as Property
          Manager, and the Manager accepts, agreeing to perform services with commercially reasonable care, diligence, and
          professional standards consistent with Philippine industry practice. The Manager acts as an independent
          contractor; nothing herein creates an employer-employee relationship, partnership, joint venture, or agency
          beyond the authority expressly granted.
        </Text>
        <Field label="Effective Date:" value={input.effectiveDate} />
        <Text style={styles.p}>
          This Agreement continues until terminated by either Party upon thirty (30) calendar days&#x2019; prior written
          notice. Either Party may terminate immediately upon material breach that remains uncured fifteen (15) calendar
          days after written notice. Termination does not affect accrued rights, fees, reimbursements, or liabilities.
          Existing lease contracts remain valid until their expiration unless otherwise agreed by all parties.
        </Text>
        <Hr />

        <Text style={styles.h1}>III. SERVICES SELECTED</Text>
        <CheckItem checked={ss.fullPropertyManagement} label="Full Property Management" />
        <CheckItem checked={ss.longTermLeasing} label="Long-Term Leasing (Six Months or More)" />
        <CheckItem checked={ss.shortTermLeasing} label="Short-Term / Monthly Leasing" />
        <CheckItem checked={ss.tenantHunting} label="Tenant Hunting Only" />
        <CheckItem checked={ss.condotelManagement} label="Condotel Management" />
        <CheckItem checked={!!ss.otherServices} label={`Other Services: ${ss.otherServices || "Bills Payment, Unit Furnishing, Unit Repairs, etc."}`} />
        <Text style={styles.p}>Specific services and fees are detailed in Annex &#x201C;A.&#x201D;</Text>
        <Hr />

        <Text style={styles.h1}>IV. SCOPE OF SERVICES</Text>
        <Text style={styles.p}>Subject to the service package selected, the Manager shall:</Text>
        <Text style={styles.p}><Text style={styles.bold}>a. Marketing &amp; Viewings &#x2014; </Text>advertise through online portals, social media, broker networks, and other appropriate channels; conduct property viewings; coordinate with building administration for access; install/remove marketing materials where permitted.</Text>
        <Text style={styles.p}><Text style={styles.bold}>b. Tenant Screening &#x2014; </Text>verify identity, employment/business, income, credit/rental history, and references. The Owner acknowledges that screening reduces but does not eliminate risk; the Manager does not guarantee a tenant&#x2019;s future conduct or financial capacity.</Text>
        <Text style={styles.p}><Text style={styles.bold}>c. Lease Documentation &#x2014; </Text>prepare and coordinate execution of lease agreements, renewals, extensions, move-in documents, house rules, inventory lists, and related documents.</Text>
        <Text style={styles.p}><Text style={styles.bold}>d. Move-In / Move-Out &#x2014; </Text>coordinate with the Owner, Tenant, and building administration on move-in requirements, gate passes, orientation, turnover, inventory inspection, move-out inspection, and security deposit reconciliation.</Text>
        <Text style={styles.p}><Text style={styles.bold}>e. Tenant Relations &#x2014; </Text>serve as primary contact for maintenance requests, billing concerns, lease administration, building coordination, and general inquiries.</Text>
        <Text style={styles.p}><Text style={styles.bold}>f. Rental Administration &#x2014; </Text>collect rental payments and other charges; monitor payment schedules; follow up overdue accounts; issue Statements of Account; maintain rental records; prepare Owner payout statements.</Text>
        <Text style={styles.p}><Text style={styles.bold}>g. Renewals &amp; Inspections &#x2014; </Text>negotiate renewal/extension terms prior to lease expiration, subject to Owner approval; conduct periodic property inspections with reasonable notice to the Tenant.</Text>
        <Hr />

        <Text style={styles.h1}>V. MANAGER&#x2019;S AUTHORITY AND LIMITATIONS</Text>
        <Text style={styles.p}>
          The Manager is authorized to: advertise and market the Property; respond to inquiries; screen and recommend
          tenants; prepare lease documents; coordinate move-in/out; collect rent, deposits, utilities, penalties, and
          other amounts due; coordinate with condominium corporations, HOAs, utility providers, contractors, and
          government agencies; arrange repairs within the approved spending limit (Annex &#x201C;C&#x201D;); engage
          licensed contractors and service providers; maintain property records; and release rental proceeds net of
          authorized deductions.
        </Text>
        <Text style={styles.p}><Text style={styles.bold}>The Manager shall not</Text>, without express written Owner authorization:</Text>
        <Text style={styles.p}>(a) sell, mortgage, or otherwise dispose of the Property; (b) execute leases exceeding the Owner-approved maximum term; (c) undertake major renovations or capital improvements beyond the approved spending limit; (d) borrow money on behalf of the Owner; or (e) enter into contracts unrelated to Property management.</Text>
        <Text style={styles.p}>Emergency repairs are governed by Section IX below.</Text>
        <Hr />

        <Text style={styles.h1}>VI. OWNER&#x2019;S RESPONSIBILITIES AND WARRANTIES</Text>
        <Text style={styles.p}>The Owner agrees to: provide proof of ownership or authority to lease (including Special Power of Attorney, if applicable); deliver the Property in clean, safe, habitable, and tenant-ready condition, with all included furniture, appliances, and fixtures in good working order unless otherwise disclosed; remain responsible for major repairs, structural and hidden defects, appliance replacement due to age/normal use, and capital improvements; bear all association dues, utility charges, real property taxes, insurance premiums, and other ownership expenses until the Property is occupied; respond promptly to requests requiring Owner approval; comply with all applicable laws, condominium rules, HOA regulations, and government requirements; and cooperate with the Manager and provide all information, documents, and approvals reasonably necessary for performance.</Text>
        <Text style={styles.p}>The Owner represents and warrants that: (a) the Owner is the lawful owner or duly authorized representative; (b) the Property is free from any restriction prohibiting leasing; (c) all information provided is true, complete, and accurate; (d) all known material defects have been disclosed; and (e) leasing the Property does not violate any law, court order, mortgage, condominium rule, HOA rule, or contractual obligation.</Text>
        <Text style={styles.p}>The Owner agrees to <Text style={styles.bold}>indemnify and hold the Manager harmless</Text> from any loss, liability, or expense arising from breach of the foregoing warranties. This indemnity survives termination.</Text>
        <Hr />

        <Text style={styles.h1}>VII. FEES, COLLECTIONS, AND PAYOUTS</Text>
        <Text style={styles.h2}>7.1 Fee Schedule</Text>
        <Text style={styles.p}>Fees are set out in Annex &#x201C;A.&#x201D; Default rates (unless otherwise agreed in writing) apply as listed there.</Text>
        <Text style={styles.h2}>7.2 Rental Collection</Text>
        <Text style={styles.p}>The Manager is authorized to collect monthly rent, security deposits, advance rentals, utility reimbursements, penalties, and other charges due under the Lease Agreement. Collected funds are deposited into the Manager&#x2019;s designated account before remittance to the Owner.</Text>
        <Text style={styles.h2}>7.3 Deductions Before Payout</Text>
        <Text style={styles.p}>Prior to each remittance, the Manager shall deduct management fees, leasing commissions, approved repair costs, utility and association due payments made on behalf of the Owner, required withholding taxes, and other authorized expenses, and shall provide a monthly Statement of Account detailing all collections, deductions, and net amount payable.</Text>
        <Text style={styles.h2}>7.4 Non-Circumvention</Text>
        <Text style={styles.p}>During the term and for twelve (12) months after termination, the Owner shall not directly or indirectly lease the Property to any tenant introduced by the Manager without the Manager&#x2019;s written consent. If the Owner does so without paying the applicable commission, the full commission and applicable management fees remain due.</Text>
        <Text style={styles.h2}>7.5 Taxes</Text>
        <Text style={styles.p}>Each Party bears government taxes for which it is legally responsible under Philippine law unless otherwise agreed in writing.</Text>
        <Hr />

        <Text style={styles.h1}>VIII. SECURITY DEPOSIT</Text>
        <Text style={styles.p}>The Tenant&#x2019;s security deposit shall be held solely as security for the Tenant&#x2019;s obligations and shall not be treated as income. Unless otherwise stated in the Lease Agreement, the Owner shall hold an amount equivalent to one (1) month&#x2019;s gross rent and the Manager shall hold an amount equivalent to one (1) month&#x2019;s gross rent. The security deposit may be applied to unpaid rent, utilities, association dues chargeable to the Tenant, damage beyond normal wear and tear, missing items, excess cleaning costs, and other Tenant obligations under the Lease Agreement. Any remaining balance shall be returned to the Tenant after completion of move-out inspection, final accounting, and deduction of all lawful charges, per the timeline in the Lease Agreement.</Text>
        <Hr />

        <Text style={styles.h1}>IX. REPAIRS AND MAINTENANCE</Text>
        <Text style={styles.p}>The Owner bears the cost of repairs from ordinary wear and tear, structural defects, building systems failures, appliance replacement due to age or normal use, hidden defects, and capital improvements. The Tenant is responsible for damage caused by negligence, misuse, abuse, or lease violations. No non-emergency repair exceeding the Owner&#x2019;s approved spending limit (Annex &#x201C;C&#x201D;) shall proceed without prior Owner approval.</Text>
        <Text style={styles.h2}>Emergency Repairs</Text>
        <Text style={styles.p}>The Manager may arrange emergency repairs without prior approval when immediately necessary to prevent injury, protect the Property from further damage, prevent interruption of essential utilities, comply with condominium rules or applicable law, or mitigate substantial financial loss. The Manager shall notify the Owner as soon as practicable. All reasonable emergency expenses shall be reimbursed by the Owner upon presentation of supporting documents.</Text>
        <Text style={styles.h2}>Reimbursement</Text>
        <Text style={styles.p}>Whenever the Manager advances payment for any approved Owner expense, the Owner shall reimburse within seven (7) calendar days from receipt of the Statement of Account or written demand. The Manager may deduct unpaid reimbursements from future rental collections with proper documentation.</Text>
        <Hr />

        <Text style={styles.h1}>X. DELINQUENCY AND NO GUARANTEE</Text>
        <Text style={styles.p}>The Manager shall make reasonable efforts to collect overdue rent but does not guarantee collection or assume liability for Tenant default. Should legal action become necessary, the Manager may coordinate with legal counsel upon the Owner&#x2019;s written instruction; all legal fees and litigation costs shall be borne by the Owner unless recovered from the Tenant.</Text>
        <Text style={styles.p}>The Manager does not guarantee that the Property will be leased within any specific period, continuous occupancy, the Tenant&#x2019;s financial capacity or future conduct, timely rent payment, or the market value or appreciation of the Property.</Text>
        <Hr />

        <Text style={styles.h1}>XI. LIABILITY, INDEMNIFICATION, AND INSURANCE</Text>
        <Text style={styles.h2}>Limitation of Liability</Text>
        <Text style={styles.p}>Except in cases of fraud, gross negligence, or willful misconduct, the Manager shall not be liable for any direct, indirect, incidental, or consequential loss or damage arising from Tenant default, theft, fire, flood, typhoon, earthquake, utility interruptions, acts of third-party contractors, government actions, condominium or HOA decisions, or market fluctuations.</Text>
        <Text style={styles.h2}>Indemnification</Text>
        <Text style={styles.p}>The Owner shall defend, indemnify, and hold harmless the Manager, its directors, officers, employees, and representatives from any claim arising from the Owner&#x2019;s breach of this Agreement, defects in ownership or authority, hidden defects not disclosed, or violations of laws or rules attributable to the Owner. This indemnity survives termination.</Text>
        <Text style={styles.h2}>Insurance</Text>
        <Text style={styles.p}>The Manager strongly recommends the Owner maintain adequate insurance, including Fire, Comprehensive Property, Public Liability, and Contents Insurance for furnished units. The Manager shall not be responsible for uninsured losses.</Text>
        <Hr />

        <Text style={styles.h1}>XII. CONFIDENTIALITY AND DATA PRIVACY</Text>
        <Text style={styles.p}>Both Parties shall keep confidential all personal, financial, tenant, business, and proprietary information obtained under this Agreement, except where disclosure is required by law or necessary to perform obligations herein. This obligation continues after termination.</Text>
        <Text style={styles.p}>The Parties shall comply with Republic Act No. 10173 (Data Privacy Act of 2012) and its implementing rules. The Owner authorizes the Manager to collect, process, store, and disclose personal information only as necessary for marketing the Property, tenant screening, lease administration, rental collection, and legal/regulatory compliance.</Text>
        <Hr />

        <Text style={styles.h1}>XIII. GENERAL PROVISIONS</Text>
        <Text style={styles.h2}>Force Majeure</Text>
        <Text style={styles.p}>Neither Party is liable for delay or failure to perform due to causes beyond reasonable control, including typhoons, floods, earthquakes, fires, epidemics, war, civil unrest, government regulations, power failures, or acts of God.</Text>
        <Text style={styles.h2}>Governing Law and Disputes</Text>
        <Text style={styles.p}>This Agreement is governed by the laws of the Republic of the Philippines. The Parties shall first attempt good-faith negotiation, then mediation, before litigation. Exclusive venue shall be the proper courts of Makati City, Philippines.</Text>
        <Text style={styles.h2}>Entire Agreement, Severability, Assignment, Notices</Text>
        <Text style={styles.p}>This Agreement, with its Annexes, constitutes the entire agreement of the Parties. If any provision is invalid, the remaining provisions continue in force. The Owner may not assign this Agreement without the Manager&#x2019;s written consent. All notices shall be in writing, delivered personally, by courier, or by electronic mail to the addresses provided.</Text>
        <Text style={styles.h2}>Counterparts and Electronic Signatures</Text>
        <Text style={styles.p}>This Agreement may be executed in counterparts. Electronic signatures, executed in compliance with Republic Act No. 8792 (Electronic Commerce Act of 2000) and the Rules on Electronic Evidence (A.M. No. 01-7-01-SC), shall have the same legal effect, validity, and enforceability as a manual signature, to the fullest extent permitted by Philippine law.</Text>
        <Hr />

        <Text style={styles.h1}>XIV. SIGNATURES</Text>
        <Text style={styles.p}>
          IN WITNESS WHEREOF, the Parties have hereunto set their hands as of {input.effectiveDate || "the date of full execution"}, Philippines.
        </Text>
        <View style={styles.sigBlock}>
          <View style={styles.sigCol}>
            <Text style={styles.bold}>OWNER</Text>
            {input.ownerSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.ownerSignatureDataUri} style={styles.sigImg} />
              : <View style={styles.sigLine} />}
            <Text>{input.ownerTypedName || od.name}</Text>
            <Text style={{ fontSize: 8, color: SLATE }}>Signed: {input.ownerSignedAtManila}</Text>
          </View>
          <View style={styles.sigCol}>
            <Text style={styles.bold}>ALL ABODE BROKERAGE AND VALUATION OPC</Text>
            {input.managerSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.managerSignatureDataUri} style={styles.sigImg} />
              : <View style={styles.sigLine} />}
            <Text>Aremchel M. Cruzado &#x2014; Chief Executive Officer (CEO)</Text>
            <Text style={{ fontSize: 8, color: SLATE }}>Signed: {input.managerSignedAtManila}</Text>
          </View>
        </View>
        <Hr />

        <Text style={styles.h1}>ACKNOWLEDGMENT</Text>
        <Text style={styles.bold}>REPUBLIC OF THE PHILIPPINES )</Text>
        <Text>______________________________ ) S.S.</Text>
        <Text style={[styles.p, { marginTop: 8 }]}>BEFORE ME, a Notary Public for and in the above jurisdiction, personally appeared:</Text>
        <View style={styles.table}>
          <View style={styles.trow}>
            <Text style={styles.thCell}>Name</Text>
            <Text style={styles.thCell}>Government ID</Text>
            <Text style={styles.tdCellLast}>Date/Place Issued</Text>
          </View>
          <View style={styles.trow}>
            <Text style={styles.tdCell}>{od.name}</Text>
            <Text style={styles.tdCell}>{input.ownerIdTypeLabel} No. {input.ownerIdNumber}</Text>
            <Text style={styles.tdCellLast}>{input.ownerIdIssuedDate || "____________________"}</Text>
          </View>
          <View style={styles.trowLast}>
            <Text style={styles.tdCell}>{COMPANY_SIGNATORY.name}</Text>
            <Text style={styles.tdCell}>{input.managerIdTypeLabel} No. {input.managerIdNumber}</Text>
            <Text style={styles.tdCellLast}>{input.managerIdIssuedDate}</Text>
          </View>
        </View>
        <Text style={styles.p}>
          Known to me and known to be the same persons who executed the foregoing Property Management Agreement, and they
          acknowledged to me that the same is their free and voluntary act and deed.
        </Text>
        <Text style={[styles.bold, { marginTop: 10 }]}>NOTARY PUBLIC</Text>
        <Text style={{ marginTop: 4 }}>Doc. No. _____</Text>
        <Text>Page No. _____</Text>
        <Text>Book No. _____</Text>
        <Text>Series of {new Date().getFullYear()}.</Text>
        <Footer />
      </Page>

      {/* ── Annex A ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Text style={styles.annexTitle}>ANNEX &#x201C;A&#x201D; &#x2014; SERVICE FEES</Text>
        <View style={styles.table}>
          <View style={styles.trow}>
            <Text style={styles.thCell}>Service</Text>
            <Text style={styles.tdCellLast}>Fee</Text>
          </View>
          {[
            ["Full Property Management", "One (1) month’s gross rent, or a pro-rated amount based on gross rent, plus a management fee of five percent (5%) of monthly gross rent, exclusive of applicable taxes"],
            ["Tenant Hunting Only", "One (1) month’s gross rent or as otherwise agreed"],
            ["Short-Term / Monthly Leasing", "Facilitation fee and/or prorated commission as agreed"],
            ["Condotel Management", "Twenty Percent (20%) to Thirty Percent (30%) of gross booking revenue"],
            ["Lease Renewal", "Renewal commission as agreed"],
            ["Lease Extension", "Twenty Percent (20%) of the extension rental amount or as agreed"],
            ["Other Services", "Based on separate written quotation and approval"],
          ].map(([s, f], i, arr) => (
            <View key={s} style={i === arr.length - 1 ? styles.trowLast : styles.trow}>
              <Text style={styles.tdCell}>{s}</Text>
              <Text style={styles.tdCellLast}>{f}</Text>
            </View>
          ))}
        </View>
        <Footer />
      </Page>

      {/* ── Annex B ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Text style={styles.annexTitle}>ANNEX &#x201C;B&#x201D; &#x2014; PROPERTY INVENTORY AND TURNOVER CHECKLIST</Text>
        {!hasAnnexB ? (
          <>
            <Text style={styles.p}>
              This checklist is to be completed and signed in person by the Owner and the Manager (or their
              representatives) at the time of physical property turnover. It is intentionally left blank in this
              electronically signed Agreement.
            </Text>
            <Field label="Property Owner:" value={od.name} />
            <Field label="Condominium:" value={pd.condo} />
            <Field label="Unit Number:" value={pd.unit} />
            <Field label="Date of Turnover:" value="" />
            <Text style={[styles.p, { marginTop: 10 }]}>Owner Signature: ______________________   Manager Signature: ______________________   Date: ______________________</Text>
          </>
        ) : (
          <>
            <Text style={styles.h2}>Keys and Access</Text>
            <View style={styles.table}>
              <View style={styles.trow}>
                <Text style={styles.thCell}>Item</Text>
                <Text style={styles.thCell}>Quantity</Text>
                <Text style={styles.tdCellLast}>Remarks</Text>
              </View>
              {KEY_ITEMS.map(([key, label], i) => {
                const v = ab?.keys?.[key];
                return (
                  <View key={key} style={i === KEY_ITEMS.length - 1 ? styles.trowLast : styles.trow}>
                    <Text style={styles.tdCell}>{label}</Text>
                    <Text style={styles.tdCell}>{v?.qty || "—"}</Text>
                    <Text style={styles.tdCellLast}>{v?.remarks || "—"}</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.h2}>Furniture</Text>
            <View style={styles.table}>
              <View style={styles.trow}>
                <Text style={styles.thCell}>Item</Text>
                <Text style={styles.thCell}>Quantity</Text>
                <Text style={styles.tdCellLast}>Condition</Text>
              </View>
              {FURNITURE_ITEMS.map(([key, label], i) => {
                const v = ab?.furniture?.[key];
                return (
                  <View key={key} style={i === FURNITURE_ITEMS.length - 1 ? styles.trowLast : styles.trow}>
                    <Text style={styles.tdCell}>{label}</Text>
                    <Text style={styles.tdCell}>{v?.qty || "—"}</Text>
                    <Text style={styles.tdCellLast}>{v?.condition || "—"}</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.h2}>Appliances</Text>
            <View style={styles.table}>
              <View style={styles.trow}>
                <Text style={styles.thCell}>Item</Text>
                <Text style={styles.thCell}>Brand</Text>
                <Text style={styles.tdCellLast}>Condition</Text>
              </View>
              {APPLIANCE_ITEMS.map(([key, label], i) => {
                const v = ab?.appliances?.[key];
                return (
                  <View key={key} style={i === APPLIANCE_ITEMS.length - 1 ? styles.trowLast : styles.trow}>
                    <Text style={styles.tdCell}>{label}</Text>
                    <Text style={styles.tdCell}>{v?.brand || "—"}</Text>
                    <Text style={styles.tdCellLast}>{v?.condition || "—"}</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.h2}>Fixtures Present</Text>
            {FIXTURE_ITEMS.map(([key, label]) => (
              <CheckItem key={key} checked={ab?.fixtures?.includes(key)} label={label} />
            ))}

            <Text style={styles.h2}>Initial Condition Report</Text>
            {CONDITION_AREAS.map(([key, label]) => (
              <Field key={key} label={`${label}:`} value={ab?.conditionReport?.[key]} />
            ))}
            <Text style={styles.p}>
              The Parties agree that photographs taken during turnover shall form part of this Inventory and shall be
              used as reference during move-out inspection.
            </Text>
            <Text style={[styles.p, { marginTop: 10 }]}>Owner Signature: ______________________   Manager Signature: ______________________   Date: ______________________</Text>
          </>
        )}
        <Footer />
      </Page>

      {/* ── Annex C ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Text style={styles.annexTitle}>ANNEX &#x201C;C&#x201D; &#x2014; OWNER AUTHORITY MATRIX</Text>

        <Text style={styles.h2}>Leasing Authority</Text>
        <Field label="Minimum Monthly Rent:" value={ac.minMonthlyRent ? `₱${ac.minMonthlyRent}` : undefined} />
        <Field label="Preferred Lease Term:" value={LEASE_TERM_LABEL[ac.leaseTerm || ""] || ac.leaseTermOther} />
        <Field label="Max Discount w/o Approval:" value={ac.maxDiscountAmount ? `₱${ac.maxDiscountAmount}` : (ac.maxDiscountPercent ? `${ac.maxDiscountPercent}%` : undefined)} />

        <Text style={styles.h2}>Repair Authority</Text>
        <Field label="Manager may approve repairs up to:" value={ac.repairLimit === "other" ? ac.repairLimitOther : (ac.repairLimit ? `₱${ac.repairLimit}` : undefined)} />
        <Text style={styles.p}>Any repair exceeding the above amount requires the Owner&#x2019;s written approval, except emergency repairs as provided in this Agreement.</Text>

        <Text style={styles.h2}>Policies</Text>
        <Field label="Pet Policy:" value={PET_LABEL[ac.petPolicy || ""]} />
        {ac.petConditions ? <Field label="Pet Conditions:" value={ac.petConditions} /> : null}
        <Field label="Smoking:" value={SMOKING_LABEL[ac.smokingPolicy || ""]} />
        <Field label="Subleasing:" value={YN_LABEL[ac.subleasing || ""]} />
        <Field label="Short-Term Rentals:" value={YN_LABEL[ac.shortTermRentals || ""]} />
        <Field label="Furnishing:" value={FURNISHING_LABEL[ac.furnishing || ""]} />

        <Text style={styles.h2}>Owner Preferences</Text>
        <Field label="Preferred Communication:" value={COMMS_LABEL[ac.preferredCommunication || ""]} />
        <Field label="Preferred Response Time:" value={RESPONSE_LABEL[ac.preferredResponseTime || ""]} />

        <Text style={styles.h2}>Owner Bank Details</Text>
        <Field label="Bank:" value={ac.bankName} />
        <Field label="Account Name:" value={ac.bankAccountName} />
        <Field label="Account Number:" value={ac.bankAccountNo} />
        <Field label="Preferred Payout:" value={payoutScheduleLabel(input.payoutDay)} />

        <Text style={styles.h2}>Special Instructions</Text>
        <Text style={styles.p}>{ac.specialInstructions || "None."}</Text>

        <Footer />
      </Page>

      {/* ── Certificate of Electronic Signature ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Text style={styles.annexTitle}>CERTIFICATE OF ELECTRONIC SIGNATURE</Text>
        <Text style={styles.p}>
          This document was executed using electronic signatures in accordance with Republic Act No. 8792
          (Electronic Commerce Act of 2000) and the Rules on Electronic Evidence (A.M. No. 01-7-01-SC). The
          electronic signatures appearing in this Agreement, together with the audit information below,
          constitute prima facie evidence of the Parties&#x2019; consent to and execution of this Agreement.
        </Text>
        <Field label="Document Reference:" value={input.referenceCode} />

        <Text style={styles.h2}>Signer 1 &#x2014; Owner</Text>
        <Field label="Name:" value={input.ownerTypedName || od.name} />
        <Field label="Email:" value={od.email} />
        <Field label="Role:" value="Property Owner" />
        <Field label="Date/Time Signed:" value={`${input.ownerSignedAtManila} (Asia/Manila)`} />
        <Field label="IP Address:" value={input.ownerSignedIp} />
        <Field label="Authentication Method:" value="Signed via secure, single-use access link sent to verified email address; signature captured via electronic signature pad" />

        <Text style={styles.h2}>Signer 2 &#x2014; Manager (All Abode Brokerage and Valuation OPC)</Text>
        <Field label="Name:" value={COMPANY_SIGNATORY.name} />
        <Field label="Title:" value={COMPANY_SIGNATORY.title} />
        <Field label="Account Email:" value={input.managerSignerEmail} />
        <Field label="Date/Time Signed:" value={`${input.managerSignedAtManila} (Asia/Manila)`} />
        <Field label="IP Address:" value={input.managerSignedIp} />
        <Field label="Authentication Method:" value="Signed by an authenticated, designated company signatory via the admin dashboard; signature captured via electronic signature pad" />
        <Footer />
      </Page>

      {/* ── Attachment: Manager Government ID ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Text style={styles.annexTitle}>ATTACHMENT &#x2014; COMPANY SIGNATORY GOVERNMENT ID</Text>
        <Field label="Name:" value={COMPANY_SIGNATORY.name} />
        <Field label="Title:" value={COMPANY_SIGNATORY.title} />
        <Field label="ID Type:" value={input.managerIdTypeLabel} />
        <Field label="ID Number:" value={input.managerIdNumber} />
        <Field label="Date Issued:" value={input.managerIdIssuedDate} />
        {input.managerIdImageDataUri ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={input.managerIdImageDataUri} style={{ width: "100%", marginTop: 12, objectFit: "contain" }} />
        ) : (
          <Text style={[styles.p, { marginTop: 12, color: SLATE }]}>ID image unavailable.</Text>
        )}
        <Footer />
      </Page>

      {/* ── Attachment: Owner Government ID ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Text style={styles.annexTitle}>ATTACHMENT &#x2014; OWNER GOVERNMENT ID</Text>
        <Field label="ID Type:" value={input.ownerIdTypeLabel} />
        <Field label="ID Number:" value={input.ownerIdNumber} />
        <Field label="Date Issued:" value={input.ownerIdIssuedDate} />
        {input.ownerIdImageDataUri ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={input.ownerIdImageDataUri} style={{ width: "100%", marginTop: 12, objectFit: "contain" }} />
        ) : (
          <Text style={[styles.p, { marginTop: 12, color: SLATE }]}>ID image unavailable.</Text>
        )}
        <Footer />
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
