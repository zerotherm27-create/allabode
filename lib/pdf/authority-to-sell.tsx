import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import { COMPANY_SIGNATORY } from "@/lib/pm/company-signatory";
import { PageContactRow } from "@/lib/pdf/contact-icons";
import {
  ATS_DISCLAIMER, BROKER, atsIntro, buildAtsSections, isSafeSignatureDataUrl,
  type AtsOwnerDetails, type AtsPropertyDetails, type AtsSaleTerms,
} from "@/lib/pm/authority-to-sell-clauses";

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

// Same house style as the PM / tenancy / parking agreement PDFs: per-page logo
// header + disclaimer / "PLEASE SIGN" footer on every page.
const styles = StyleSheet.create({
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
  bullet: { width: 12 },
  checkBox: { width: 9, height: 9, borderWidth: 0.75, borderColor: INK, marginRight: 5, marginTop: 1 },
  checkBoxFilled: { width: 9, height: 9, backgroundColor: NAVY, marginRight: 5, marginTop: 1, alignItems: "center", justifyContent: "center" },
  checkMark: { color: "white", fontSize: 6 },
  sigBlock: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  sigCol: { width: "47%" },
  sigImg: { width: 160, height: 50, objectFit: "contain", marginTop: 4, marginBottom: 2 },
  sigLine: { borderBottomWidth: 0.75, borderBottomColor: INK, height: 50, marginTop: 4, marginBottom: 2 },
  witnessLine: { borderBottomWidth: 0.75, borderBottomColor: INK, height: 22, marginTop: 4 },
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

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

function Hr() { return <View style={styles.hr} />; }

function PageFooter({ ownerSig, brokerSig }: { ownerSig: string | null; brokerSig: string | null }) {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerLeft}>
        <Text style={styles.footerPage} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
        <Text style={styles.footerDisclaimer}>{ATS_DISCLAIMER}</Text>
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
            <Text style={styles.signBoxLabel}>BROKER</Text>
            {brokerSig
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={brokerSig} style={styles.signBoxImg} />
              : <View style={styles.signBoxBlank} />}
          </View>
        </View>
      </View>
    </View>
  );
}

export type AuthorityToSellPdfInput = {
  id: string;
  referenceCode: string;
  executionDate: string | null;
  ownerDetails: AtsOwnerDetails;
  propertyDetails: AtsPropertyDetails;
  saleTerms: AtsSaleTerms;
  ownerIdTypeLabel: string;
  ownerIdNumber: string;
  ownerIdIssuedDate?: string | null;
  ownerIdImageDataUri: string | null;
  brokerIdTypeLabel: string;
  brokerIdNumber: string;
  brokerIdIssuedDate: string;
  brokerIdImageDataUri: string | null;
  ownerTypedName: string;
  ownerSignatureDataUri: string;
  ownerSignedAtManila: string;
  ownerSignedIp: string;
  brokerSignatureDataUri: string;
  brokerSignedAtManila: string;
  brokerSignedIp: string;
  brokerSignerEmail: string;
};

export async function renderAuthorityToSellPdf(raw: AuthorityToSellPdfInput): Promise<Buffer> {
  // Never hand react-pdf anything but an inline image: it fetches arbitrary URLs.
  const inlineOnly = (v: string | null) => (v && v.startsWith("data:image/") ? v : null);
  const input: AuthorityToSellPdfInput = {
    ...raw,
    ownerSignatureDataUri: isSafeSignatureDataUrl(raw.ownerSignatureDataUri) ? raw.ownerSignatureDataUri : "",
    brokerSignatureDataUri: isSafeSignatureDataUrl(raw.brokerSignatureDataUri) ? raw.brokerSignatureDataUri : "",
    ownerIdImageDataUri: inlineOnly(raw.ownerIdImageDataUri),
    brokerIdImageDataUri: inlineOnly(raw.brokerIdImageDataUri),
  };
  const od = input.ownerDetails;
  const sections = buildAtsSections(input.propertyDetails, input.saleTerms);
  const Footer = () => (
    <PageFooter ownerSig={input.ownerSignatureDataUri || null} brokerSig={input.brokerSignatureDataUri || null} />
  );

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Text style={[styles.title, { marginBottom: 14 }]}>AUTHORITY TO SELL</Text>
        <Text style={styles.p}>{atsIntro(input.executionDate, input.saleTerms.executionPlace)}</Text>

        <Text style={styles.h2} minPresenceAhead={50}>OWNER / SELLER</Text>
        <Field label="Name:" value={od.name} />
        <Field label="Address:" value={od.address} />
        <Field label="Contact No.:" value={od.contact} />
        <Text style={[styles.p, { textAlign: "center" }]}>&#x2014; and &#x2014;</Text>

        <Text style={styles.h2} minPresenceAhead={50}>BROKER</Text>
        <Field label="Name:" value={BROKER.name} />
        <Field label="PRC License No.:" value={BROKER.prcLicenseNo} />
        <Field label="PTR No.:" value={BROKER.ptrNo} />
        <Field label="DHSUD/HLURB Reg. No.:" value={BROKER.dhsudRegNo} />
        <Field label="Address:" value={BROKER.address} />
        <Field label="Contact No.:" value={BROKER.contactNo} />

        {sections.map((s) => (
          <View key={s.heading}>
            <Text style={styles.h1} minPresenceAhead={50}>{s.heading}</Text>
            {s.blocks.map((b, i) => {
              if (b.type === "p") return <Text key={i} style={styles.p}>{b.text}</Text>;
              if (b.type === "bullets") {
                return (
                  <View key={i} style={{ marginBottom: 4 }}>
                    {b.items.map((it) => (
                      <View key={it} style={styles.listItem}>
                        <Text style={styles.bullet}>&#x2022;</Text>
                        <Text style={{ flex: 1 }}>{it}</Text>
                      </View>
                    ))}
                  </View>
                );
              }
              return (
                <View key={i} style={{ marginBottom: 4 }}>
                  {b.items.map((it) => (
                    <View key={it.label} style={{ marginBottom: 4 }}>
                      <View style={styles.listItem}>
                        <Check checked={it.checked} />
                        <Text style={it.body ? styles.bold : undefined}>{it.label}</Text>
                      </View>
                      {it.body ? <Text style={[styles.p, { marginLeft: 14 }]}>{it.body}</Text> : null}
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        ))}

        <View wrap={false}>
          <View style={styles.sigBlock}>
            <View style={styles.sigCol}>
              <Text style={styles.bold}>OWNER / SELLER</Text>
              {input.ownerSignatureDataUri
                // eslint-disable-next-line jsx-a11y/alt-text
                ? <Image src={input.ownerSignatureDataUri} style={styles.sigImg} />
                : <View style={styles.sigLine} />}
              <Text>{input.ownerTypedName || od.name}</Text>
              <Text style={{ fontSize: 8, color: SLATE }}>Signed: {input.ownerSignedAtManila}</Text>
            </View>
            <View style={styles.sigCol}>
              <Text style={styles.bold}>BROKER</Text>
              {input.brokerSignatureDataUri
                // eslint-disable-next-line jsx-a11y/alt-text
                ? <Image src={input.brokerSignatureDataUri} style={styles.sigImg} />
                : <View style={styles.sigLine} />}
              <Text>{BROKER.signatoryName}</Text>
              <Text style={{ fontSize: 8, color: SLATE }}>Signed: {input.brokerSignedAtManila}</Text>
            </View>
          </View>
          <Text style={[styles.h2, { marginTop: 14 }]}>Witness/es</Text>
          <View style={styles.sigBlock}>
            <View style={styles.sigCol}><View style={styles.witnessLine} /></View>
            <View style={styles.sigCol}><View style={styles.witnessLine} /></View>
          </View>
        </View>
        <Hr />

        <Text style={styles.h1} minPresenceAhead={50}>ACKNOWLEDGMENT</Text>
        <Text style={styles.bold}>REPUBLIC OF THE PHILIPPINES )</Text>
        <Text>______________________________ ) S.S.</Text>
        <Text style={[styles.p, { marginTop: 8 }]}>
          BEFORE ME, a Notary Public, this _____ day of ______________, personally appeared:
        </Text>
        <View style={styles.table}>
          <View style={styles.trow}>
            <Text style={styles.thCell}>Name</Text>
            <Text style={styles.thCell}>ID No.</Text>
            <Text style={styles.tdCellLast}>Date/Place Issued</Text>
          </View>
          <View style={styles.trow}>
            <Text style={styles.tdCell}>{od.name}</Text>
            <Text style={styles.tdCell}>{input.ownerIdTypeLabel} No. {input.ownerIdNumber}</Text>
            <Text style={styles.tdCellLast}>{input.ownerIdIssuedDate || "____________________"}</Text>
          </View>
          <View style={styles.trowLast}>
            <Text style={styles.tdCell}>{COMPANY_SIGNATORY.name}</Text>
            <Text style={styles.tdCell}>{input.brokerIdTypeLabel} No. {input.brokerIdNumber}</Text>
            <Text style={styles.tdCellLast}>{input.brokerIdIssuedDate}</Text>
          </View>
        </View>
        <Text style={styles.p}>
          Known to me and to me known to be the same persons who executed this instrument and acknowledged that the same
          is their free and voluntary act.
        </Text>
        <Text style={styles.p}>WITNESS MY HAND AND SEAL.</Text>
        <Text style={[styles.bold, { marginTop: 6 }]}>Notary Public</Text>
        <Text style={{ marginTop: 4 }}>Doc. No. _____</Text>
        <Text>Page No. _____</Text>
        <Text>Book No. _____</Text>
        <Text>Series of {new Date().getFullYear()}.</Text>
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

        <Text style={styles.h2} minPresenceAhead={50}>Signer 1 &#x2014; Owner / Seller</Text>
        <Field label="Name:" value={input.ownerTypedName || od.name} />
        <Field label="Email:" value={od.email} />
        <Field label="Role:" value="Owner / Seller" />
        <Field label="Date/Time Signed:" value={`${input.ownerSignedAtManila} (Asia/Manila)`} />
        <Field label="IP Address:" value={input.ownerSignedIp} />
        <Field label="Authentication Method:" value="Signed via secure, single-use access link sent to verified email address; signature captured via electronic signature pad" />

        <Text style={styles.h2} minPresenceAhead={50}>Signer 2 &#x2014; Broker</Text>
        <Field label="Name:" value={BROKER.signatoryName} />
        <Field label="PRC License No.:" value={BROKER.prcLicenseNo} />
        <Field label="Account Email:" value={input.brokerSignerEmail} />
        <Field label="Date/Time Signed:" value={`${input.brokerSignedAtManila} (Asia/Manila)`} />
        <Field label="IP Address:" value={input.brokerSignedIp} />
        <Field label="Authentication Method:" value="Signed by an authenticated, designated company signatory via the admin dashboard; signature captured via electronic signature pad" />
        <Footer />
      </Page>

      {/* ── Attachments: Government IDs ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Text style={styles.annexTitle}>ATTACHMENT &#x2014; BROKER GOVERNMENT ID</Text>
        <Field label="Name:" value={BROKER.signatoryName} />
        <Field label="ID Type:" value={input.brokerIdTypeLabel} />
        <Field label="ID Number:" value={input.brokerIdNumber} />
        <Field label="Date Issued:" value={input.brokerIdIssuedDate} />
        {input.brokerIdImageDataUri ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={input.brokerIdImageDataUri} style={{ width: 250, maxHeight: 155, marginTop: 8, objectFit: "contain", alignSelf: "flex-start" }} />
        ) : (
          <Text style={[styles.p, { marginTop: 12, color: SLATE }]}>ID image unavailable.</Text>
        )}

        <Text style={[styles.annexTitle, { marginTop: 18 }]} minPresenceAhead={120}>ATTACHMENT &#x2014; OWNER GOVERNMENT ID</Text>
        <Field label="ID Type:" value={input.ownerIdTypeLabel} />
        <Field label="ID Number:" value={input.ownerIdNumber} />
        <Field label="Date Issued:" value={input.ownerIdIssuedDate} />
        {input.ownerIdImageDataUri ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={input.ownerIdImageDataUri} style={{ width: 250, maxHeight: 155, marginTop: 8, objectFit: "contain", alignSelf: "flex-start" }} />
        ) : (
          <Text style={[styles.p, { marginTop: 12, color: SLATE }]}>ID image unavailable.</Text>
        )}
        <Footer />
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
