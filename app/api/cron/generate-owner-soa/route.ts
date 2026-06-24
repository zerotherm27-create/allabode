import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCronSecret, logCronRun } from "@/lib/cron";
import { computeOwnerSoaByLease } from "@/lib/finance/soa";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const deny = verifyCronSecret(req);
  if (deny) return deny;

  const supabase = await createClient();
  const now   = new Date();
  const prev  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start = prev.toISOString().slice(0, 10);
  const end   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

  const { data: leases } = await supabase
    .from("leases")
    .select("id,unit_id,lease_type,mgmt_fee_pct,vat_pct,rent_amount")
    .in("status", ["active", "renewal_pending", "expiring"]);

  let taken = 0;
  const errors: string[] = [];

  for (const lease of (leases ?? []) as { id: string }[]) {
    // Skip if a lease-based SOA for this period already exists
    const { count } = await supabase
      .from("statements_of_account")
      .select("id", { count: "exact", head: true })
      .eq("lease_id", lease.id)
      .eq("period_start", start);
    if (count && count > 0) continue;

    try {
      const computed = await computeOwnerSoaByLease(supabase, lease.id, start, end);

      const { data: soaRow, error: soaErr } = await supabase
        .from("statements_of_account")
        .insert({
          owner_id:         computed.meta.ownerId,
          statement_type:   "owner",
          period_start:     start,
          period_end:       end,
          lease_id:         lease.id,
          lease_type:       computed.meta.leaseType,
          opening_balance:  0,
          gross_income:     computed.totals.total_payments,
          total_payments:   computed.totals.total_payments,
          total_expenses:   computed.totals.total_expenses,
          total_deductions: computed.totals.total_expenses,
          net_remittance:   computed.totals.net_remittance,
          closing_balance:  computed.totals.closing_balance,
          mgmt_fee_amt:     computed.meta.mgmtFeeAmt,
          vat_amt:          computed.meta.vatAmt,
          status:           "generated",
          payout_status:    "pending",
        })
        .select("id")
        .single();

      if (soaErr || !soaRow) {
        errors.push(`lease ${lease.id}: ${soaErr?.message ?? "insert failed"}`);
        continue;
      }

      if (computed.lines.length > 0) {
        const { error: lineErr } = await supabase.from("soa_lines").insert(
          computed.lines.map((l, i) => ({
            statement_id: soaRow.id,
            description:  l.description,
            amount:       l.amount,
            line_type:    l.line_type,
            sort_order:   i,
            expense_id:   l.expense_id ?? null,
            receipt_path: l.receipt_path ?? null,
            billing_note: l.billing_note ?? null,
          }))
        );
        if (lineErr) errors.push(`lease ${lease.id} lines: ${lineErr.message}`);
      }

      taken++;
    } catch (e) {
      errors.push(`lease ${lease.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const status = errors.length === 0 ? "success" : taken > 0 ? "partial" : "failed";
  await logCronRun(supabase, "generate_owner_soa", {
    processed: leases?.length ?? 0,
    taken,
    errors: errors.length ? errors : undefined,
    status,
  });
  return NextResponse.json({ created: taken, total: leases?.length ?? 0, errors });
}
