import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";

const peso = (n: number | string) =>
  `PHP ${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NAVY  = "#0a2540";
const GOLD  = "#b4975a";
const SLATE = "#5b6573";
const LINE  = "#e2e6ec";
const GREEN = "#0e9f6e";
const RED   = "#e02424";

let logoBase64: string | null = null;
function getLogo(): string | null {
  if (logoBase64 !== null) return logoBase64;
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public/logo/logo-primary.png"));
    logoBase64 = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    logoBase64 = "";
  }
  return logoBase64 || null;
}

const s = StyleSheet.create({
  page:        { padding: 40, fontSize: 10, color: "#16202c", fontFamily: "Helvetica" },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  logo:        { width: 130, height: 38, objectFit: "contain" },
  brandText:   { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY },
  brandSub:    { fontSize: 8, color: SLATE, marginTop: 2 },
  invBlock:    { alignItems: "flex-end" },
  invTitle:    { fontSize: 20, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 2 },
  invMeta:     { fontSize: 9, color: SLATE, marginTop: 3 },
  invMetaVal:  { fontFamily: "Helvetica-Bold", color: NAVY },
  divider:     { borderBottomWidth: 1, borderBottomColor: LINE, marginVertical: 14 },
  thickDiv:    { borderBottomWidth: 2, borderBottomColor: NAVY, marginVertical: 14 },
  twoCol:      { flexDirection: "row", gap: 24, marginBottom: 14 },
  col:         { flex: 1 },
  label:       { fontSize: 8, fontFamily: "Helvetica-Bold", color: SLATE, textTransform: "uppercase", marginBottom: 3 },
  value:       { fontSize: 10, color: NAVY },
  statusBadge: { fontSize: 9, fontFamily: "Helvetica-Bold", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20 },
  tableHead:   { flexDirection: "row", backgroundColor: "#f1f4f8", paddingVertical: 6, paddingHorizontal: 8, fontSize: 8, fontFamily: "Helvetica-Bold", color: SLATE },
  tableRow:    { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: LINE },
  desc:        { flex: 1 },
  qty:         { width: 36, textAlign: "right" },
  unitPrice:   { width: 80, textAlign: "right" },
  amount:      { width: 90, textAlign: "right" },
  totalSection:{ marginTop: 4 },
  totalRow:    { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 4, gap: 0 },
  totalLabel:  { width: 130, textAlign: "right", color: SLATE },
  totalVal:    { width: 100, textAlign: "right", fontFamily: "Helvetica-Bold", color: NAVY },
  grandRow:    { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 6, borderTopWidth: 2, borderTopColor: NAVY, marginTop: 6 },
  grandLabel:  { width: 130, textAlign: "right", fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 11 },
  grandVal:    { width: 100, textAlign: "right", fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 11 },
  notes:       { marginTop: 14, padding: 10, backgroundColor: "#f8fafc", color: SLATE, fontSize: 9 },
  footer:      { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 8, color: SLATE, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
});

const STATUS_LABEL: Record<string, string> = {
  draft:          "Draft",
  issued:         "Issued",
  partially_paid: "Partially Paid",
  paid:           "Paid",
  overdue:        "Overdue",
  voided:         "Voided",
};

export type InvoicePdfInput = {
  invoiceNumber: string;
  createdAt: string;
  issuedAt: string | null;
  dueDate: string;
  status: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  tenantName: string;
  tenantEmail: string | null;
  unitLabel: string;
  propertyName: string;
  propertyAddress: string | null;
  lines: { description: string; quantity: number; unitPrice: number; amount: number }[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  notes: string | null;
};

export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const logo = getLogo();
  const balance = Number(input.totalAmount) - Number(input.amountPaid);
  const statusLabel = STATUS_LABEL[input.status] ?? input.status;
  const isPaid = input.status === "paid";

  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            {logo
              ? <Image src={logo} style={s.logo} />
              : <Text style={s.brandText}>All Abode</Text>
            }
            <Text style={s.brandSub}>All Abode Property Solutions</Text>
            <Text style={s.brandSub}>info@allabodeph.com · allabodeph.com</Text>
          </View>
          <View style={s.invBlock}>
            <Text style={s.invTitle}>INVOICE</Text>
            <Text style={[s.invMeta, { marginTop: 6 }]}>
              Invoice No: <Text style={s.invMetaVal}>{input.invoiceNumber}</Text>
            </Text>
            <Text style={s.invMeta}>
              Date: <Text style={s.invMetaVal}>{input.issuedAt?.slice(0, 10) ?? input.createdAt.slice(0, 10)}</Text>
            </Text>
            <Text style={s.invMeta}>
              Due: <Text style={s.invMetaVal}>{input.dueDate}</Text>
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 6 }}>
              <Text style={[
                s.statusBadge,
                isPaid
                  ? { color: GREEN, backgroundColor: "#d1fae5" }
                  : input.status === "voided"
                  ? { color: SLATE, backgroundColor: "#f1f4f8" }
                  : { color: NAVY, backgroundColor: "#e8f0fb" },
              ]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.thickDiv} />

        {/* ── Bill to + period ── */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.label}>Bill To</Text>
            <Text style={[s.value, { fontFamily: "Helvetica-Bold" }]}>{input.tenantName}</Text>
            {input.tenantEmail && <Text style={[s.value, { color: SLATE, fontSize: 9 }]}>{input.tenantEmail}</Text>}
            <Text style={[s.value, { marginTop: 4 }]}>{input.unitLabel}</Text>
            <Text style={[s.value, { color: SLATE, fontSize: 9 }]}>{input.propertyName}</Text>
            {input.propertyAddress && <Text style={[s.value, { color: SLATE, fontSize: 9 }]}>{input.propertyAddress}</Text>}
          </View>
          <View style={s.col}>
            <Text style={s.label}>Billing Period</Text>
            <Text style={s.value}>{input.billingPeriodStart}</Text>
            <Text style={[s.value, { color: SLATE }]}>to {input.billingPeriodEnd}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Line items ── */}
        <View style={s.tableHead}>
          <Text style={s.desc}>Description</Text>
          <Text style={s.qty}>Qty</Text>
          <Text style={s.unitPrice}>Unit Price</Text>
          <Text style={s.amount}>Amount</Text>
        </View>
        {input.lines.map((l, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={s.desc}>{l.description}</Text>
            <Text style={s.qty}>{l.quantity}</Text>
            <Text style={s.unitPrice}>{peso(l.unitPrice)}</Text>
            <Text style={s.amount}>{peso(l.amount)}</Text>
          </View>
        ))}

        {/* ── Totals ── */}
        <View style={s.totalSection}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalVal}>{peso(input.subtotal)}</Text>
          </View>
          {Number(input.taxAmount) > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Tax</Text>
              <Text style={s.totalVal}>{peso(input.taxAmount)}</Text>
            </View>
          )}
          <View style={s.grandRow}>
            <Text style={s.grandLabel}>Total</Text>
            <Text style={s.grandVal}>{peso(input.totalAmount)}</Text>
          </View>
          {Number(input.amountPaid) > 0 && (
            <>
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { color: GREEN }]}>Paid</Text>
                <Text style={[s.totalVal, { color: GREEN }]}>− {peso(input.amountPaid)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { fontFamily: "Helvetica-Bold", color: balance <= 0 ? GREEN : RED }]}>Balance Due</Text>
                <Text style={[s.totalVal, { color: balance <= 0 ? GREEN : RED }]}>{peso(balance)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Notes */}
        {input.notes && (
          <View style={s.notes}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 3 }}>Notes</Text>
            <Text>{input.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>All Abode Property Solutions · info@allabodeph.com · allabodeph.com</Text>
          <Text>This is a system-generated invoice. Please keep for your records.</Text>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
