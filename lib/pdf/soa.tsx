import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { SoaLine, SoaTotals, SoaType } from "@/lib/finance/soa";

const peso = (n: number) => `PHP ${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NAVY = "#0a2540";
const GOLD = "#b4975a";
const SLATE = "#5b6573";
const LINE = "#e2e6ec";

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
