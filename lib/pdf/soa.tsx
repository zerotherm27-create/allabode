import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { SoaLine, SoaTotals, SoaType, OwnerSoaLineExtended } from "@/lib/finance/soa";

const peso = (n: number) => `PHP ${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NAVY = "#0a2540";
const GOLD = "#b4975a";
const SLATE = "#5b6573";
const LINE = "#e2e6ec";
const BLUE_HDR = "#1a56db";
const RED_HDR  = "#e02424";
const BLUE_BG  = "#dbeafe";
const RED_BG   = "#fee2e2";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#16202c", fontFamily: "Helvetica" },
  header: { borderBottomWidth: 2, borderBottomColor: NAVY, paddingBottom: 12, marginBottom: 16 },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY },
  brandDot: { color: GOLD },
  docTitle: { marginTop: 4, fontSize: 12, fontFamily: "Helvetica-Bold", color: NAVY },
  meta: { marginTop: 2, color: SLATE },
  section: { marginTop: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: LINE },
  rowDesc: { flex: 1, paddingRight: 12 },
  rowAmt: { width: 110, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalLabel: { color: SLATE },
  grandRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: NAVY },
  grandLabel: { fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 12 },
  grandAmt: { fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 12 },
  summary: { marginTop: 16, padding: 10, backgroundColor: "#f1f4f8", color: SLATE },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 8, color: SLATE, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
});

export type SoaPdfInput = {
  type: SoaType;
  party: string;
  property?: string | null;
  periodStart: string;
  periodEnd: string;
  lines: SoaLine[];
  totals: SoaTotals;
  summary?: string | null;
};

// ─────────────────────────────────────────────────────────────────
// New owner SOA PDF matching the sample format
// ─────────────────────────────────────────────────────────────────

export type OwnerSoaPdfInput = {
  ownerName: string;
  propertyName: string;
  unitLabel: string;
  periodStart: string;
  periodEnd: string;
  monthlyRent: number;
  payoutDueAt: string | null;
  leaseType: string;
  mgmtFeePct: number;
  vatPct: number;
  adjustments: number;
  prevSoaRef: string | null;
  payout: number;
  lines: OwnerSoaLineExtended[];
  summary?: string | null;
};

const ownerStyles = StyleSheet.create({
  page:       { padding: 36, fontSize: 9, color: "#16202c", fontFamily: "Helvetica" },
  contactRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 10, fontSize: 8, color: SLATE },
  docTitle:   { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 10 },
  gridRow:    { flexDirection: "row", marginBottom: 6 },
  gridCell:   { flex: 1 },
  label:      { fontSize: 8, color: SLATE, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 2 },
  value:      { fontSize: 9, color: NAVY, fontFamily: "Helvetica-Bold" },
  sectionHdr: { paddingVertical: 5, paddingHorizontal: 6, marginTop: 12, marginBottom: 2, textAlign: "center", fontSize: 11, fontFamily: "Helvetica-Bold", borderRadius: 2 },
  subHdr:     { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 4, marginBottom: 2, paddingLeft: 6 },
  row:        { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: LINE },
  rowDesc:    { flex: 1 },
  rowNote:    { width: 50, color: SLATE },
  rowAmt:     { width: 90, textAlign: "right" },
  rowReceipt: { width: 14, textAlign: "center", color: BLUE_HDR, fontSize: 7 },
  totalRow:   { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, fontFamily: "Helvetica-Bold" },
  sumRow:     { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: LINE, marginTop: 8 },
  payoutRow:  { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, borderTopWidth: 2, borderTopColor: NAVY, marginTop: 4, fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY },
  aiBox:      { marginTop: 12, padding: 8, backgroundColor: "#f1f4f8", fontSize: 8, color: SLATE },
  footer:     { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7, color: SLATE, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6 },
});

export async function renderOwnerSoaPdf(input: OwnerSoaPdfInput): Promise<Buffer> {
  const { lines, adjustments, prevSoaRef, payout } = input;

  const incLT  = lines.filter((l) => l.line_type === "income_longterm");
  const incST  = lines.filter((l) => l.line_type === "income_shortterm");
  const incOth = lines.filter((l) => l.line_type === "income_other");
  const totalIncome = [...incLT, ...incST, ...incOth].reduce((s, l) => s + Number(l.amount), 0);

  const dedLines = lines.filter((l) => l.line_type.startsWith("deduction_"));
  const totalDed = dedLines.reduce((s, l) => s + Math.abs(Number(l.amount)), 0);

  const otherExpLines = lines.filter((l) =>
    ["deduction_expense_recurring", "deduction_expense_manual", "deduction_expense"].includes(l.line_type)
  );

  const LineRow = ({ desc, note, amt, receipt }: { desc: string; note?: string | null; amt: number; receipt?: boolean }) => (
    <View style={ownerStyles.row}>
      <Text style={ownerStyles.rowDesc}>{desc}</Text>
      <Text style={ownerStyles.rowNote}>{note ?? ""}</Text>
      <Text style={ownerStyles.rowReceipt}>{receipt ? "R" : ""}</Text>
      <Text style={ownerStyles.rowAmt}>{amt !== 0 ? peso(Math.abs(amt)) : "—"}</Text>
    </View>
  );

  const TotalRow = ({ label, amt, bg }: { label: string; amt: number; bg: string }) => (
    <View style={[ownerStyles.totalRow, { backgroundColor: bg }]}>
      <Text style={[ownerStyles.rowDesc, { flex: 1, color: NAVY }]}>{label}</Text>
      <Text style={[ownerStyles.rowAmt, { color: NAVY }]}>{peso(amt)}</Text>
    </View>
  );

  const doc = (
    <Document>
      <Page size="A4" style={ownerStyles.page}>
        {/* Contact */}
        <View style={ownerStyles.contactRow}>
          <Text>E: info@allabodeph.com   W: www.allabodeph.com</Text>
        </View>

        <Text style={ownerStyles.docTitle}>STATEMENT OF ACCOUNT</Text>

        {/* Meta grid */}
        <View style={ownerStyles.gridRow}>
          <View style={ownerStyles.gridCell}>
            <Text style={ownerStyles.label}>Invoice for</Text>
            <Text style={ownerStyles.value}>{input.ownerName}</Text>
          </View>
          <View style={ownerStyles.gridCell}>
            <Text style={ownerStyles.label}>Rental Period</Text>
            <Text style={ownerStyles.value}>{input.periodStart} – {input.periodEnd}</Text>
          </View>
          <View style={[ownerStyles.gridCell, { alignItems: "flex-end" }]}>
            <Text style={ownerStyles.label}>Monthly Rental</Text>
            <Text style={ownerStyles.value}>{peso(input.monthlyRent)}</Text>
          </View>
        </View>
        <View style={ownerStyles.gridRow}>
          <View style={ownerStyles.gridCell}>
            <Text style={ownerStyles.label}>Property</Text>
            <Text style={ownerStyles.value}>{input.propertyName} · {input.unitLabel}</Text>
          </View>
          <View style={[ownerStyles.gridCell, { alignItems: "flex-end" }]}>
            <Text style={ownerStyles.label}>Payout Due Date</Text>
            <Text style={ownerStyles.value}>{input.payoutDueAt ?? "—"}</Text>
          </View>
        </View>

        {/* ── INCOME ── */}
        <View style={[ownerStyles.sectionHdr, { backgroundColor: BLUE_BG, color: BLUE_HDR }]}>
          <Text>Income</Text>
        </View>
        <View style={[ownerStyles.row, { backgroundColor: "#f8fafc" }]}>
          <Text style={[ownerStyles.rowDesc, { color: SLATE, fontFamily: "Helvetica-Bold" }]}>Description</Text>
          <Text style={[ownerStyles.rowNote, { color: SLATE }]}> </Text>
          <Text style={[ownerStyles.rowReceipt]}> </Text>
          <Text style={[ownerStyles.rowAmt, { color: SLATE, fontFamily: "Helvetica-Bold" }]}>Amount</Text>
        </View>

        {incLT.length > 0 && (
          <>
            <Text style={ownerStyles.subHdr}>Long term</Text>
            {incLT.map((l, i) => <LineRow key={i} desc={l.description} amt={l.amount} />)}
          </>
        )}
        {incST.length > 0 && (
          <>
            <Text style={ownerStyles.subHdr}>Short term</Text>
            {incST.map((l, i) => <LineRow key={i} desc={l.description} amt={l.amount} />)}
          </>
        )}
        {incLT.length === 0 && incST.length === 0 && (
          <LineRow desc={input.leaseType === "long_term" ? "Long term — no payments recorded" : "Short term — no bookings recorded"} amt={0} />
        )}
        {incOth.length > 0 && (
          <>
            <Text style={ownerStyles.subHdr}>Others</Text>
            {incOth.map((l, i) => <LineRow key={i} desc={l.description} amt={l.amount} />)}
          </>
        )}
        <TotalRow label="Total Income" amt={totalIncome} bg={BLUE_BG} />

        {/* ── DEDUCTIONS ── */}
        <View style={[ownerStyles.sectionHdr, { backgroundColor: RED_BG, color: RED_HDR }]}>
          <Text>Deductions</Text>
        </View>

        {/* Fees */}
        {lines.filter((l) => l.line_type === "deduction_mgmt_fee").map((l, i) => (
          <LineRow key={i} desc={l.description} amt={Math.abs(l.amount)} />
        ))}
        {lines.filter((l) => l.line_type === "deduction_vat").map((l, i) => (
          <LineRow key={i} desc={l.description} amt={Math.abs(l.amount)} />
        ))}

        {/* Utilities (from templates + expense records that are utility-type) */}
        {lines.filter((l) => l.line_type === "deduction_utility" || l.line_type === "deduction_expense").map((l, i) => (
          <LineRow key={i} desc={l.description} note={l.billing_note} amt={Math.abs(l.amount)} receipt={!!(l.receipt_path)} />
        ))}

        {/* Other expenses */}
        {otherExpLines.length > 0 && (
          <>
            <Text style={ownerStyles.subHdr}>Other Expenses</Text>
            {otherExpLines.map((l, i) => (
              <LineRow key={i} desc={l.description} amt={Math.abs(l.amount)} receipt={!!(l.receipt_path)} />
            ))}
          </>
        )}

        <TotalRow label="Total Deductions" amt={totalDed} bg={RED_BG} />

        {/* Summary */}
        <View style={ownerStyles.sumRow}>
          <Text style={[ownerStyles.rowDesc, { color: SLATE }]}>Subtotal</Text>
          <Text style={ownerStyles.rowAmt}>{peso(totalIncome - totalDed)}</Text>
        </View>
        {(adjustments !== 0 || prevSoaRef) && (
          <View style={ownerStyles.sumRow}>
            <Text style={[ownerStyles.rowDesc, { color: SLATE }]}>{prevSoaRef ? `Previous SOA | ${prevSoaRef}  Adjustments` : "Adjustments"}</Text>
            <Text style={ownerStyles.rowAmt}>{peso(adjustments)}</Text>
          </View>
        )}
        <View style={ownerStyles.payoutRow}>
          <Text style={{ flex: 1 }}>Payout</Text>
          <Text style={{ color: payout < 0 ? RED_HDR : NAVY }}>{peso(payout)}</Text>
        </View>
        {payout < 0 && (
          <Text style={{ fontSize: 8, color: RED_HDR, paddingHorizontal: 6, paddingTop: 2 }}>
            * Negative payout — balance is collectible from owner. See portal for payment options.
          </Text>
        )}
        {input.summary ? <Text style={ownerStyles.aiBox}>{input.summary}</Text> : null}

        <Text style={ownerStyles.footer} fixed>
          R = Receipt on file · All Abode Property Solutions · allabodeph.com · Reviewed before release.
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}

export async function renderSoaPdf(input: SoaPdfInput): Promise<Buffer> {
  const isOwner = input.type === "owner";
  const lines = [...input.lines].sort((a, b) => a.sort_order - b.sort_order);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>All Abode<Text style={styles.brandDot}>.</Text></Text>
          <Text style={styles.docTitle}>{isOwner ? "Owner Statement of Account" : "Tenant Statement of Account"}</Text>
          <Text style={styles.meta}>{input.party}{input.property ? ` — ${input.property}` : ""}</Text>
          <Text style={styles.meta}>Period: {input.periodStart} to {input.periodEnd}</Text>
        </View>

        <View style={styles.section}>
          {lines.map((l, i) => (
            <View style={styles.row} key={i}>
              <Text style={styles.rowDesc}>{l.description}</Text>
              <Text style={styles.rowAmt}>{peso(l.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          {isOwner ? (
            <>
              <View style={styles.totalRow}><Text style={styles.totalLabel}>Rental income collected</Text><Text>{peso(input.totals.total_payments)}</Text></View>
              <View style={styles.totalRow}><Text style={styles.totalLabel}>Expenses</Text><Text>{peso(-input.totals.total_expenses)}</Text></View>
              <View style={styles.grandRow}><Text style={styles.grandLabel}>Net remittance due to owner</Text><Text style={styles.grandAmt}>{peso(input.totals.net_remittance)}</Text></View>
            </>
          ) : (
            <>
              <View style={styles.totalRow}><Text style={styles.totalLabel}>Total charges</Text><Text>{peso(input.totals.total_charges)}</Text></View>
              <View style={styles.totalRow}><Text style={styles.totalLabel}>Payments received</Text><Text>{peso(-input.totals.total_payments)}</Text></View>
              <View style={styles.grandRow}><Text style={styles.grandLabel}>Outstanding balance</Text><Text style={styles.grandAmt}>{peso(input.totals.closing_balance)}</Text></View>
            </>
          )}
        </View>

        {input.summary ? <Text style={styles.summary}>{input.summary}</Text> : null}

        <Text style={styles.footer} fixed>
          All Abode Property Solutions. Figures are subject to verification. This statement is system-generated and reviewed before release.
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
