import type { SupabaseClient } from "@supabase/supabase-js";

// Statement of Account computation. ALL totals are derived deterministically from
// the database (posted expenses + recorded payments) — never from AI (spec §10.2,
// §10.8 step 6). recalcTotals() re-runs this and is the approval integrity gate.

export type SoaType = "owner" | "tenant";

export type SoaLine = {
  line_type: string;
  description: string;
  amount: number;
  sort_order: number;
  source_type?: string;
  source_id?: string;
};

export type SoaTotals = {
  opening_balance: number;
  total_charges: number;
  total_payments: number;
  total_expenses: number;
  total_adjustments: number;
  closing_balance: number;
  net_remittance: number;
};

export type SoaComputation = { totals: SoaTotals; lines: SoaLine[] };

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const POSTED = ["posted", "locked", "included_in_statement"];
const PAID = ["recorded", "verified"];

function incomeTypeForLeaseType(leaseType: string) {
  if (leaseType === "bnb") return "income_bnb";
  return leaseType === "long_term" ? "income_longterm" : "income_shortterm";
}

function incomeDescriptionForLeaseType(leaseType: string, hasPayment: boolean) {
  if (leaseType === "bnb") return hasPayment ? "BNB / Platform Payout" : "BNB / Daily Rental";
  return leaseType === "long_term"
    ? "Monthly Rent"
    : hasPayment ? "Short-term Rental Payment" : "Short-term Rental";
}

export async function computeOwnerSoa(
  supabase: SupabaseClient,
  ownerId: string,
  periodStart: string,
  periodEnd: string
): Promise<SoaComputation> {
  // Owner's lease ids (for rental income), via properties → units → leases.
  const { data: props } = await supabase.from("properties").select("id").eq("owner_id", ownerId);
  const propIds = ((props ?? []) as { id: string }[]).map((p) => p.id);

  let leaseIds: string[] = [];
  if (propIds.length) {
    const { data: units } = await supabase.from("units").select("id").in("property_id", propIds);
    const unitIds = ((units ?? []) as { id: string }[]).map((u) => u.id);
    if (unitIds.length) {
      const { data: leases } = await supabase.from("leases").select("id").in("unit_id", unitIds);
      leaseIds = ((leases ?? []) as { id: string }[]).map((l) => l.id);
    }
  }

  let payments: { amount: number; received_at: string }[] = [];
  if (leaseIds.length) {
    const { data } = await supabase
      .from("payments").select("amount,received_at")
      .in("lease_id", leaseIds).in("status", PAID)
      .gte("received_at", periodStart).lte("received_at", periodEnd);
    payments = (data ?? []) as typeof payments;
  }

  const { data: expData } = await supabase
    .from("expenses").select("id,total_amount,description,expense_date")
    .eq("owner_id", ownerId).in("status", POSTED)
    .gte("expense_date", periodStart).lte("expense_date", periodEnd);
  const expenses = (expData ?? []) as { id: string; total_amount: number; description: string | null; expense_date: string }[];

  const { data: ownerRow } = await supabase.from("owners").select("management_fee_percent").eq("id", ownerId).maybeSingle();
  const feePct = Number((ownerRow as { management_fee_percent?: number } | null)?.management_fee_percent ?? 0);

  const income = sum(payments.map((p) => Number(p.amount)));
  const expenseTotal = sum(expenses.map((e) => Number(e.total_amount)));
  const fee = Math.round(income * feePct) / 100;
  const net = income - expenseTotal - fee;

  const lines: SoaLine[] = [
    ...payments.map((p, i) => ({ line_type: "payment", description: `Rent collected — ${p.received_at}`, amount: Number(p.amount), sort_order: i })),
    ...expenses.map((e, i) => ({ line_type: "expense", description: e.description ?? "Expense", amount: -Number(e.total_amount), sort_order: 100 + i, source_type: "expense", source_id: e.id })),
    { line_type: "fee", description: `Management fee (${feePct}%)`, amount: -fee, sort_order: 900 },
  ];

  return {
    totals: { opening_balance: 0, total_charges: 0, total_payments: income, total_expenses: expenseTotal, total_adjustments: 0, closing_balance: net, net_remittance: net },
    lines,
  };
}

export async function computeTenantSoa(
  supabase: SupabaseClient,
  tenantId: string,
  periodStart: string,
  periodEnd: string
): Promise<SoaComputation> {
  const { data: leaseData } = await supabase
    .from("leases").select("rent_amount").eq("tenant_id", tenantId)
    .in("status", ["active", "expiring", "renewal_pending"]);
  const rent = sum(((leaseData ?? []) as { rent_amount: number }[]).map((l) => Number(l.rent_amount)));

  const { data: expData } = await supabase
    .from("expenses").select("id,total_amount,description")
    .eq("tenant_id", tenantId).eq("charge_to", "tenant").in("status", POSTED)
    .gte("expense_date", periodStart).lte("expense_date", periodEnd);
  const tExpenses = (expData ?? []) as { id: string; total_amount: number; description: string | null }[];

  const { data: payData } = await supabase
    .from("payments").select("amount,received_at").eq("tenant_id", tenantId).in("status", PAID)
    .gte("received_at", periodStart).lte("received_at", periodEnd);
  const payments = (payData ?? []) as { amount: number; received_at: string }[];

  const chargeExp = sum(tExpenses.map((e) => Number(e.total_amount)));
  const charges = rent + chargeExp;
  const paid = sum(payments.map((p) => Number(p.amount)));
  const closing = charges - paid;

  const lines: SoaLine[] = [
    { line_type: "charge", description: "Rent for period", amount: rent, sort_order: 0 },
    ...tExpenses.map((e, i) => ({ line_type: "charge", description: e.description ?? "Chargeable expense", amount: Number(e.total_amount), sort_order: 10 + i, source_type: "expense", source_id: e.id })),
    ...payments.map((p, i) => ({ line_type: "payment", description: `Payment — ${p.received_at}`, amount: -Number(p.amount), sort_order: 100 + i })),
  ];

  return {
    totals: { opening_balance: 0, total_charges: charges, total_payments: paid, total_expenses: 0, total_adjustments: 0, closing_balance: closing, net_remittance: 0 },
    lines,
  };
}

export function computeSoa(
  supabase: SupabaseClient,
  type: SoaType,
  partyId: string,
  periodStart: string,
  periodEnd: string
): Promise<SoaComputation> {
  return type === "owner"
    ? computeOwnerSoa(supabase, partyId, periodStart, periodEnd)
    : computeTenantSoa(supabase, partyId, periodStart, periodEnd);
}

// ─────────────────────────────────────────────────────────────────
// Lease-based owner SOA (replaces the per-owner aggregate for new SOAs)
// ─────────────────────────────────────────────────────────────────

export type OwnerSoaLineExtended = SoaLine & {
  expense_id?: string | null;
  receipt_path?: string | null;
  billing_note?: string | null;
};

export type OwnerSoaByLeaseMeta = {
  ownerId: string;
  propertyId: string;
  unitId: string;
  leaseType: string;
  mgmtFeePct: number;
  vatPct: number;
  mgmtFeeAmt: number;
  vatAmt: number;
};

export type OwnerSoaByLeaseResult = {
  totals: SoaTotals;
  lines: OwnerSoaLineExtended[];
  meta: OwnerSoaByLeaseMeta;
};

export async function computeOwnerSoaByLease(
  supabase: SupabaseClient,
  leaseId: string,
  periodStart: string,
  periodEnd: string
): Promise<OwnerSoaByLeaseResult> {
  // 1. Fetch lease
  const { data: leaseRow } = await supabase
    .from("leases")
    .select("id,rent_amount,lease_type,mgmt_fee_pct,vat_pct,unit_id,tenant_id,advance,deposit")
    .eq("id", leaseId)
    .maybeSingle();
  if (!leaseRow) throw new Error("Lease not found");

  type LeaseRow = { rent_amount: number; lease_type: string; mgmt_fee_pct: number; vat_pct: number; unit_id: string; tenant_id: string | null; advance: number | null; deposit: number | null };
  const lease = leaseRow as LeaseRow;

  // 2. Unit → property → owner
  const { data: unitRow } = await supabase.from("units").select("property_id").eq("id", lease.unit_id).maybeSingle();
  const propertyId = (unitRow as { property_id: string } | null)?.property_id ?? "";
  const { data: propRow } = await supabase.from("properties").select("owner_id").eq("id", propertyId).maybeSingle();
  const ownerId = (propRow as { owner_id: string } | null)?.owner_id ?? "";

  // 3. Payments for this lease in the period (rental income)
  const { data: payData } = await supabase
    .from("payments")
    .select("id,amount,received_at,notes,method")
    .eq("lease_id", leaseId)
    .in("status", PAID)
    .gte("received_at", periodStart)
    .lte("received_at", periodEnd);
  const payments = (payData ?? []) as { id: string; amount: number; received_at: string; notes: string | null; method: string }[];

  // 4. Expenses for this property in the period (charge_to = owner/split), with receipt path
  const { data: expData } = await supabase
    .from("expenses")
    .select("id,total_amount,description,expense_date,receipt_uploads(file_path)")
    .eq("property_id", propertyId)
    .in("charge_to", ["owner", "split"])
    .in("status", POSTED)
    .gte("expense_date", periodStart)
    .lte("expense_date", periodEnd);
  type ExpRow = { id: string; total_amount: number; description: string | null; expense_date: string; receipt_uploads: { file_path: string } | { file_path: string }[] | null };
  const expenses = (expData ?? []) as ExpRow[];

  // 5. Active charge templates for this unit
  const leaseType = (lease.lease_type as string) ?? "long_term";
  const { data: tplData } = await supabase
    .from("charge_templates")
    .select("id,name,amount,billing_note,template_type,sort_order")
    .eq("unit_id", lease.unit_id)
    .eq("is_active", true)
    .in("applies_to", [leaseType, "both"])
    .order("sort_order");
  type TplRow = { id: string; name: string; amount: number; billing_note: string | null; template_type: string; sort_order: number };
  const templates = (tplData ?? []) as TplRow[];

  // 6. Previous published SOA recurring line amounts (for pre-fill)
  const { data: prevSoa } = await supabase
    .from("statements_of_account")
    .select("id")
    .eq("lease_id", leaseId)
    .eq("status", "published")
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevAmounts: Record<string, number> = {};
  if (prevSoa) {
    const { data: prevLines } = await supabase
      .from("soa_lines")
      .select("description,amount")
      .eq("statement_id", (prevSoa as { id: string }).id)
      .eq("line_type", "deduction_expense_recurring");
    ((prevLines ?? []) as { description: string; amount: number }[]).forEach((l) => {
      prevAmounts[l.description.toLowerCase()] = Math.abs(Number(l.amount));
    });
  }

  // 7. Income lines — use recorded payments if any, otherwise pre-fill from lease rent_amount
  const incomeType = incomeTypeForLeaseType(leaseType);
  const incomeLines: OwnerSoaLineExtended[] = payments.length > 0
    ? payments.map((p, i) => ({
        line_type: incomeType,
        description: p.notes?.trim() || incomeDescriptionForLeaseType(leaseType, true),
        amount: Number(p.amount),
        sort_order: i,
      }))
    : [{
        line_type: incomeType,
        description: incomeDescriptionForLeaseType(leaseType, false),
        amount: Number(lease.rent_amount),
        sort_order: 0,
      }];
  const totalIncome = sum(incomeLines.map((l) => l.amount));

  // 8. De-duplicate templates against expense records (by name)
  const expNames = new Set(expenses.map((e) => (e.description ?? "").toLowerCase().trim()));
  const filteredTpls = templates.filter((t) => !expNames.has(t.name.toLowerCase().trim()));

  // 9. Fees
  const mgmtFeePct = Number(lease.mgmt_fee_pct ?? 5);
  const vatPct = Number(lease.vat_pct ?? 12);
  const mgmtFeeAmt = Math.round(totalIncome * mgmtFeePct) / 100;
  const vatAmt = Math.round(mgmtFeeAmt * vatPct) / 100;

  // 10. Deduction lines
  const getReceiptPath = (e: ExpRow): string | null => {
    const ru = Array.isArray(e.receipt_uploads) ? e.receipt_uploads[0] : e.receipt_uploads;
    return (ru as { file_path?: string } | null)?.file_path ?? null;
  };

  const deductionLines: OwnerSoaLineExtended[] = [
    { line_type: "deduction_mgmt_fee", description: `Management Fee (${mgmtFeePct}%)`, amount: -mgmtFeeAmt, sort_order: 100 },
    { line_type: "deduction_vat",      description: `VAT (${vatPct}%)`,                amount: -vatAmt,    sort_order: 101 },
    ...expenses.map((e, i) => ({
      line_type:    "deduction_expense",
      description:  e.description ?? "Expense",
      amount:       -Number(e.total_amount),
      sort_order:   200 + i,
      expense_id:   e.id,
      receipt_path: getReceiptPath(e),
    })),
    ...filteredTpls
      .filter((t) => t.template_type === "utility")
      .map((t) => ({
        line_type:    "deduction_utility",
        description:  t.name,
        amount:       -t.amount,
        sort_order:   300 + t.sort_order,
        billing_note: t.billing_note,
      })),
    ...filteredTpls
      .filter((t) => t.template_type === "expense_recurring")
      .map((t) => ({
        line_type:    "deduction_expense_recurring",
        description:  t.name,
        amount:       -(prevAmounts[t.name.toLowerCase()] ?? t.amount),
        sort_order:   400 + t.sort_order,
        billing_note: t.billing_note,
      })),
  ];

  const totalDeductions = sum(deductionLines.map((l) => Math.abs(l.amount)));
  const payout = totalIncome - totalDeductions;
  const allLines = [...incomeLines, ...deductionLines];

  return {
    totals: {
      opening_balance: 0,
      total_charges: 0,
      total_payments: totalIncome,
      total_expenses: totalDeductions,
      total_adjustments: 0,
      closing_balance: payout,
      net_remittance: payout,
    },
    lines: allLines,
    meta: { ownerId, propertyId, unitId: lease.unit_id, leaseType, mgmtFeePct, vatPct, mgmtFeeAmt, vatAmt },
  };
}

/** For lease-based SOAs: recompute totals from current soa_lines rows. */
export async function recomputeTotalsFromLines(
  supabase: SupabaseClient,
  statementId: string
): Promise<{ totalIncome: number; totalDeductions: number; payout: number }> {
  const { data: stored } = await supabase
    .from("statements_of_account").select("adjustments").eq("id", statementId).maybeSingle();
  const adjustments = Number((stored as { adjustments?: number } | null)?.adjustments ?? 0);

  const { data: lines } = await supabase.from("soa_lines").select("amount,line_type").eq("statement_id", statementId);
  const all = (lines ?? []) as { amount: number; line_type: string }[];
  const totalIncome = sum(all.filter((l) => l.line_type.startsWith("income_")).map((l) => Number(l.amount)));
  const totalDeductions = sum(all.filter((l) => l.line_type.startsWith("deduction_")).map((l) => Math.abs(Number(l.amount))));
  const payout = totalIncome - totalDeductions + adjustments;
  return { totalIncome, totalDeductions, payout };
}

/** Pre-generation gate (spec §10.8 step 3): no unresolved/unposted items in the period. */
export async function precheckSoa(
  supabase: SupabaseClient,
  args: { type: SoaType; partyId: string; periodStart: string; periodEnd: string }
): Promise<{ ok: boolean; issues: string[] }> {
  const issues: string[] = [];
  const col = args.type === "owner" ? "owner_id" : "tenant_id";
  const { data: pending } = await supabase
    .from("expenses").select("id").eq(col, args.partyId)
    .in("status", ["draft", "ai_suggested", "needs_review", "pending_approval"])
    .gte("expense_date", args.periodStart).lte("expense_date", args.periodEnd);
  if (pending && pending.length) issues.push(`${pending.length} expense(s) still pending approval in this period — post or exclude them first.`);
  return { ok: issues.length === 0, issues };
}

/** Re-derive totals and compare to the stored statement (spec §10.8 step 6 / §10.10). */
export async function recalcTotals(
  supabase: SupabaseClient,
  stored: { statement_type: SoaType; owner_id: string | null; tenant_id: string | null; period_start: string; period_end: string; closing_balance: number; net_remittance: number }
): Promise<{ match: boolean; computed: SoaTotals }> {
  const partyId = (stored.statement_type === "owner" ? stored.owner_id : stored.tenant_id) ?? "";
  const { totals } = await computeSoa(supabase, stored.statement_type, partyId, stored.period_start, stored.period_end);
  const match =
    Math.abs(totals.closing_balance - Number(stored.closing_balance)) < 0.01 &&
    Math.abs(totals.net_remittance - Number(stored.net_remittance)) < 0.01;
  return { match, computed: totals };
}
