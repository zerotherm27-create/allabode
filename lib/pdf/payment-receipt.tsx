import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";

let _logoWhite: string | null = null;
function getLogoWhite(): string | null {
  if (_logoWhite !== null) return _logoWhite;
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public/logo/logo-white-icon.png"));
    _logoWhite = `data:image/png;base64,${buf.toString("base64")}`;
  } catch { _logoWhite = ""; }
  return _logoWhite || null;
}

export const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  gcash: "GCash",
  maya: "Maya",
  check: "Check",
  other: "Other",
};

const peso = (n: number) =>
  `PHP ${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NAVY  = "#0a2540";
const GOLD  = "#b4975a";
const SLATE = "#5b6573";
const LINE  = "#e2e6ec";
const CREAM = "#f8f6f1";
const WHITE = "#ffffff";

const styles = StyleSheet.create({
  page: { backgroundColor: WHITE, fontFamily: "Helvetica" },

  // ── Header band ──
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 32,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 30, height: 30 },
  companyName: {
    color: WHITE,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  companyTagline: { color: "rgba(255,255,255,0.55)", fontSize: 8, marginTop: 2 },
  receiptTitle: {
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // ── Receipt meta (number + date) ──
  metaBar: {
    backgroundColor: CREAM,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  metaLabel: { color: SLATE, fontSize: 7, textTransform: "uppercase", letterSpacing: 1 },
  metaValue: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 10, marginTop: 2 },

  // ── Body ──
  body: { paddingHorizontal: 32, paddingTop: 24, paddingBottom: 100 },

  // ── Received from ──
  fromBox: {
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    paddingLeft: 14,
    paddingVertical: 4,
    marginBottom: 22,
  },
  fromLabel: { color: SLATE, fontSize: 7, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  tenantName: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 18 },
  propertyAddr: { color: SLATE, fontSize: 10, marginTop: 3 },

  // ── Amount ──
  amountSection: { alignItems: "center", marginBottom: 24 },
  amountLabel: { color: SLATE, fontSize: 7, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  amountBox: {
    borderWidth: 2,
    borderColor: GOLD,
    borderRadius: 6,
    paddingHorizontal: 40,
    paddingVertical: 14,
    backgroundColor: "#fffdf8",
  },
  amountValue: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 26 },

  // ── Details grid ──
  detailsLabel: {
    color: SLATE,
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 8,
  },
  detailKey: { width: 130, color: SLATE, fontSize: 9 },
  detailVal: { flex: 1, color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 9 },

  // ── Signature ──
  signatureSection: {
    marginTop: 36,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signatureBlock: { width: 220 },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: NAVY,
    paddingBottom: 4,
    marginBottom: 5,
  },
  signatureName: { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 10 },
  signatureMeta: { color: SLATE, fontSize: 8, marginTop: 1 },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: NAVY,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  footerTitle: {
    color: WHITE,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textAlign: "center",
    marginBottom: 3,
  },
  footerText: { color: "rgba(255,255,255,0.5)", fontSize: 7.5, textAlign: "center" },
});

export type PaymentReceiptInput = {
  receiptNumber: string;
  date: string;
  tenantName: string;
  propertyAddress: string;
  amount: number;
  method: string;
  paymentFor?: string | null;
  remarks?: string | null;
  receivedBy: string;
};

export async function renderPaymentReceiptPdf(input: PaymentReceiptInput): Promise<Buffer> {
  const logo = getLogoWhite();

  const doc = (
    <Document
      title={`Acknowledgement Receipt — ${input.receiptNumber}`}
      author="All Abode Property Solutions"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            {logo && <Image style={styles.logo} src={logo} />}
            <View>
              <Text style={styles.companyName}>All Abode Property Solutions</Text>
              <Text style={styles.companyTagline}>PRC Licensed Real Estate Firm</Text>
            </View>
          </View>
          <Text style={styles.receiptTitle}>Acknowledgement Receipt</Text>
        </View>

        {/* ── Receipt meta ── */}
        <View style={styles.metaBar}>
          <View>
            <Text style={styles.metaLabel}>Receipt No.</Text>
            <Text style={styles.metaValue}>{input.receiptNumber}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{input.date}</Text>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          {/* Received from */}
          <View style={styles.fromBox}>
            <Text style={styles.fromLabel}>Received from</Text>
            <Text style={styles.tenantName}>{input.tenantName}</Text>
            {!!input.propertyAddress && (
              <Text style={styles.propertyAddr}>{input.propertyAddress}</Text>
            )}
          </View>

          {/* Amount */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Amount Received</Text>
            <View style={styles.amountBox}>
              <Text style={styles.amountValue}>{peso(input.amount)}</Text>
            </View>
          </View>

          {/* Details */}
          <Text style={styles.detailsLabel}>Payment Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Mode of Payment</Text>
            <Text style={styles.detailVal}>{METHOD_LABEL[input.method] ?? input.method}</Text>
          </View>

          {!!input.paymentFor && (
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Payment For</Text>
              <Text style={styles.detailVal}>{input.paymentFor}</Text>
            </View>
          )}

          {!!input.remarks && (
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Remarks</Text>
              <Text style={styles.detailVal}>{input.remarks}</Text>
            </View>
          )}

          {/* Signature */}
          <View style={styles.signatureSection}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureName}>{input.receivedBy}</Text>
              </View>
              <Text style={styles.signatureMeta}>Date: {input.date}</Text>
              <Text style={styles.signatureMeta}>Authorized Representative</Text>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>All Abode Property Solutions</Text>
          <Text style={styles.footerText}>
            This is your official acknowledgement receipt. Please keep for your records.
          </Text>
          <Text style={styles.footerText}>
            For inquiries, please contact us at allabodeph.com
          </Text>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
