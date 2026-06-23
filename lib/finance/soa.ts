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
