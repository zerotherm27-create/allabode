import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import { PageContactRow } from "@/lib/pdf/contact-icons";
import {
  LINE_ITEM_CATEGORIES, LINE_ITEM_CATEGORY_LABEL, computeGrandTotal, formatPeso,
  type QuotationLineItem, type ProgressMilestone,
} from "@/lib/quotation/totals";

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
  page: { paddingTop: 92, paddingBottom: 56, paddingHorizontal: 44, fontSize: 9.5, color: INK, fontFamily: "Helvetica", lineHeight: 1.4 },
  header: { position: "absolute", top: 22, left: 44, right: 44, alignItems: "center" },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44 },
  footerPage: { fontSize: 7.5, color: SLATE, textAlign: "center" },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 9, color: SLATE, textAlign: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 12, marginBottom: 6 },
  p: { marginBottom: 6, textAlign: "justify" },
  bold: { fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 8, color: SLATE },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  table: { borderWidth: 0.75, borderColor: INK, marginTop: 4, marginBottom: 6 },
  trow: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: INK },
  trowLast: { flexDirection: "row" },
  thCell: { padding: 4, fontFamily: "Helvetica-Bold", borderRightWidth: 0.75, borderRightColor: INK },
  tdCell: { padding: 4, borderRightWidth: 0.75, borderRightColor: INK },
  tdCellLast: { padding: 4 },
  subtotalRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 10 },
  subtotalLabel: { fontSize: 9, color: SLATE, marginRight: 8 },
  subtotalValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY },
  grandTotalRow: { flexDirection: "row", justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: INK, paddingTop: 6, marginTop: 4, marginBottom: 14 },
  grandTotalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY, marginRight: 8 },
  grandTotalValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY },
  sigLine: { width: 200, borderBottomWidth: 0.75, borderBottomColor: INK },
  sigImg: { width: 160, height: 46, objectFit: "contain" },
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

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerPage} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
    </View>
  );
}

function LineItemsTable({ category, items }: { category: QuotationLineItem["category"]; items: QuotationLineItem[] }) {
  const rows = items.filter((r) => r.category === category);
  if (rows.length === 0) return null;
  const subtotal = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  return (
    <View>
      <Text style={styles.sectionTitle}>{LINE_ITEM_CATEGORY_LABEL[category]}</Text>
      <View style={styles.table}>
        <View style={styles.trow}>
          <Text style={[styles.thCell, { flex: 2 }]}>DESCRIPTION</Text>
          <Text style={[styles.thCell, { width: 40 }]}>QTY</Text>
          <Text style={[styles.thCell, { width: 50 }]}>UNIT</Text>
          <Text style={[styles.thCell, { width: 75 }]}>UNIT PRICE</Text>
          <Text style={[styles.tdCellLast, styles.bold, { width: 75 }]}>AMOUNT</Text>
        </View>
        {rows.map((r, i) => (
          <View key={i} style={i === rows.length - 1 ? styles.trowLast : styles.trow}>
            <Text style={[styles.tdCell, { flex: 2 }]}>{r.description || " "}</Text>
            <Text style={[styles.tdCell, { width: 40 }]}>{r.quantity}</Text>
            <Text style={[styles.tdCell, { width: 50 }]}>{r.unit || " "}</Text>
            <Text style={[styles.tdCell, { width: 75 }]}>{formatPeso(r.unitPrice)}</Text>
            <Text style={[styles.tdCellLast, { width: 75 }]}>{formatPeso(r.amount)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.subtotalRow}>
        <Text style={styles.subtotalLabel}>Subtotal</Text>
        <Text style={styles.subtotalValue}>{formatPeso(subtotal)}</Text>
      </View>
    </View>
  );
}

function MilestonesTable({ milestones }: { milestones: ProgressMilestone[] }) {
  if (milestones.length === 0) return null;
  return (
    <View style={styles.table}>
      <View style={styles.trow}>
        <Text style={[styles.thCell, { flex: 2 }]}>MILESTONE</Text>
        <Text style={[styles.thCell, { width: 90 }]}>% OR AMOUNT</Text>
        <Text style={[styles.tdCellLast, styles.bold, { flex: 1.5 }]}>TRIGGER CONDITION</Text>
      </View>
      {milestones.map((m, i) => (
        <View key={i} style={i === milestones.length - 1 ? styles.trowLast : styles.trow}>
          <Text style={[styles.tdCell, { flex: 2 }]}>{m.description || " "}</Text>
          <Text style={[styles.tdCell, { width: 90 }]}>{m.percentageOrAmount || " "}</Text>
          <Text style={[styles.tdCellLast, { flex: 1.5 }]}>{m.triggerCondition || " "}</Text>
        </View>
      ))}
    </View>
  );
}

export type QuotationPdfInput = {
  quotationNumber: string;
  quotationDate: string | null;
  validUntil: string | null;
  title: string | null;
  propertyReference: string | null;
  recipientDetails: { name?: string; email?: string; phone?: string; address?: string };
  recipientEmail: string;
  lineItems: QuotationLineItem[];
  scopeOfWork: string | null;
  paymentTermsType: "cash" | "progress_billing" | null;
  paymentTermsNotes: string | null;
  progressMilestones: ProgressMilestone[];
  recipientTypedName: string;
  recipientSignatureDataUri: string;
  recipientSignedAtManila: string;
  recipientSignedIp: string;
  companyTypedName: string;
  companySignatureDataUri: string;
  companySignedAtManila: string;
  companySignedIp: string;
  companySignedVia: "remote" | "countersign";
  countersignerEmail?: string | null;
};

export async function renderQuotationPdf(input: QuotationPdfInput): Promise<Buffer> {
  const rd = input.recipientDetails ?? {};
  const grandTotal = computeGrandTotal(input.lineItems);

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <PageFooter />
        <Text style={styles.title}>QUOTATION</Text>
        {input.title && <Text style={styles.subtitle}>{input.title}</Text>}

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.meta}>Quotation No.: {input.quotationNumber}</Text>
            {input.quotationDate && <Text style={styles.meta}>Date: {input.quotationDate}</Text>}
            {input.validUntil && <Text style={styles.meta}>Valid until: {input.validUntil}</Text>}
            {input.propertyReference && <Text style={styles.meta}>Property: {input.propertyReference}</Text>}
          </View>
          <View>
            <Text style={styles.bold}>To:</Text>
            <Text>{rd.name || input.recipientEmail}</Text>
            {rd.address && <Text style={styles.meta}>{rd.address}</Text>}
            {rd.phone && <Text style={styles.meta}>{rd.phone}</Text>}
            <Text style={styles.meta}>{rd.email || input.recipientEmail}</Text>
          </View>
        </View>

        {LINE_ITEM_CATEGORIES.map(({ value }) => (
          <LineItemsTable key={value} category={value} items={input.lineItems} />
        ))}

        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
          <Text style={styles.grandTotalValue}>{formatPeso(grandTotal)}</Text>
        </View>

        {input.scopeOfWork && (
          <View>
            <Text style={styles.sectionTitle}>Scope of Work</Text>
            <Text style={styles.p}>{input.scopeOfWork}</Text>
          </View>
        )}

        <View>
          <Text style={styles.sectionTitle}>Payment Terms</Text>
          {input.paymentTermsType === "progress_billing" ? (
            <MilestonesTable milestones={input.progressMilestones} />
          ) : (
            <Text style={styles.p}>{input.paymentTermsNotes || "Full payment in cash."}</Text>
          )}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 24 }} wrap={false}>
          <View style={{ width: "44%" }}>
            {input.recipientSignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.recipientSignatureDataUri} style={styles.sigImg} />
              : <View style={{ height: 46 }} />}
            <View style={[styles.sigLine, { width: "100%" }]} />
            <Text style={styles.bold}>{input.recipientTypedName || "RECIPIENT"}</Text>
            <Text>Recipient</Text>
            {input.recipientSignedAtManila ? <Text style={styles.meta}>Signed: {input.recipientSignedAtManila}</Text> : null}
          </View>
          <View style={{ width: "44%" }}>
            {input.companySignatureDataUri
              // eslint-disable-next-line jsx-a11y/alt-text
              ? <Image src={input.companySignatureDataUri} style={styles.sigImg} />
              : <View style={{ height: 46 }} />}
            <View style={[styles.sigLine, { width: "100%" }]} />
            <Text style={styles.bold}>{input.companyTypedName || "COMPANY REPRESENTATIVE"}</Text>
            <Text>For All Abode Property Solutions</Text>
            {input.companySignedAtManila ? <Text style={styles.meta}>Signed: {input.companySignedAtManila}</Text> : null}
          </View>
        </View>

        <Text style={[styles.meta, { marginTop: 18 }]}>
          This quotation was executed via electronic signature in accordance with Republic Act No. 8792 (Electronic
          Commerce Act of 2000). Recipient signed {input.recipientSignedAtManila} (IP {input.recipientSignedIp}).
          Company representative signed {input.companySignedAtManila} (IP {input.companySignedIp}).
          {input.companySignedVia === "countersign"
            ? ` The company signature was captured by an authenticated, designated All Abode signatory via the admin dashboard${input.countersignerEmail ? ` (${input.countersignerEmail})` : ""}.`
            : ""}
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
