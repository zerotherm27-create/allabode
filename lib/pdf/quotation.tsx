import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import { PageContactRow } from "@/lib/pdf/contact-icons";
import {
  LINE_ITEM_CATEGORIES, LINE_ITEM_CATEGORY_LABEL, resolveGrandTotal,
  type QuotationLineItem, type ProgressMilestone,
} from "@/lib/quotation/totals";

// The standard Helvetica font (no custom font embedded) has no glyph for ₱,
// so every other PDF template in this codebase spells it out as "PHP" —
// matching that convention here instead of the shared formatPeso() helper,
// which is fine for HTML/web UI but renders as a broken glyph in a PDF.
const peso = (n: number) => `PHP ${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

let _logoWhite: string | null = null;
function getLogoWhite(): string | null {
  if (_logoWhite !== null) return _logoWhite;
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public/logo/logo-white-icon.png"));
    _logoWhite = `data:image/png;base64,${buf.toString("base64")}`;
  } catch { _logoWhite = ""; }
  return _logoWhite || null;
}

const NAVY = "#0a2540";
const GOLD = "#b4975a";
const SLATE = "#5b6573";
const INK = "#16202c";
const LINE = "#e2e6ec";
const CREAM = "#f8f6f1";
const WHITE = "#ffffff";
const TABLE_HEAD_TINT = "#f1f4f8";

const styles = StyleSheet.create({
  page: { backgroundColor: WHITE, fontFamily: "Helvetica", fontSize: 9.5, color: INK, lineHeight: 1.4, paddingTop: 74, paddingBottom: 64 },

  // ── Header band (fixed, repeats every page) — explicit height, not just
  // padding: an absolutely-positioned View with only top/left/right set and
  // no bottom/height renders reliably in a browser, but @react-pdf's Yoga
  // layout stretched it to fill the remaining page height instead of
  // sizing to content, painting the whole page navy. Every other fixed
  // header/footer in this codebase is transparent, so that bug never
  // surfaced until this template added a filled background to one. ──
  header: {
    position: "absolute", top: 0, left: 0, right: 0, height: 74,
    backgroundColor: NAVY, paddingHorizontal: 32,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 30, height: 30 },
  companyName: { color: WHITE, fontFamily: "Helvetica-Bold", fontSize: 11 },
  companyTagline: { color: "rgba(255,255,255,0.55)", fontSize: 7.5, marginTop: 2 },
  docTitle: { color: GOLD, fontFamily: "Helvetica-Bold", fontSize: 15, letterSpacing: 1.5, textTransform: "uppercase" },

  // ── Footer band (fixed, repeats every page) — explicit height, see header comment above. ──
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, height: 64, backgroundColor: NAVY, paddingHorizontal: 32, paddingVertical: 8, alignItems: "center" },
  footerTitle: { color: WHITE, fontFamily: "Helvetica-Bold", fontSize: 8.5, marginBottom: 2 },
  footerText: { color: "rgba(255,255,255,0.55)", fontSize: 6.5, textAlign: "center", marginTop: 2 },
  footerPage: { color: "rgba(255,255,255,0.75)", fontSize: 6.5, marginTop: 3 },

  // ── Meta bar (normal flow, page 1 only) ──
  metaBar: { backgroundColor: CREAM, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 32, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: LINE },
  metaLabel: { color: SLATE, fontSize: 7, textTransform: "uppercase", letterSpacing: 1 },
  metaValue: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 10, marginTop: 2 },

  body: { paddingHorizontal: 32, paddingTop: 20 },

  // ── Recipient block ──
  toBox: { borderLeftWidth: 3, borderLeftColor: GOLD, paddingLeft: 14, paddingVertical: 4, marginBottom: 20 },
  toLabel: { color: SLATE, fontSize: 7, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  toName: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 14 },
  toDetail: { color: SLATE, fontSize: 9, marginTop: 2 },

  sectionLabel: { color: SLATE, fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, marginTop: 18, marginBottom: 8 },

  // ── Tables ──
  table: { borderWidth: 1, borderColor: LINE, marginBottom: 4 },
  theadRow: { flexDirection: "row", backgroundColor: TABLE_HEAD_TINT, borderBottomWidth: 1, borderBottomColor: LINE },
  trow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE },
  trowLast: { flexDirection: "row" },
  thCell: { padding: 5, fontFamily: "Helvetica-Bold", fontSize: 7.5, color: SLATE, textTransform: "uppercase", letterSpacing: 0.5 },
  tdCell: { padding: 5, fontSize: 9 },

  subtotalRow: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 4, paddingHorizontal: 2 },
  subtotalLabel: { fontSize: 8.5, color: SLATE, marginRight: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  subtotalValue: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: NAVY },

  // ── Grand total ──
  grandTotalWrap: { alignItems: "flex-end", marginTop: 12, marginBottom: 6 },
  grandTotalBox: { borderWidth: 1.5, borderColor: GOLD, borderRadius: 4, backgroundColor: "#fffdf8", paddingHorizontal: 20, paddingVertical: 10, alignItems: "flex-end" },
  grandTotalLabel: { color: SLATE, fontSize: 7.5, textTransform: "uppercase", letterSpacing: 1 },
  grandTotalValue: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 18, marginTop: 2 },

  paragraph: { fontSize: 9.5, color: INK, lineHeight: 1.5, textAlign: "justify" },

  // ── Terms & Conditions ──
  tcRow: { marginBottom: 9 },
  tcLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 2 },
  tcText: { fontSize: 9, color: SLATE, lineHeight: 1.4 },

  noteBox: { backgroundColor: "#f8fafc", borderRadius: 4, padding: 12, marginTop: 4 },

  // ── Signatures ──
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 28 },
  sigBlock: { width: "44%" },
  sigImg: { width: 150, height: 44, objectFit: "contain" },
  sigLine: { borderBottomWidth: 1, borderBottomColor: NAVY, marginTop: 4, marginBottom: 5 },
  sigName: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 10 },
  sigRole: { color: SLATE, fontSize: 8 },
  sigMeta: { color: SLATE, fontSize: 7.5, marginTop: 1 },

  eSignNote: { fontSize: 7, color: SLATE, marginTop: 20, lineHeight: 1.4 },
});

function PageHeader() {
  const logo = getLogoWhite();
  return (
    <View style={styles.header} fixed>
      <View style={styles.logoWrap}>
        {logo && (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={logo} style={styles.logo} />
        )}
        <View>
          <Text style={styles.companyName}>All Abode Property Solutions</Text>
          <Text style={styles.companyTagline}>PRC Licensed Real Estate Firm</Text>
        </View>
      </View>
      <Text style={styles.docTitle}>Quotation</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerTitle}>All Abode Property Solutions</Text>
      <PageContactRow phone="+63 917 159 6808" email="info@allabodeph.com" website="www.allabodeph.com" color="rgba(255,255,255,0.65)" fontSize={6.5} />
      <Text style={styles.footerText}>This quotation is proprietary to All Abode Property Solutions and the named recipient.</Text>
      <Text style={styles.footerPage} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
    </View>
  );
}

function LineItemsTable({ category, items }: { category: QuotationLineItem["category"]; items: QuotationLineItem[] }) {
  const rows = items.filter((r) => r.category === category);
  if (rows.length === 0) return null;
  const subtotal = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  return (
    <View wrap={false}>
      <Text style={styles.sectionLabel}>{LINE_ITEM_CATEGORY_LABEL[category]}</Text>
      <View style={styles.table}>
        <View style={styles.theadRow}>
          <Text style={[styles.thCell, { flex: 2 }]}>Description</Text>
          <Text style={[styles.thCell, { width: 40 }]}>Qty</Text>
          <Text style={[styles.thCell, { width: 55 }]}>Unit</Text>
          <Text style={[styles.thCell, { width: 75 }]}>Unit Price</Text>
          <Text style={[styles.thCell, { width: 75 }]}>Amount</Text>
        </View>
        {rows.map((r, i) => {
          const lumpSum = r.pricingMode === "lump_sum";
          return (
            <View key={i} style={i === rows.length - 1 ? styles.trowLast : styles.trow}>
              <Text style={[styles.tdCell, { flex: 2 }]}>{r.description || " "}</Text>
              <Text style={[styles.tdCell, { width: 40 }]}>{lumpSum ? "" : r.quantity}</Text>
              <Text style={[styles.tdCell, { width: 55 }]}>{lumpSum ? "Lump sum" : r.unit || " "}</Text>
              <Text style={[styles.tdCell, { width: 75 }]}>{lumpSum ? "" : peso(r.unitPrice)}</Text>
              <Text style={[styles.tdCell, { width: 75, fontFamily: "Helvetica-Bold", color: NAVY }]}>{peso(r.amount)}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.subtotalRow}>
        <Text style={styles.subtotalLabel}>Subtotal</Text>
        <Text style={styles.subtotalValue}>{peso(subtotal)}</Text>
      </View>
    </View>
  );
}

function MilestonesTable({ milestones }: { milestones: ProgressMilestone[] }) {
  if (milestones.length === 0) return null;
  return (
    <View style={styles.table} wrap={false}>
      <View style={styles.theadRow}>
        <Text style={[styles.thCell, { flex: 2 }]}>Milestone</Text>
        <Text style={[styles.thCell, { width: 90 }]}>% or Amount</Text>
        <Text style={[styles.thCell, { flex: 1.5 }]}>Trigger Condition</Text>
      </View>
      {milestones.map((m, i) => (
        <View key={i} style={i === milestones.length - 1 ? styles.trowLast : styles.trow}>
          <Text style={[styles.tdCell, { flex: 2 }]}>{m.description || " "}</Text>
          <Text style={[styles.tdCell, { width: 90 }]}>{m.percentageOrAmount || " "}</Text>
          <Text style={[styles.tdCell, { flex: 1.5 }]}>{m.triggerCondition || " "}</Text>
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
  grandTotalOverride: number | null;
  scopeOfWork: string | null;
  notes: string | null;
  paymentTermsType: "cash" | "progress_billing" | null;
  paymentTermsNotes: string | null;
  progressMilestones: ProgressMilestone[];
  termsPayment: string | null;
  termsCompletion: string | null;
  termsWarranty: string | null;
  termsValidity: string | null;
  companyTypedName: string;
  companySignatureDataUri: string;
  companySignedAtManila: string;
  companySignedIp: string;
  companySignedVia: "remote" | "countersign";
  recipientTypedName: string;
  recipientSignatureDataUri: string;
  recipientSignedAtManila: string;
  recipientSignedIp: string;
};

export async function renderQuotationPdf(input: QuotationPdfInput): Promise<Buffer> {
  const rd = input.recipientDetails ?? {};
  const grandTotal = resolveGrandTotal(input.lineItems, input.grandTotalOverride);
  const tc = [
    ["Payment Terms", input.termsPayment],
    ["Completion Timeline", input.termsCompletion],
    ["Warranty", input.termsWarranty],
    ["Quotation Validity", input.termsValidity],
  ] as const;

  const doc = (
    <Document title={`Quotation ${input.quotationNumber}`} author="All Abode Property Solutions">
      <Page size="LETTER" style={styles.page}>
        <PageHeader />
        <PageFooter />

        <View style={styles.metaBar}>
          <View>
            <Text style={styles.metaLabel}>Quotation No.</Text>
            <Text style={styles.metaValue}>{input.quotationNumber}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{input.quotationDate || "—"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.metaLabel}>Valid Until</Text>
            <Text style={styles.metaValue}>{input.validUntil || "—"}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.toBox}>
            <Text style={styles.toLabel}>To</Text>
            <Text style={styles.toName}>{rd.name || input.recipientEmail}</Text>
            {rd.address && <Text style={styles.toDetail}>{rd.address}</Text>}
            {rd.phone && <Text style={styles.toDetail}>{rd.phone}</Text>}
            <Text style={styles.toDetail}>{rd.email || input.recipientEmail}</Text>
            {input.title && <Text style={[styles.toDetail, { marginTop: 6, fontFamily: "Helvetica-Bold", color: NAVY }]}>RE: {input.title}</Text>}
            {input.propertyReference && <Text style={styles.toDetail}>{input.propertyReference}</Text>}
          </View>

          {LINE_ITEM_CATEGORIES.map(({ value }) => (
            <LineItemsTable key={value} category={value} items={input.lineItems} />
          ))}

          <View style={styles.grandTotalWrap}>
            <View style={styles.grandTotalBox}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{peso(grandTotal)}</Text>
            </View>
          </View>

          {input.scopeOfWork && (
            <View wrap={false}>
              <Text style={styles.sectionLabel}>Scope of Work</Text>
              <Text style={styles.paragraph}>{input.scopeOfWork}</Text>
            </View>
          )}

          <View wrap={false}>
            <Text style={styles.sectionLabel}>Payment Terms</Text>
            {input.paymentTermsType === "progress_billing" ? (
              <MilestonesTable milestones={input.progressMilestones} />
            ) : (
              <Text style={styles.paragraph}>{input.paymentTermsNotes || "Full payment in cash."}</Text>
            )}
          </View>

          {tc.some(([, text]) => !!text) && (
            <View wrap={false}>
              <Text style={styles.sectionLabel}>Terms &amp; Conditions</Text>
              {tc.map(([label, text]) =>
                text ? (
                  <View key={label} style={styles.tcRow}>
                    <Text style={styles.tcLabel}>{label}</Text>
                    <Text style={styles.tcText}>{text}</Text>
                  </View>
                ) : null
              )}
            </View>
          )}

          {input.notes && (
            <View wrap={false}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <View style={styles.noteBox}>
                <Text style={styles.paragraph}>{input.notes}</Text>
              </View>
            </View>
          )}

          <View style={styles.sigRow} wrap={false}>
            <View style={styles.sigBlock}>
              {input.companySignatureDataUri
                // eslint-disable-next-line jsx-a11y/alt-text
                ? <Image src={input.companySignatureDataUri} style={styles.sigImg} />
                : <View style={{ height: 44 }} />}
              <View style={styles.sigLine} />
              <Text style={styles.sigName}>{input.companyTypedName || "COMPANY REPRESENTATIVE"}</Text>
              <Text style={styles.sigRole}>For All Abode Property Solutions</Text>
              {input.companySignedAtManila ? <Text style={styles.sigMeta}>Signed: {input.companySignedAtManila}</Text> : null}
            </View>
            <View style={styles.sigBlock}>
              {input.recipientSignatureDataUri
                // eslint-disable-next-line jsx-a11y/alt-text
                ? <Image src={input.recipientSignatureDataUri} style={styles.sigImg} />
                : <View style={{ height: 44 }} />}
              <View style={styles.sigLine} />
              <Text style={styles.sigName}>{input.recipientTypedName || "RECIPIENT"}</Text>
              <Text style={styles.sigRole}>Accepted by</Text>
              {input.recipientSignedAtManila ? <Text style={styles.sigMeta}>Signed: {input.recipientSignedAtManila}</Text> : null}
            </View>
          </View>

          <Text style={styles.eSignNote}>
            This quotation was executed via electronic signature in accordance with Republic Act No. 8792 (Electronic
            Commerce Act of 2000). Company representative signed {input.companySignedAtManila} (IP {input.companySignedIp})
            {input.companySignedVia === "countersign" ? " via the admin dashboard by an authenticated, designated signatory." : " via a secure, single-use access link."}
            {" "}Recipient signed {input.recipientSignedAtManila} (IP {input.recipientSignedIp}) via a secure, single-use access link.
          </Text>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
