import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import { recitalDateParts, BLANK, type ClauseParagraph } from "@/lib/pm/tenancy-clauses";
import {
  buildParkingClausesBeforeTables, parkingClause5Intro, buildParkingClausesAfterTables,
  parkingRecital, landlordProse, parkingWhereas,
  PARKING_DISCLAIMER,
  type ParkingClause, type ParkingTermsInput,
  type ParkingLandlordDetails, type ParkingTenantDetails,
  type ParkingScheduleRow, type ParkingBankDetails,
} from "@/lib/pm/parking-clauses";
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
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "center", marginBottom: 14 },
  p: { marginBottom: 7, textAlign: "justify" },
  center: { textAlign: "center", marginBottom: 7 },
  bold: { fontFamily: "Helvetica-Bold" },
  clause: { flexDirection: "row", marginBottom: 6 },
  clauseNo: { width: 20 },
  clauseBody: { flex: 1, textAlign: "justify" },
  numbered: { flexDirection: "row", marginBottom: 3, paddingLeft: 34 },
  numMarker: { width: 16 },
  numText: { flex: 1 },
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

function PageFooter({ landlordSig, tenantSig }: { landlordSig: string | null; tenantSig: string | null }) {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerLeft}>
        <Text style={styles.footerPage} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
        <Text style={styles.footerDisclaimer}>{PARKING_DISCLAIMER}</Text>
      </View>
      <View style={styles.signBox}>
        <Text style={styles.signBoxTitle}>PLEASE SIGN</Text>
        <View style={styles.signBoxRow}>
          <View style={[styles.signBoxCell, styles.signBoxCellLeft]}>
            <Text style={styles.signBoxLabel}>LANDLORD</Text>
            {landlordSig
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={landlordSig} style={styles.signBoxImg} />
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

function Numbered({ paras }: { paras: ClauseParagraph["numbered"] }) {
  if (!paras) return null;
  return (
    <>
      {paras.map((n) => (
        <View key={n.marker + n.text} style={styles.numbered}>
          <Text style={styles.numMarker}>{n.marker}</Text>
          <Text style={styles.numText}>{n.text}</Text>
        </View>
      ))}
    </>
  );
}

/**
 * Renders "N. TITLE. body…" hanging-indent clauses like the reference. When
 * a clause has no bold title (clauses 5 and 6), the number prefixes the
 * plain paragraph text.
 */
function Clauses({ clauses }: { clauses: ParkingClause[] }) {
  return (
    <>
      {clauses.map((c) => (
        <View key={c.no}>
          {c.paras.map((p, j) => (
            <View key={j}>
              {p.text && (
                <View style={styles.clause}>
                  <Text style={styles.clauseNo}>{j === 0 ? `${c.no}.` : " "}</Text>
                  <Text style={styles.clauseBody}>
                    {j === 0 && c.title ? <Text style={styles.bold}>{c.title} </Text> : null}
                    {p.text}
                  </Text>
                </View>
              )}
              <Numbered paras={p.numbered} />
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────

export type ParkingPdfInput = {
  id: string;
  referenceCode: string;
  agreementDate: string | null;
  agreementCity: string | null;
  landlordDetails: ParkingLandlordDetails;
  tenantDetails: ParkingTenantDetails;
  terms: ParkingTermsInput;
  paymentSchedule: ParkingScheduleRow[];
  bankDetails: ParkingBankDetails;
  tenantIdTypeLabel: string;
  tenantIdNumber: string;
  tenantIdIssuedDate?: string | null;
  tenantIdImageDataUri: string | null;
  additionalOccupantIds: { name: string; idImageDataUri: string | null }[];
  landlordIdTypeLabel: string | null;
  landlordIdNumber: string | null;
  landlordIdIssuedDate?: string | null;
  landlordIdImageDataUri: string | null;
  tenantTypedName: string;
  tenantSignatureDataUri: string;
  tenantSignedAtManila: string;
  tenantSignedIp: string;
  landlordTypedName: string;
  landlordSignatureDataUri: string;
  landlordSignedAtManila: string;
  landlordSignedIp: string;
  landlordSignedVia: "remote" | "countersign";
  countersignerEmail?: string | null;
  witnessName: string | null;
  witnessSignatureDataUri: string | null;
};

export async function renderParkingPdf(input: ParkingPdfInput): Promise<Buffer> {
  const ld = input.landlordDetails ?? {};
  const td = input.tenantDetails ?? {};
  const terms = input.terms;
  const landlordName = input.landlordTypedName || ld.name || "";
  const tenantName = input.tenantTypedName || td.name || "";
  const made = recitalDateParts(input.agreementDate);

  const Footer = () => (
    <PageFooter
      landlordSig={input.landlordSignatureDataUri || null}
      tenantSig={input.tenantSignatureDataUri || null}
    />
  );

  const doc = (
    <Document>
      {/* Main contract body — flows continuously; don't hardcode page breaks. */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.title}>PARKING SPACE RENTAL AGREEMENT</Text>

        <Text style={styles.center}>KNOW ALL MEN BY THESE PRESENTS:</Text>
        <Text style={styles.p}>{parkingRecital(input.agreementDate, input.agreementCity)}</Text>
        <Text style={styles.p}>{landlordProse(ld)}</Text>
        <Text style={styles.center}>- and -</Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>{td.name?.trim() || BLANK},</Text>
          {" "}Filipino, of legal age, with residential address at {td.address?.trim() || BLANK}, hereinafter
          referred to as TENANT.
        </Text>
        <Text style={styles.center}>WITNESSETH THAT:</Text>
        <Text style={styles.p}>{parkingWhereas(terms.parkingDetails)}</Text>

        <Clauses clauses={buildParkingClausesBeforeTables(terms)} />
        <Clauses clauses={[parkingClause5Intro(terms, input.bankDetails)]} />

        {/* Bank details table (clause 5) */}
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

        {/* Payment schedule table (4 columns per the reference) */}
        <View style={styles.table}>
          <View style={styles.trow}>
            <Text style={[styles.thCell, { width: 88 }]}>DATE DUE</Text>
            <Text style={[styles.thCell, { width: 78 }]}>AMOUNT</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>BANK/BRANCH</Text>
            <Text style={[styles.tdCellLast, styles.bold, { flex: 1.2 }]}>COVERAGE</Text>
          </View>
          {input.paymentSchedule.map((r, i) => (
            <View key={i} style={i === input.paymentSchedule.length - 1 ? styles.trowLast : styles.trow}>
              <Text style={[styles.tdCell, { width: 88 }]}>{r.dueDate || " "}</Text>
              <Text style={[styles.tdCell, { width: 78 }]}>{r.amount || " "}</Text>
              <Text style={[styles.tdCell, { flex: 1 }]}>{r.bankBranch || " "}</Text>
              <Text style={[styles.tdCellLast, { flex: 1.2 }]}>{r.coverage || " "}</Text>
            </View>
          ))}
        </View>

        <Clauses clauses={buildParkingClausesAfterTables(terms)} />

        <Text style={[styles.p, { marginTop: 10 }]}>
          IN WITNESS WHEREOF, the parties hereto have signed this instrument on the day, year, and place
          hereinbefore mentioned.
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }} wrap={false}>
          <View style={{ width: "44%" }}>
            {input.landlordSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.landlordSignatureDataUri} style={styles.sigImg} />
              : <View style={{ height: 46 }} />}
            <View style={[styles.sigLine, { width: "100%" }]} />
            <Text style={styles.bold}>LANDLORD</Text>
            <Text>Name: {landlordName || BLANK}</Text>
            {input.landlordSignedAtManila ? <Text style={styles.meta}>Signed: {input.landlordSignedAtManila}</Text> : null}
          </View>
          <View style={{ width: "44%" }}>
            {input.tenantSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.tenantSignatureDataUri} style={styles.sigImg} />
              : <View style={{ height: 46 }} />}
            <View style={[styles.sigLine, { width: "100%" }]} />
            <Text style={styles.bold}>{tenantName || "TENANT"}</Text>
            <Text>TENANT</Text>
            {input.tenantSignedAtManila ? <Text style={styles.meta}>Signed: {input.tenantSignedAtManila}</Text> : null}
          </View>
        </View>

        {input.witnessSignatureDataUri && input.witnessName && (
          <View style={{ marginTop: 16, width: "44%" }} wrap={false}>
            <Text style={styles.meta}>Witnessed by:</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={input.witnessSignatureDataUri} style={[styles.sigImg, { height: 30 }]} />
            <View style={[styles.sigLine, { width: "100%" }]} />
            <Text>{input.witnessName}</Text>
          </View>
        )}
      </Page>

      {/* ── COPY OF Valid IDs ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.annexTitle}>COPY OF Valid IDs</Text>

        <Text style={styles.idSectionLabel}>LANDLORD</Text>
        {input.landlordIdImageDataUri ? (
          <>
            <Text style={styles.meta}>
              {input.landlordIdTypeLabel} No. {input.landlordIdNumber}
              {input.landlordIdIssuedDate ? ` · Issued ${input.landlordIdIssuedDate}` : ""}
            </Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={input.landlordIdImageDataUri} style={{ width: 320, maxHeight: 220, objectFit: "contain", marginTop: 6, alignSelf: "flex-start" }} />
          </>
        ) : (
          <View style={{ height: 200 }}>
            {input.landlordSignedVia === "countersign" ? (
              <Text style={styles.meta}>Signed by an authorized All Abode signatory — landlord ID on file.</Text>
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

        {input.additionalOccupantIds.map((occupant, i) => (
          <View key={i} style={{ marginTop: 16 }} wrap={false}>
            <Text style={styles.meta}>{occupant.name}</Text>
            {occupant.idImageDataUri ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={occupant.idImageDataUri} style={{ width: 320, maxHeight: 220, objectFit: "contain", marginTop: 6, alignSelf: "flex-start" }} />
            ) : (
              <Text style={styles.meta}>ID image unavailable.</Text>
            )}
          </View>
        ))}
      </Page>

      {/* ── Acknowledgement (notarial portions stay blank — no notary in this flow) ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.annexTitle}>ACKNOWLEDGEMENT</Text>

        <Text style={{ marginTop: 10 }}>REPUBLIC OF THE PHILIPPINES)</Text>
        <Text>______________________________   ) S.S.</Text>
        <Text style={[styles.p, { marginTop: 10 }]}>
          BEFORE ME, a Notary Public for and in ______________ City this ___ day of ____________,{" "}
          {made?.year ?? new Date().getFullYear()}, personally came and appeared the following:
        </Text>

        <View style={styles.table}>
          <View style={styles.trow}>
            <Text style={[styles.thCell, { flex: 1.3 }]}>NAME</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>ID NUMBER</Text>
            <Text style={[styles.tdCellLast, styles.bold, { flex: 1 }]}>ISSUED DATE/PLACE</Text>
          </View>
          {[
            [landlordName, input.landlordIdNumber ? `${input.landlordIdTypeLabel} — ${input.landlordIdNumber}` : "", input.landlordIdIssuedDate ?? ""],
            [tenantName, input.tenantIdNumber ? `${input.tenantIdTypeLabel} — ${input.tenantIdNumber}` : "", input.tenantIdIssuedDate ?? ""],
          ].map(([name, num, issued], i, arr) => (
            <View key={i} style={i === arr.length - 1 ? styles.trowLast : styles.trow}>
              <Text style={[styles.tdCell, { flex: 1.3 }]}>{name || " "}</Text>
              <Text style={[styles.tdCell, { flex: 1 }]}>{num || " "}</Text>
              <Text style={[styles.tdCellLast, { flex: 1 }]}>{issued || " "}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.p}>
          Known to me and to me known to be the same persons who executed the foregoing instrument and acknowledged
          to me that the same is their free and voluntary act and deed.
        </Text>
        <Text style={styles.p}>
          This Instrument, consisting of ____ page/s, including the page on which this acknowledgement is written,
          has been signed on each and every page thereof by the concerned parties and their witnesses, and sealed
          with my notarial seal.
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }} wrap={false}>
          <View style={{ width: "44%" }}>
            <Text style={styles.bold}>By: LANDLORD</Text>
            {input.landlordSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.landlordSignatureDataUri} style={[styles.sigImg, { width: 130, height: 36 }]} />
              : <View style={{ height: 36 }} />}
            <View style={[styles.sigLine, { width: "100%" }]} />
            <Text style={styles.meta}>{landlordName || " "}</Text>
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
        <Text>Doc. No. _____</Text>
        <Text>Page No. _____</Text>
        <Text>Book No. _____</Text>
        <Text>Series of {made?.year ?? new Date().getFullYear()}</Text>
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

        <Text style={[styles.bold, { marginTop: 10, marginBottom: 4, color: NAVY }]}>Signer 2 — Landlord</Text>
        <Text style={styles.p}><Text style={styles.bold}>Name: </Text>{landlordName}</Text>
        <Text style={styles.p}><Text style={styles.bold}>Date/Time Signed: </Text>{input.landlordSignedAtManila} (Asia/Manila)</Text>
        <Text style={styles.p}><Text style={styles.bold}>IP Address: </Text>{input.landlordSignedIp}</Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Authentication Method: </Text>
          {input.landlordSignedVia === "remote"
            ? "Signed via secure, single-use access link sent by All Abode; signature captured via electronic signature pad"
            : `Signed on the Landlord's behalf by an authenticated, designated All Abode signatory via the admin dashboard${input.countersignerEmail ? ` (${input.countersignerEmail})` : ""}; signature captured via electronic signature pad`}
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
