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
  commission_id?: string | null;
  deposit_id?: string | null;
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

  // 5. Pending commissions for this lease (new lease / renewal fee — one-time deduction)
  const { data: commData } = await supabase
    .from("lease_commissions")
    .select("id,amount,description,commission_type")
    .eq("lease_id", leaseId)
    .eq("status", "pending");
  type CommRow = { id: string; amount: number; description: string | null; commission_type: string };
  const commissions = (commData ?? []) as CommRow[];

  // 6. Active charge templates for this unit
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

  // 7. Previous published SOA recurring line amounts (for pre-fill)
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

  // 8a. Held deposits for this lease not yet applied to any SOA. Security
  // deposits fund the lease's first owner remittance (real income, minus
  // commission/expenses); advance rent is held by AllAbode and shown only
  // as a note — soa_id gates each deposit to ever fund a payout once.
  const { data: depositData } = await supabase
    .from("security_deposits")
    .select("id,amount_held,deposit_type,months_held")
    .eq("lease_id", leaseId)
    .eq("status", "held")
    .is("soa_id", null);
  type DepositRow = { id: string; amount_held: number; deposit_type: string; months_held: number };
  const heldDeposits = (depositData ?? []) as DepositRow[];
  const securityDeposits = heldDeposits.filter((d) => d.deposit_type !== "advance");
  const advanceDeposits = heldDeposits.filter((d) => d.deposit_type === "advance");

  // 8b. Prior carried-forward SOA balances for this lease (auto-deducted from next payout)
  const { data: cfData } = await supabase
    .from("statements_of_account")
    .select("closing_balance,period_start")
    .eq("lease_id", leaseId)
    .eq("payout_status", "carried_forward")
    .neq("status", "voided");
  type CfRow = { closing_balance: number; period_start: string };
  const cfRows = (cfData ?? []) as CfRow[];
  const cfTotal = sum(cfRows.map((r) => Number(r.closing_balance)));

  // 9. Income lines — use recorded payments if any, otherwise pre-fill from lease rent_amount
  // (so an SOA can still be generated before a payment is logged for the month). Skip that
  // pre-fill when a not-yet-applied deposit (security OR advance) is funding this SOA instead —
  // a new lease's first remittance comes from the deposit(s), not a phantom "Monthly Rent" line
  // stacked on top of it.
  const incomeType = incomeTypeForLeaseType(leaseType);
  const rentIncomeLines: OwnerSoaLineExtended[] = payments.length > 0
    ? payments.map((p, i) => ({
        line_type: incomeType,
        description: p.notes?.trim() || incomeDescriptionForLeaseType(leaseType, true),
        amount: Number(p.amount),
        sort_order: i,
      }))
    : heldDeposits.length > 0
    ? []
    : [{
        line_type: incomeType,
        description: incomeDescriptionForLeaseType(leaseType, false),
        amount: Number(lease.rent_amount),
        sort_order: 0,
      }];

  // "PHP" not "₱" — the peso glyph doesn't render correctly in the PDF's font
  // (lib/pdf/soa.tsx's own peso() formatter avoids it for the same reason),
  // and this note text is shared verbatim across the PDF, admin, and owner views.
  const pesoAmt = (n: number) =>
    `PHP ${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Advance rent is prepaid rent — the owner's money — so it's full income.
  // Kept on line_type "income_other" (not a distinct type) so the publish
  // pipeline's "mark deposit applied" query (soa-pipeline.ts, filters on
  // income_other + deposit_id) gates it the same way as a security deposit.
  const advanceIncomeLines: OwnerSoaLineExtended[] = advanceDeposits.map((d, i) => ({
    line_type:   "income_other",
    description: "Advance Rent",
    amount:      Number(d.amount_held),
    sort_order:  10 + i,
    deposit_id:  d.id,
  }));

  // Security deposit: exactly one month's worth (amount_held / months_held) stays
  // held/disclosed-only; the remainder is released as income. months_held <= 1 leaves
  // no room for a distinct held month, so fall back to the column's schema default (2).
  // releasedAmount is derived by subtraction (not rounded independently) so the two
  // always reconcile to amount_held exactly.
  const securityIncomeLines: OwnerSoaLineExtended[] = securityDeposits.map((d, i) => {
    const amountHeld = Number(d.amount_held);
    const rawMonths = Number(d.months_held);
    const monthsHeld = Number.isFinite(rawMonths) && rawMonths > 1 ? rawMonths : 2;
    const heldAmount = Math.round((amountHeld / monthsHeld) * 100) / 100;
    const releasedAmount = amountHeld - heldAmount;
    const monthsLabel = Number.isInteger(monthsHeld) ? String(monthsHeld) : monthsHeld.toFixed(1);
    return {
      line_type:    "income_other",
      description:  `${monthsLabel} month${monthsHeld === 1 ? "" : "s"} deposit`,
      amount:       releasedAmount,
      billing_note: `1 month HELD BY ALL ABODE (${pesoAmt(heldAmount)})`,
      sort_order:   20 + i,
      deposit_id:   d.id,
    };
  });

  const depositIncomeLines: OwnerSoaLineExtended[] = [...advanceIncomeLines, ...securityIncomeLines];
  const incomeLines: OwnerSoaLineExtended[] = [...rentIncomeLines, ...depositIncomeLines];
  const totalIncome = sum(incomeLines.map((l) => l.amount));

  // No more info-only deposit lines going forward — advance is now full income (above)
  // and the security deposit's held portion is disclosed via billing_note on its own
  // income line, not a separate line item. Kept as an empty array (not removed) so the
  // three render sites, which all filter on `line_type.startsWith("info_")`, need no
  // changes and keep rendering correctly for previously-published statements that still
  // carry real info_advance_rent rows.
  const infoLines: OwnerSoaLineExtended[] = [];

  // 9. De-duplicate templates against expense records (by name)
  const expNames = new Set(expenses.map((e) => (e.description ?? "").toLowerCase().trim()));
  const filteredTpls = templates.filter((t) => !expNames.has(t.name.toLowerCase().trim()));

  // 10. Fees
  const mgmtFeePct = Number(lease.mgmt_fee_pct ?? 5);
  const vatPct = Number(lease.vat_pct ?? 12);
  const mgmtFeeAmt = Math.round(totalIncome * mgmtFeePct) / 100;
  const vatAmt = Math.round(mgmtFeeAmt * vatPct) / 100;

  // 11. Deduction lines
  const getReceiptPath = (e: ExpRow): string | null => {
    const ru = Array.isArray(e.receipt_uploads) ? e.receipt_uploads[0] : e.receipt_uploads;
    return (ru as { file_path?: string } | null)?.file_path ?? null;
  };

  const deductionLines: OwnerSoaLineExtended[] = [
    // Carry-forward balance from prior negative SOAs (sort 45)
    ...(cfTotal < 0 ? [{
      line_type:   "deduction_carry_forward",
      description: cfRows.length === 1
        ? `Carry Forward (${cfRows[0].period_start.slice(0, 7)})`
        : `Carry Forward (${cfRows.length} prior periods)`,
      amount:      cfTotal,
      sort_order:  45,
    }] : []),
    // Commission is a real deduction from the deposit-funded remittance —
    // sort_order 50+ so it sorts right after any carry-forward balance.
    ...commissions.map((c, i) => ({
      line_type:    "deduction_commission",
      description:  c.description ?? (
        c.commission_type === "new_lease" ? "New Lease Commission" :
        c.commission_type === "renewal"   ? "Renewal Commission"    : "Commission"
      ),
      amount:       -Number(c.amount),
      sort_order:   50 + i,
      commission_id: c.id,
    })),
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
  const allLines = [...incomeLines, ...infoLines, ...deductionLines];

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
