import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import {
  buildAddendumClauses, buildAddendumRecital, addendumSectionNumbers,
  addendumTitle, addendumBankIntro, addendumRoles, ADDENDUM_DISCLAIMER,
  type AddendumClause, type AddendumTermsInput,
  type AddendumLandlordDetails, type AddendumTenantDetails,
  type AddendumFeeItem, type AddendumScheduleRow, type AddendumBankDetails,
} from "@/lib/pm/addendum-clauses";
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
  // Same house scaffolding as lib/pdf/short-term-rental.tsx: fixed logo header
  // and disclaimer + "PLEASE SIGN" initials footer on every page.
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
  recitalParty: { marginBottom: 5, paddingLeft: 20, textAlign: "justify" },
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

function PageFooter({ landlordSig, tenantSig, principalLabel, counterpartyLabel }: { landlordSig: string | null; tenantSig: string | null; principalLabel: string; counterpartyLabel: string }) {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerLeft}>
        <Text style={styles.footerPage} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
        <Text style={styles.footerDisclaimer}>{ADDENDUM_DISCLAIMER}</Text>
      </View>
      <View style={styles.signBox}>
        <Text style={styles.signBoxTitle}>PLEASE SIGN</Text>
        <View style={styles.signBoxRow}>
          <View style={[styles.signBoxCell, styles.signBoxCellLeft]}>
            <Text style={styles.signBoxLabel}>{principalLabel}</Text>
            {landlordSig
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={landlordSig} style={styles.signBoxImg} />
              : <View style={styles.signBoxBlank} />}
          </View>
          <View style={styles.signBoxCell}>
            <Text style={styles.signBoxLabel}>{counterpartyLabel}</Text>
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

function ClauseBlock({ clause }: { clause: AddendumClause }) {
  return (
    <View>
      {clause.title ? <Text style={styles.clauseTitle}>{clause.no}. {clause.title}</Text> : null}
      {clause.paras.map((p, j) => <Paragraph key={j} para={p} />)}
    </View>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────

export type AddendumPdfInput = {
  id: string;
  referenceCode: string;
  agreementDate: string | null;
  landlordDetails: AddendumLandlordDetails;
  tenantDetails: AddendumTenantDetails;
  terms: AddendumTermsInput;
  feeItems: AddendumFeeItem[];
  paymentSchedule: AddendumScheduleRow[];
  bankDetails: AddendumBankDetails;

  tenantIdTypeLabel: string;
  tenantIdNumber: string;
  tenantIdIssuedDate?: string | null;
  tenantIdImageDataUri: string | null;
  /** IDs of people added or substituted under the parties section. */
  additionalPartyIds: { name: string; idImageDataUri: string | null }[];

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
};

export async function renderAddendumPdf(input: AddendumPdfInput): Promise<Buffer> {
  const hd = input.landlordDetails ?? {};
  const td = input.tenantDetails ?? {};
  const terms = input.terms;
  const landlordName = input.landlordTypedName || hd.name || "";
  const tenantName = input.tenantTypedName || td.name || "";
  const feeItems = input.feeItems ?? [];
  const schedule = input.paymentSchedule ?? [];
  const feeTotal = feeItems.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const peso = (n: number) => `Php ${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const roles = addendumRoles(terms.parentType);
  const sections = addendumSectionNumbers(terms);
  const clauses = buildAddendumClauses(terms);
  const recital = buildAddendumRecital(terms, hd, td, input.agreementDate);

  const Footer = () => (
    <PageFooter
      landlordSig={input.landlordSignatureDataUri || null}
      tenantSig={input.tenantSignatureDataUri || null}
      principalLabel={roles.principal.toUpperCase()}
      counterpartyLabel={roles.counterparty.toUpperCase()}
    />
  );

  const doc = (
    <Document>
      {/* Main body — flows continuously; don't hardcode page breaks. */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.title}>{addendumTitle(terms)}</Text>

        <Text style={[styles.p, styles.bold]}>{recital.opener}</Text>
        <Text style={styles.p}>{recital.intro}</Text>
        <Text style={styles.recitalParty}>
          <Text style={styles.bold}>{recital.landlordName}</Text>{recital.landlordLine}
        </Text>
        <Text style={styles.center}>— and —</Text>
        <Text style={styles.recitalParty}>
          <Text style={styles.bold}>{recital.tenantName}</Text>{recital.tenantLine}
        </Text>
        <Text style={styles.p}>{recital.partiesNote}</Text>
        {recital.whereas.map((w, i) => (
          <Text key={i} style={styles.p}>
            <Text style={styles.bold}>WHEREAS, </Text>{w}
          </Text>
        ))}
        <Text style={styles.p}>
          <Text style={styles.bold}>NOW, THEREFORE, </Text>{recital.nowTherefore}
        </Text>

        {clauses.map((c, i) => {
          // The fees section carries tables that a ClauseParagraph cannot
          // express, so it is split: lead-in paragraph, tables, then the rest.
          if (sections.fees !== null && c.no === sections.fees) {
            return (
              <View key={i}>
                <Text style={styles.clauseTitle}>{c.no}. {c.title}</Text>
                {c.paras[0] ? <Paragraph para={c.paras[0]} /> : null}

                <View style={styles.table}>
                  <View style={styles.trow}>
                    <Text style={[styles.thCell, { flex: 1 }]}>Item</Text>
                    <Text style={[styles.tdCellLast, styles.bold, { width: 110, textAlign: "right" }]}>Amount (PHP)</Text>
                  </View>
                  {feeItems.map((r, j) => (
                    <View key={j} style={styles.trow}>
                      <Text style={[styles.tdCell, { flex: 1 }]}>{r.label || " "}</Text>
                      <Text style={[styles.tdCellLast, { width: 110, textAlign: "right" }]}>{peso(Number(r.amount) || 0)}</Text>
                    </View>
                  ))}
                  <View style={styles.trowLast}>
                    <Text style={[styles.tdCell, styles.bold, { flex: 1 }]}>TOTAL</Text>
                    <Text style={[styles.tdCellLast, styles.bold, { width: 110, textAlign: "right" }]}>{peso(feeTotal)}</Text>
                  </View>
                </View>

                <Text style={styles.p}>{addendumBankIntro(input.bankDetails)}</Text>

                <View style={styles.table}>
                  {([
                    ["Name", input.bankDetails.name],
                    ["Bank", input.bankDetails.bank],
                    ["Branch", input.bankDetails.branch],
                    ["Account No.", input.bankDetails.accountNumber],
                  ] as const).map(([label, value], j, arr) => (
                    <View key={label} style={j === arr.length - 1 ? styles.trowLast : styles.trow}>
                      <Text style={[styles.tdCell, styles.bold, { width: 110 }]}>{label}</Text>
                      <Text style={[styles.tdCellLast, { flex: 1 }]}>{value}</Text>
                    </View>
                  ))}
                </View>

                {schedule.length > 0 && (
                  <View style={styles.table}>
                    <View style={styles.trow}>
                      <Text style={[styles.thCell, { flex: 1 }]}>DATE DUE</Text>
                      <Text style={[styles.thCell, { width: 90, textAlign: "right" }]}>AMOUNT</Text>
                      <Text style={[styles.thCell, { flex: 1.1 }]}>BANK/BRANCH</Text>
                      <Text style={[styles.tdCellLast, styles.bold, { flex: 1.2 }]}>COVERAGE</Text>
                    </View>
                    {schedule.map((r, j) => (
                      <View key={j} style={j === schedule.length - 1 ? styles.trowLast : styles.trow}>
                        <Text style={[styles.tdCell, { flex: 1 }]}>{r.dueDate || " "}</Text>
                        <Text style={[styles.tdCell, { width: 90, textAlign: "right" }]}>{r.amount || " "}</Text>
                        <Text style={[styles.tdCell, { flex: 1.1 }]}>{r.bankBranch || " "}</Text>
                        <Text style={[styles.tdCellLast, { flex: 1.2 }]}>{r.coverage || " "}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {c.paras.slice(1).map((p, j) => <Paragraph key={j} para={p} />)}
              </View>
            );
          }
          return <ClauseBlock key={i} clause={c} />;
        })}

        <Text style={[styles.p, { marginTop: 10 }]}>
          The Parties agree to the terms of this Addendum, as evidenced by the signatures set forth below.
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }} wrap={false}>
          <View style={{ width: "44%" }}>
            {input.landlordSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.landlordSignatureDataUri} style={styles.sigImg} />
              : <View style={{ height: 46 }} />}
            <View style={[styles.sigLine, { width: "100%" }]} />
            <Text style={styles.bold}>{landlordName || BLANK}</Text>
            <Text>{roles.principal}</Text>
            {input.landlordSignedAtManila ? <Text style={styles.meta}>Signed: {input.landlordSignedAtManila}</Text> : null}
          </View>
          <View style={{ width: "44%" }}>
            {input.tenantSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.tenantSignatureDataUri} style={styles.sigImg} />
              : <View style={{ height: 46 }} />}
            <View style={[styles.sigLine, { width: "100%" }]} />
            <Text style={styles.bold}>{tenantName || BLANK}</Text>
            <Text>{roles.counterparty}</Text>
            {input.tenantSignedAtManila ? <Text style={styles.meta}>Signed: {input.tenantSignedAtManila}</Text> : null}
          </View>
        </View>
      </Page>

      {/* ── COPY OF Valid IDs ── */}
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <Footer />
        <Text style={styles.annexTitle}>COPY OF Valid IDs</Text>

        <Text style={styles.idSectionLabel}>{roles.principal.toUpperCase()}</Text>
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
              <Text style={styles.meta}>Signed by an authorized All Abode signatory — {roles.principal.toLowerCase()} ID on file.</Text>
            ) : null}
          </View>
        )}

        <Text style={[styles.idSectionLabel, { marginTop: 24 }]}>{roles.counterparty.toUpperCase()}</Text>
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

        {input.additionalPartyIds.map((party, i) => (
          <View key={i}>
            <Text style={[styles.idSectionLabel, { marginTop: 24 }]}>{(party.name || "ADDED PARTY").toUpperCase()}</Text>
            {party.idImageDataUri ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={party.idImageDataUri} style={{ width: 320, maxHeight: 220, objectFit: "contain", marginTop: 6, alignSelf: "flex-start" }} />
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
            [landlordName, input.landlordIdTypeLabel ?? "", input.landlordIdNumber ?? ""],
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
        <Text style={styles.p}>Valid IDs are attached to this Addendum.</Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }} wrap={false}>
          <View style={{ width: "44%" }}>
            <Text style={styles.bold}>By: {roles.principal.toUpperCase()}</Text>
            {input.landlordSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.landlordSignatureDataUri} style={[styles.sigImg, { width: 130, height: 36 }]} />
              : <View style={{ height: 36 }} />}
            <View style={[styles.sigLine, { width: "100%" }]} />
            <Text style={styles.meta}>{landlordName || " "}</Text>
          </View>
          <View style={{ width: "44%" }}>
            <Text style={styles.bold}>By: {roles.counterparty.toUpperCase()}</Text>
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
        <Text style={styles.p}>
          <Text style={styles.bold}>Amends: </Text>
          {terms.parentSnapshot?.contractTitle || "—"}
          {terms.parentSnapshot?.referenceCode ? ` (${terms.parentSnapshot.referenceCode})` : ""}
        </Text>

        <Text style={[styles.bold, { marginTop: 10, marginBottom: 4, color: NAVY }]}>Signer 1 — {roles.counterparty}</Text>
        <Text style={styles.p}><Text style={styles.bold}>Name: </Text>{tenantName}</Text>
        <Text style={styles.p}><Text style={styles.bold}>Email: </Text>{td.email || "—"}</Text>
        <Text style={styles.p}><Text style={styles.bold}>Date/Time Signed: </Text>{input.tenantSignedAtManila} (Asia/Manila)</Text>
        <Text style={styles.p}><Text style={styles.bold}>IP Address: </Text>{input.tenantSignedIp}</Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Authentication Method: </Text>
          Signed via secure, single-use access link sent to verified email address; signature captured via electronic
          signature pad
        </Text>

        <Text style={[styles.bold, { marginTop: 10, marginBottom: 4, color: NAVY }]}>Signer 2 — {roles.principal}</Text>
        <Text style={styles.p}><Text style={styles.bold}>Name: </Text>{landlordName}</Text>
        <Text style={styles.p}><Text style={styles.bold}>Date/Time Signed: </Text>{input.landlordSignedAtManila} (Asia/Manila)</Text>
        <Text style={styles.p}><Text style={styles.bold}>IP Address: </Text>{input.landlordSignedIp}</Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Authentication Method: </Text>
          {input.landlordSignedVia === "remote"
            ? "Signed via secure, single-use access link sent by All Abode; signature captured via electronic signature pad"
            : `Signed on the ${roles.principal}'s behalf by an authenticated, designated All Abode signatory via the admin dashboard${input.countersignerEmail ? ` (${input.countersignerEmail})` : ""}; signature captured via electronic signature pad`}
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
