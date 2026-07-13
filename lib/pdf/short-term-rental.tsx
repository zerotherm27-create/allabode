import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import {
  buildStrClausesBeforeTable, buildStrClausesAfterTable, strClause61Intro,
  strRecital, strRentalRules, STR_MOVE_OUT_CHECKLIST, STR_DISCLAIMER,
  type StrClause, type StrTermsInput,
  type StrHomeownerDetails, type StrTenantDetails,
  type StrFeeItem, type StrInventoryRow, type StrBankDetails,
} from "@/lib/pm/short-term-rental-clauses";
import { BLANK, type ClauseParagraph } from "@/lib/pm/tenancy-clauses";
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
const INK = "#16202c";

const styles = StyleSheet.create({
  // Same house scaffolding as lib/pdf/tenancy.tsx: fixed logo header and
  // disclaimer + "PLEASE SIGN" initials footer on every page.
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
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "center", marginBottom: 16 },
  p: { marginBottom: 7, textAlign: "justify" },
  center: { textAlign: "center", marginBottom: 7 },
  bold: { fontFamily: "Helvetica-Bold" },
  clauseTitle: { fontFamily: "Helvetica-Bold", marginTop: 9, marginBottom: 5 },
  subClause: { flexDirection: "row", marginBottom: 6 },
  subNo: { width: 26, fontFamily: "Helvetica-Bold" },
  subBody: { flex: 1, textAlign: "justify" },
  numbered: { flexDirection: "row", marginBottom: 3, paddingLeft: 26 },
  numMarker: { width: 22 },
  numText: { flex: 1 },
  partyRow: { flexDirection: "row", marginBottom: 3, paddingLeft: 40 },
  partyLabel: { width: 110, fontFamily: "Helvetica-Bold" },
  partyValue: { flex: 1, borderBottomWidth: 0.75, borderBottomColor: INK, paddingBottom: 1 },
  table: { borderWidth: 0.75, borderColor: INK, marginTop: 6, marginBottom: 10 },
  trow: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: INK },
  trowLast: { flexDirection: "row" },
  thCell: { padding: 4, fontFamily: "Helvetica-Bold", borderRightWidth: 0.75, borderRightColor: INK },
  tdCell: { padding: 4, borderRightWidth: 0.75, borderRightColor: INK },
  tdCellLast: { padding: 4 },
  sigLine: { width: 200, borderBottomWidth: 0.75, borderBottomColor: INK },
  sigImg: { width: 160, height: 46, objectFit: "contain" },
  annexTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "center", marginBottom: 6 },
  idSectionLabel: { fontFamily: "Helvetica-Bold", borderBottomWidth: 1.5, borderBottomColor: INK, paddingBottom: 2, marginBottom: 8, marginTop: 4 },
  meta: { fontSize: 8, color: SLATE },
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

function PageFooter({ homeownerSig, tenantSig }: { homeownerSig: string | null; tenantSig: string | null }) {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerLeft}>
        <Text style={styles.footerPage} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
        <Text style={styles.footerDisclaimer}>{STR_DISCLAIMER}</Text>
      </View>
      <View style={styles.signBox}>
        <Text style={styles.signBoxTitle}>PLEASE SIGN</Text>
        <View style={styles.signBoxRow}>
          <View style={[styles.signBoxCell, styles.signBoxCellLeft]}>
            <Text style={styles.signBoxLabel}>HOMEOWNER</Text>
            {homeownerSig
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={homeownerSig} style={styles.signBoxImg} />
              : <View style={styles.signBoxBlank} />}
          </View>
          <View style={styles.signBoxCell}>
            <Text style={styles.signBoxLabel}>TENANT</Text>
            {tenantSig
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={tenantSig} style={styles.signBoxImg} />
              : <View style={styles.signBoxBlank} />}
          </View>
        </View>
      </View>
    </View>
  );
}

function Paragraph({ para }: { para: ClauseParagraph }) {
  return (
    <>
      {para.fields && para.fields.map(([label, value]) => (
        <View key={label} style={styles.partyRow}>
          <Text style={styles.partyLabel}>{label}</Text>
          <Text style={styles.partyValue}>: {value}</Text>
        </View>
      ))}
      {para.text && (
        para.sub ? (
          <View style={styles.subClause}>
            <Text style={styles.subNo}>{para.sub}</Text>
            <Text style={styles.subBody}>
              {para.subTitle ? <Text style={styles.bold}>{para.subTitle}{"\n"}</Text> : null}
              {para.text}
            </Text>
          </View>
        ) : (
          <Text style={styles.p}>{para.text}</Text>
        )
      )}
      {para.numbered && para.numbered.map((n) => (
        <View key={n.marker + n.text} style={styles.numbered}>
          <Text style={styles.numMarker}>{n.marker}</Text>
          <Text style={styles.numText}>{n.text}</Text>
        </View>
      ))}
    </>
  );
}

function Clauses({ clauses }: { clauses: StrClause[] }) {
  return (
    <>
      {clauses.map((c, i) => (
        <View key={`${c.no}-${i}`}>
          {c.title ? <Text style={styles.clauseTitle}>{c.no}. {c.title}</Text> : null}
          {c.paras.map((p, j) => <Paragraph key={j} para={p} />)}
        </View>
      ))}
    </>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────

export type StrPdfInput = {
  id: string;
  referenceCode: string;
  agreementDate: string | null;
  homeownerDetails: StrHomeownerDetails;
  tenantDetails: StrTenantDetails;
  terms: StrTermsInput;
  feeItems: StrFeeItem[];
  securityDepositAmount: number | null;
  bankDetails: StrBankDetails;
  inventory: StrInventoryRow[];
  tenantIdTypeLabel: string;
  tenantIdNumber: string;
  tenantIdIssuedDate?: string | null;
  tenantIdImageDataUri: string | null;
  homeownerIdTypeLabel: string | null;
  homeownerIdNumber: string | null;
  homeownerIdIssuedDate?: string | null;
  homeownerIdImageDataUri: string | null;
  tenantTypedName: string;
  tenantSignatureDataUri: string;
  tenantSignedAtManila: string;
  tenantSignedIp: string;
  homeownerTypedName: string;
  homeownerSignatureDataUri: string;
  homeownerSignedAtManila: string;
  homeownerSignedIp: string;
  homeownerSignedVia: "remote" | "countersign";
  countersignerEmail?: string | null;
};

export async function renderShortTermRentalPdf(input: StrPdfInput): Promise<Buffer> {
  const hd = input.homeownerDetails ?? {};
  const td = input.tenantDetails ?? {};
  const terms = input.terms;
  const homeownerName = input.homeownerTypedName || hd.name || "";
  const tenantName = input.tenantTypedName || td.name || "";
  const feeItems = input.feeItems ?? [];
  const feeTotal = feeItems.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) + (Number(input.securityDepositAmount) || 0);
  const peso = (n: number) => `Php ${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const Footer = () => (
    <PageFooter
      homeownerSig={input.homeownerSignatureDataUri || null}
      tenantSig={input.tenantSignatureDataUri || null}
    />
  );

  const doc = (
    <Document>
      {/* Main contract body — flows continuously; don't hardcode page breaks. */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.title}>SHORT TERM RENTAL AGREEMENT</Text>

        <Text style={styles.p}>{strRecital(homeownerName, tenantName)}</Text>

        <Clauses clauses={buildStrClausesBeforeTable(terms)} />

        {/* Fee table (clause 6) */}
        <View style={styles.table}>
          <View style={styles.trow}>
            <Text style={[styles.thCell, { flex: 1 }]}>Item</Text>
            <Text style={[styles.tdCellLast, styles.bold, { width: 110, textAlign: "right" }]}>Amount (PHP)</Text>
          </View>
          {feeItems.map((r, i) => (
            <View key={i} style={styles.trow}>
              <Text style={[styles.tdCell, { flex: 1 }]}>{r.label || " "}</Text>
              <Text style={[styles.tdCellLast, { width: 110, textAlign: "right" }]}>{peso(Number(r.amount) || 0)}</Text>
            </View>
          ))}
          <View style={styles.trow}>
            <Text style={[styles.tdCell, { flex: 1 }]}>Security Deposit</Text>
            <Text style={[styles.tdCellLast, { width: 110, textAlign: "right" }]}>{peso(Number(input.securityDepositAmount) || 0)}</Text>
          </View>
          <View style={styles.trowLast}>
            <Text style={[styles.tdCell, styles.bold, { flex: 1 }]}>TOTAL DUE (upon signing)</Text>
            <Text style={[styles.tdCellLast, styles.bold, { width: 110, textAlign: "right" }]}>{peso(feeTotal)}</Text>
          </View>
        </View>

        <Text style={styles.p}>{strClause61Intro(input.bankDetails)}</Text>

        {/* Bank details table (clause 6.1) */}
        <View style={styles.table}>
          {([
            ["Name", input.bankDetails.name],
            ["Bank", input.bankDetails.bank],
            ["Branch", input.bankDetails.branch],
            ["Account No.", input.bankDetails.accountNumber],
          ] as const).map(([label, value], i, arr) => (
            <View key={label} style={i === arr.length - 1 ? styles.trowLast : styles.trow}>
              <Text style={[styles.tdCell, styles.bold, { width: 110 }]}>{label}</Text>
              <Text style={[styles.tdCellLast, { flex: 1 }]}>{value}</Text>
            </View>
          ))}
        </View>

        <Clauses clauses={buildStrClausesAfterTable()} />

        <Text style={[styles.p, { marginTop: 10 }]}>
          The Parties agree to the terms of this Short Term Rental Agreement, as evidenced by the signatures set
          forth below.
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }} wrap={false}>
          <View style={{ width: "44%" }}>
            {input.homeownerSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.homeownerSignatureDataUri} style={styles.sigImg} />
              : <View style={{ height: 46 }} />}
            <View style={[styles.sigLine, { width: "100%" }]} />
            <Text style={styles.bold}>{homeownerName || BLANK}</Text>
            <Text>Homeowner</Text>
            {input.homeownerSignedAtManila ? <Text style={styles.meta}>Signed: {input.homeownerSignedAtManila}</Text> : null}
          </View>
          <View style={{ width: "44%" }}>
            {input.tenantSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.tenantSignatureDataUri} style={styles.sigImg} />
              : <View style={{ height: 46 }} />}
            <View style={[styles.sigLine, { width: "100%" }]} />
            <Text style={styles.bold}>{tenantName || BLANK}</Text>
            <Text>Tenant</Text>
            {input.tenantSignedAtManila ? <Text style={styles.meta}>Signed: {input.tenantSignedAtManila}</Text> : null}
          </View>
        </View>
      </Page>

      {/* ── COPY OF Valid IDs ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.annexTitle}>COPY OF Valid IDs</Text>

        <Text style={styles.idSectionLabel}>HOMEOWNER</Text>
        {input.homeownerIdImageDataUri ? (
          <>
            <Text style={styles.meta}>
              {input.homeownerIdTypeLabel} No. {input.homeownerIdNumber}
              {input.homeownerIdIssuedDate ? ` · Issued ${input.homeownerIdIssuedDate}` : ""}
            </Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={input.homeownerIdImageDataUri} style={{ width: 320, maxHeight: 220, objectFit: "contain", marginTop: 6, alignSelf: "flex-start" }} />
          </>
        ) : (
          <View style={{ height: 200 }}>
            {input.homeownerSignedVia === "countersign" ? (
              <Text style={styles.meta}>Signed by an authorized All Abode signatory — homeowner ID on file.</Text>
            ) : null}
          </View>
        )}

        <Text style={[styles.idSectionLabel, { marginTop: 24 }]}>TENANT</Text>
        {input.tenantIdImageDataUri ? (
          <>
            <Text style={styles.meta}>
              {input.tenantIdTypeLabel} No. {input.tenantIdNumber}
              {input.tenantIdIssuedDate ? ` · Issued ${input.tenantIdIssuedDate}` : ""}
            </Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={input.tenantIdImageDataUri} style={{ width: 320, maxHeight: 220, objectFit: "contain", marginTop: 6, alignSelf: "flex-start" }} />
          </>
        ) : (
          <Text style={styles.meta}>ID image unavailable.</Text>
        )}
      </Page>

      {/* ── Acknowledgement (notarial portions stay blank — no notary in this flow) ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.annexTitle}>ACKNOWLEDGEMENT</Text>

        <Text style={{ marginTop: 10 }}>Republic of the Philippines )</Text>
        <Text>______________________________ ) S.S</Text>
        <Text style={[styles.p, { marginTop: 10 }]}>BEFORE ME, personally appeared:</Text>

        <View style={styles.table}>
          <View style={styles.trow}>
            <Text style={[styles.thCell, { flex: 1.3 }]}>Name</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Type of ID</Text>
            <Text style={[styles.tdCellLast, styles.bold, { flex: 1 }]}>ID Number</Text>
          </View>
          {[
            [homeownerName, input.homeownerIdTypeLabel ?? "", input.homeownerIdNumber ?? ""],
            [tenantName, input.tenantIdTypeLabel ?? "", input.tenantIdNumber ?? ""],
            ["", "", ""],
            ["", "", ""],
            ["", "", ""],
          ].map(([name, type, num], i, arr) => (
            <View key={i} style={i === arr.length - 1 ? styles.trowLast : styles.trow}>
              <Text style={[styles.tdCell, { flex: 1.3 }]}>{name || " "}</Text>
              <Text style={[styles.tdCell, { flex: 1 }]}>{type || " "}</Text>
              <Text style={[styles.tdCellLast, { flex: 1 }]}>{num || " "}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.p}>
          Known to me and to me known to be the same persons who executed the foregoing instrument and acknowledged
          to me that the same is their free and voluntary act and deed.
        </Text>
        <Text style={styles.p}>
          This Instrument consisting of ____ page/s, including the page on which this acknowledgement is written,
          has been signed on each and every page thereof by the concerned parties and their witnesses, and sealed
          with my notarial seal.
        </Text>
        <Text style={styles.p}>Valid IDs are attached as Annex D (on file with the Property Manager).</Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }} wrap={false}>
          <View style={{ width: "44%" }}>
            <Text style={styles.bold}>By: HOMEOWNER</Text>
            {input.homeownerSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.homeownerSignatureDataUri} style={[styles.sigImg, { width: 130, height: 36 }]} />
              : <View style={{ height: 36 }} />}
            <View style={[styles.sigLine, { width: "100%" }]} />
            <Text style={styles.meta}>{homeownerName || " "}</Text>
          </View>
          <View style={{ width: "44%" }}>
            <Text style={styles.bold}>By: TENANT</Text>
            {input.tenantSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.tenantSignatureDataUri} style={[styles.sigImg, { width: 130, height: 36 }]} />
              : <View style={{ height: 36 }} />}
            <View style={[styles.sigLine, { width: "100%" }]} />
            <Text style={styles.meta}>{tenantName || " "}</Text>
          </View>
        </View>
        <Text style={[styles.p, { marginTop: 14 }]}>
          WITNESS MY HAND AND SEAL, on the date and place first above written.
        </Text>
        <Text>Doc. No _____:</Text>
        <Text>Page No _____:</Text>
        <Text>Book No _____:</Text>
        <Text>Series of {new Date().getFullYear()}.</Text>
      </Page>

      {/* ── Annex A — Rental Agreement Checklist ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.annexTitle}>ANNEX A — RENTAL AGREEMENT CHECKLIST</Text>
        <Text style={[styles.center, { marginBottom: 8 }]}>
          {terms.propertyDetails?.buildingName || "Building"} - {terms.propertyDetails?.unitNumber || "Unit No."}
        </Text>

        <View style={styles.table}>
          <View style={styles.trow}>
            <Text style={[styles.thCell, { width: 58, textAlign: "center" }]}>Quantity</Text>
            <Text style={[styles.thCell, { flex: 1.2, textAlign: "center" }]}>Particulars</Text>
            <Text style={[styles.thCell, { flex: 0.9, textAlign: "center" }]}>Brand</Text>
            <Text style={[styles.tdCellLast, styles.bold, { flex: 1.5, textAlign: "center" }]}>Remarks</Text>
          </View>
          {input.inventory.map((r, i) => (
            <View key={i} style={i === input.inventory.length - 1 ? styles.trowLast : styles.trow}>
              <Text style={[styles.tdCell, { width: 58, textAlign: "center" }]}>{r.quantity || " "}</Text>
              <Text style={[styles.tdCell, { flex: 1.2 }]}>{r.particulars || " "}</Text>
              <Text style={[styles.tdCell, { flex: 0.9 }]}>{r.brand || " "}</Text>
              <Text style={[styles.tdCellLast, { flex: 1.5, fontFamily: "Helvetica-Oblique" }]}>{r.remarks || " "}</Text>
            </View>
          ))}
        </View>
      </Page>

      {/* ── Annex B — Rental Rules ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.annexTitle}>ANNEX B — RENTAL RULES</Text>
        {strRentalRules(terms.garbageDisposalLocation).map((rule, i) => (
          <View key={i} style={[styles.numbered, { paddingLeft: 6 }]}>
            <Text style={styles.numMarker}>•</Text>
            <Text style={styles.numText}>{rule}</Text>
          </View>
        ))}
      </Page>

      {/* ── Annex C — Move-Out Checklist ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.annexTitle}>ANNEX C — MOVE-OUT CHECKLIST</Text>
        {STR_MOVE_OUT_CHECKLIST.map((item, i) => (
          <View key={i} style={[styles.numbered, { paddingLeft: 6 }]}>
            <Text style={styles.numMarker}>•</Text>
            <Text style={styles.numText}>{item}</Text>
          </View>
        ))}
      </Page>

      {/* ── Certificate of Electronic Signature ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.annexTitle}>CERTIFICATE OF ELECTRONIC SIGNATURE</Text>
        <Text style={styles.p}>
          This document was executed using electronic signatures in accordance with Republic Act No. 8792
          (Electronic Commerce Act of 2000) and the Rules on Electronic Evidence (A.M. No. 01-7-01-SC). The
          electronic signatures appearing in this Agreement, together with the audit information below,
          constitute prima facie evidence of the Parties&#x2019; consent to and execution of this Agreement.
        </Text>
        <Text style={styles.p}><Text style={styles.bold}>Document Reference: </Text>{input.referenceCode}</Text>

        <Text style={[styles.bold, { marginTop: 10, marginBottom: 4, color: NAVY }]}>Signer 1 — Tenant</Text>
        <Text style={styles.p}><Text style={styles.bold}>Name: </Text>{tenantName}</Text>
        <Text style={styles.p}><Text style={styles.bold}>Email: </Text>{td.email || "—"}</Text>
        <Text style={styles.p}><Text style={styles.bold}>Date/Time Signed: </Text>{input.tenantSignedAtManila} (Asia/Manila)</Text>
        <Text style={styles.p}><Text style={styles.bold}>IP Address: </Text>{input.tenantSignedIp}</Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Authentication Method: </Text>
          Signed via secure, single-use access link sent to verified email address; signature captured via electronic
          signature pad
        </Text>

        <Text style={[styles.bold, { marginTop: 10, marginBottom: 4, color: NAVY }]}>Signer 2 — Homeowner</Text>
        <Text style={styles.p}><Text style={styles.bold}>Name: </Text>{homeownerName}</Text>
        <Text style={styles.p}><Text style={styles.bold}>Date/Time Signed: </Text>{input.homeownerSignedAtManila} (Asia/Manila)</Text>
        <Text style={styles.p}><Text style={styles.bold}>IP Address: </Text>{input.homeownerSignedIp}</Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Authentication Method: </Text>
          {input.homeownerSignedVia === "remote"
            ? "Signed via secure, single-use access link sent by All Abode; signature captured via electronic signature pad"
            : `Signed on the Homeowner's behalf by an authenticated, designated All Abode signatory via the admin dashboard${input.countersignerEmail ? ` (${input.countersignerEmail})` : ""}; signature captured via electronic signature pad`}
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
