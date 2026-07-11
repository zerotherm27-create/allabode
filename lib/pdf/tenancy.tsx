import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import {
  buildTenancyClausesBeforeTables, buildTenancyClausesAfterTables,
  recitalDateParts, BLANK,
  TENANCY_DISCLAIMER,
  TENANCY_REMINDERS, TENANCY_INTERPRETATION, DEFAULT_PAYMENT_PARTICULARS,
  type TenancyClause, type ClauseParagraph, type TenancyTermsInput,
  type TenancyLandlordDetails, type TenancyTenantDetails,
  type PaymentScheduleRow, type InventoryRow, type TenancyBankDetails,
} from "@/lib/pm/tenancy-clauses";
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
  // Extra top/bottom padding vs the PMA PDF: every page carries the fixed
  // logo header and the disclaimer + "PLEASE SIGN" initials footer, per the
  // reference document.
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
  sigLabelCol: { width: 150 },
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

/**
 * Every page's footer per the reference: "Page N" + disclaimer on the left,
 * and the "PLEASE SIGN" initials box (LANDLORD | TENANT) bottom right —
 * stamped with small signature thumbnails once each party has signed.
 */
function PageFooter({ landlordSig, tenantSig }: { landlordSig: string | null; tenantSig: string | null }) {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerLeft}>
        <Text style={styles.footerPage} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
        <Text style={styles.footerDisclaimer}>{TENANCY_DISCLAIMER}</Text>
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
        <View key={n.marker} style={styles.numbered}>
          <Text style={styles.numMarker}>{n.marker}</Text>
          <Text style={styles.numText}>{n.text}</Text>
        </View>
      ))}
    </>
  );
}

function Clauses({ clauses }: { clauses: TenancyClause[] }) {
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

function PartyBlock({ name, idNumber, address }: { name?: string; idNumber?: string; address?: string }) {
  return (
    <>
      <View style={styles.partyRow}>
        <Text style={styles.partyLabel}>NAME</Text>
        <Text style={styles.partyValue}>: {name || BLANK}</Text>
      </View>
      <View style={styles.partyRow}>
        <Text style={styles.partyLabel}>ID NUMBER</Text>
        <Text style={styles.partyValue}>: {idNumber || BLANK}</Text>
      </View>
      <View style={styles.partyRow}>
        <Text style={styles.partyLabel}>ADDRESS</Text>
        <Text style={styles.partyValue}>: {address || BLANK}</Text>
      </View>
    </>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────

export type TenancyPdfInput = {
  id: string;
  referenceCode: string;
  agreementDate: string | null;
  landlordDetails: TenancyLandlordDetails;
  tenantDetails: TenancyTenantDetails;
  terms: TenancyTermsInput;
  paymentSchedule: PaymentScheduleRow[];
  bankDetails: TenancyBankDetails;
  inventory: InventoryRow[];
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

export async function renderTenancyPdf(input: TenancyPdfInput): Promise<Buffer> {
  const ld = input.landlordDetails ?? {};
  const td = input.tenantDetails ?? {};
  const terms = input.terms;
  const made = recitalDateParts(input.agreementDate);
  const landlordName = input.landlordTypedName || ld.name || "";
  const tenantName = input.tenantTypedName || td.name || "";

  const schedule: PaymentScheduleRow[] = input.paymentSchedule?.length
    ? input.paymentSchedule
    : DEFAULT_PAYMENT_PARTICULARS.map((particulars, i) => ({
        dueDate: i < 2 ? "Immediately" : "",
        amount: "",
        particulars,
      }));

  // Pad the inventory table with blank rows like the printed form.
  const inventoryRows: InventoryRow[] = [...(input.inventory ?? [])];
  while (inventoryRows.length < 16) inventoryRows.push({ quantity: "", particulars: "", brand: "", remarks: "" });

  const Footer = () => (
    <PageFooter
      landlordSig={input.landlordSignatureDataUri || null}
      tenantSig={input.tenantSignatureDataUri || null}
    />
  );

  const doc = (
    <Document>
      {/* Main contract body — flows continuously across as many pages as it
          needs (same rule as the PMA PDF: don't hardcode page boundaries). */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.title}>TENANCY AGREEMENT</Text>

        <Text style={styles.p}>
          AN AGREEMENT made on the {made ? `${made.day} of ${made.month} ${made.year}` : "___ of ______ 20__"}.
        </Text>
        <Text style={[styles.center, styles.bold, { marginTop: 6 }]}>BETWEEN</Text>
        <PartyBlock name={ld.name} idNumber={ld.idNumber} address={ld.address} />
        <Text style={[styles.p, { marginTop: 8 }]}>
          (hereinafter called &quot;the Landlord&quot; which expression shall where the context so admits include the
          person entitled for the time being to the reversion immediately expectant on the term hereby created) of the
          one part
        </Text>
        <Text style={[styles.center, styles.bold]}>AND</Text>
        <PartyBlock name={td.name} idNumber={td.idNumber} address={td.address} />
        <Text style={[styles.p, { marginTop: 8 }]}>
          (hereinafter called &quot;the Tenant&quot; which expression shall where the context so admits include the
          Tenant&#x2019;s successors and assigns) of the other part.
        </Text>
        <Text style={[styles.p, { marginTop: 4 }]}>NOW IT IS HEREBY AGREED as follows:</Text>

        <Clauses clauses={buildTenancyClausesBeforeTables(terms)} />

        {/* Bank details table (clause 3.3 refers to it) */}
        <View style={styles.table}>
          {([
            ["Name", input.bankDetails.name],
            ["Bank", input.bankDetails.bank],
            ["Branch", input.bankDetails.branch],
            ["Account number", input.bankDetails.accountNumber],
          ] as const).map(([label, value], i, arr) => (
            <View key={label} style={i === arr.length - 1 ? styles.trowLast : styles.trow}>
              <Text style={[styles.tdCell, { width: 120 }]}>{label}</Text>
              <Text style={[styles.tdCellLast, { flex: 1 }]}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Payment schedule table */}
        <View style={styles.table}>
          <View style={styles.trow}>
            <Text style={[styles.thCell, { width: 110 }]}>Due Date</Text>
            <Text style={[styles.thCell, { width: 90 }]}>Amount</Text>
            <Text style={[styles.tdCellLast, styles.bold, { flex: 1 }]}>Particulars</Text>
          </View>
          {schedule.map((r, i) => (
            <View key={i} style={i === schedule.length - 1 ? styles.trowLast : styles.trow}>
              <Text style={[styles.tdCell, { width: 110 }]}>{r.dueDate || " "}</Text>
              <Text style={[styles.tdCell, { width: 90 }]}>{r.amount || " "}</Text>
              <Text style={[styles.tdCellLast, { flex: 1 }]}>{r.particulars || " "}</Text>
            </View>
          ))}
        </View>

        <Clauses clauses={buildTenancyClausesAfterTables(terms)} />

        {TENANCY_INTERPRETATION.map((t, i) => (
          <Text key={i} style={styles.p}>{t}</Text>
        ))}

        <Text style={[styles.p, { marginTop: 12 }]}>
          IN WITNESS WHEREOF the parties have hereunto set their hands as shown below.
        </Text>

        <View style={{ flexDirection: "row", marginTop: 12 }} wrap={false}>
          <Text style={styles.sigLabelCol}>SIGNED by the Landlord</Text>
          <View>
            {input.landlordSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.landlordSignatureDataUri} style={styles.sigImg} />
              : <View style={[styles.sigLine, { height: 46 }]} />}
            <View style={styles.sigLine} />
            <Text>{landlordName || " "}</Text>
            {input.landlordSignedAtManila ? <Text style={styles.meta}>Signed: {input.landlordSignedAtManila}</Text> : null}
          </View>
        </View>

        <View style={{ flexDirection: "row", marginTop: 14 }} wrap={false}>
          <Text style={styles.sigLabelCol}>In the presence of:</Text>
          <View>
            {input.witnessSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.witnessSignatureDataUri} style={[styles.sigImg, { width: 130, height: 24 }]} />
              : <View style={[styles.sigLine, { height: 24 }]} />}
            {input.witnessName ? <Text>{input.witnessName}</Text> : null}
          </View>
        </View>

        <View style={{ flexDirection: "row", marginTop: 14 }} wrap={false}>
          <Text style={styles.sigLabelCol}>SIGNED by the Tenant</Text>
          <View>
            {input.tenantSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.tenantSignatureDataUri} style={styles.sigImg} />
              : <View style={[styles.sigLine, { height: 46 }]} />}
            <View style={styles.sigLine} />
            <Text>{tenantName || " "}</Text>
            {input.tenantSignedAtManila ? <Text style={styles.meta}>Signed: {input.tenantSignedAtManila}</Text> : null}
          </View>
        </View>
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
          <Text style={styles.meta}>
            {input.landlordSignedVia === "countersign"
              ? "Signed by an authorized All Abode signatory — landlord ID on file."
              : "ID image unavailable."}
          </Text>
        )}

        <Text style={[styles.idSectionLabel, { marginTop: 24 }]}>TENANTS</Text>
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

        <Text style={{ marginTop: 10 }}>Republic of the Philippines)</Text>
        <Text>______________________) S.S</Text>
        <Text style={[styles.p, { marginTop: 10 }]}>BEFORE ME, personally appeared:</Text>

        <View style={styles.table}>
          <View style={styles.trow}>
            <Text style={[styles.thCell, { flex: 1.4, textAlign: "center" }]}>Name</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: "center" }]}>Type of ID</Text>
            <Text style={[styles.tdCellLast, styles.bold, { flex: 1, textAlign: "center" }]}>ID Number</Text>
          </View>
          {[
            [landlordName, input.landlordIdTypeLabel ?? "", input.landlordIdNumber ?? ""],
            [tenantName, input.tenantIdTypeLabel, input.tenantIdNumber],
            ["", "", ""],
            ["", "", ""],
            ["", "", ""],
          ].map(([name, type, num], i, arr) => (
            <View key={i} style={i === arr.length - 1 ? styles.trowLast : styles.trow}>
              <Text style={[styles.tdCell, { flex: 1.4 }]}>{name || " "}</Text>
              <Text style={[styles.tdCell, { flex: 1, textAlign: "center" }]}>{type || " "}</Text>
              <Text style={[styles.tdCellLast, { flex: 1, textAlign: "center" }]}>{num || " "}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.p}>
          Known to me and to me known to be the same persons who executed the foregoing instrument and acknowledged
          to me that the same is their free and voluntary act and deed.
        </Text>
        <Text style={styles.p}>
          This Instrument consisting of ____ page/s, including the page on which this acknowledgement is written, has
          been signed on each and every page thereof by the concerned partied and their witnesses, and sealed with my
          notarial seal.
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 18 }}>
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

        <Text style={[styles.p, { marginTop: 22 }]}>
          WITNESS MY HAND AND SEAL, on the date and place first above written.
        </Text>
        <Text>Doc. No ________:</Text>
        <Text>Page No ________:</Text>
        <Text>Book No ________:</Text>
        <Text>Series of {new Date().getFullYear()}.</Text>
      </Page>

      {/* ── Inventory list + reminders ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.annexTitle}>INVENTORY LIST</Text>
        <Text style={[styles.center, { marginBottom: 8 }]}>
          {terms.propertyDetails?.buildingName || "Building"} - {terms.propertyDetails?.floorUnit || "Unit No."}
        </Text>

        <View style={styles.table}>
          <View style={styles.trow}>
            <Text style={[styles.thCell, { width: 58, textAlign: "center" }]}>Quantity</Text>
            <Text style={[styles.thCell, { flex: 1.2, textAlign: "center" }]}>Particulars</Text>
            <Text style={[styles.thCell, { flex: 0.9, textAlign: "center" }]}>Brand</Text>
            <Text style={[styles.tdCellLast, styles.bold, { flex: 1.5, textAlign: "center" }]}>Remarks</Text>
          </View>
          {inventoryRows.map((r, i) => (
            <View key={i} style={i === inventoryRows.length - 1 ? styles.trowLast : styles.trow}>
              <Text style={[styles.tdCell, { width: 58, textAlign: "center" }]}>{r.quantity || " "}</Text>
              <Text style={[styles.tdCell, { flex: 1.2 }]}>{r.particulars || " "}</Text>
              <Text style={[styles.tdCell, { flex: 0.9 }]}>{r.brand || " "}</Text>
              <Text style={[styles.tdCellLast, { flex: 1.5, fontFamily: "Helvetica-Oblique" }]}>{r.remarks || " "}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.bold, { marginTop: 6, marginBottom: 4 }]}>Reminders:</Text>
        {TENANCY_REMINDERS.map((t, i) => (
          <View key={i} style={[styles.numbered, { paddingLeft: 6 }]}>
            <Text style={styles.numMarker}>{i + 1})</Text>
            <Text style={styles.numText}>{t}</Text>
          </View>
        ))}

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 18 }} wrap={false}>
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
