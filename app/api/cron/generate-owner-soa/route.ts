import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCronSecret, logCronRun } from "@/lib/cron";
import { computeOwnerSoaByLease } from "@/lib/finance/soa";
import { validateSoaForAutoApproval } from "@/lib/ai/soa-validate";
import { createNotification } from "@/lib/notify";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const deny = verifyCronSecret(req);
  if (deny) return deny;

  // Service-role client: no auth cookies in cron context, needs to bypass RLS
  const supabase = createServiceClient();
  const now  = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start = prev.toISOString().slice(0, 10);
  const end   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

  const { data: leases } = await supabase
    .from("leases")
    .select("id,unit_id,lease_type,mgmt_fee_pct,vat_pct,rent_amount,remittance_due_date")
    .in("status", ["active", "renewal_pending", "expiring"]);

  let taken = 0;
  let autoApproved = 0;
  let flagged = 0;
  const errors: string[] = [];

  // Find admin staff users for notifications
  const { data: staffRows } = await supabase
    .from("users")
    .select("id")
    .in("finance_role", ["maker", "checker"]);
  const staffIds = ((staffRows ?? []) as { id: string }[]).map((u) => u.id);

  for (const lease of (leases ?? []) as { id: string; mgmt_fee_pct: number; vat_pct: number; remittance_due_date?: string | null }[]) {
    // Skip if a SOA for this lease + period already exists
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
          owner_id:        computed.meta.ownerId,
          statement_type:  "owner",
          period_start:    start,
          period_end:      end,
          lease_id:        lease.id,
          lease_type:      computed.meta.leaseType,
          opening_balance: 0,
          total_payments:  computed.totals.total_payments,
          total_expenses:  computed.totals.total_expenses,
          net_remittance:  computed.totals.net_remittance,
          closing_balance: computed.totals.closing_balance,
          mgmt_fee_amt:    computed.meta.mgmtFeeAmt,
          vat_amt:         computed.meta.vatAmt,
          payout_due_at:   (lease as { remittance_due_date?: string | null }).remittance_due_date ?? null,
          status:          "generated",
          payout_status:   "pending",
        })
        .select("id")
        .single();

      if (soaErr || !soaRow) {
        errors.push(`lease ${lease.id}: ${soaErr?.message ?? "insert failed"}`);
        continue;
      }

      if (computed.lines.length > 0) {
        const { error: lineErr } = await supabase.from("soa_lines").insert(
          computed.lines.map((l) => ({
            statement_id:  soaRow.id,
            description:   l.description,
            amount:        l.amount,
            line_type:     l.line_type,
            sort_order:    l.sort_order,
            expense_id:    l.expense_id ?? null,
            receipt_path:  l.receipt_path ?? null,
            billing_note:  l.billing_note ?? null,
            commission_id: l.commission_id ?? null,  // Bug fix: was missing
            deposit_id:    l.deposit_id ?? null,
          }))
        );
        if (lineErr) errors.push(`lease ${lease.id} lines: ${lineErr.message}`);
      }

      taken++;

      // AI validation — determine if safe to auto-approve
      const prevSoaResult = await supabase
        .from("statements_of_account")
        .select("closing_balance")
        .eq("lease_id", lease.id)
        .eq("status", "published")
        .order("period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      const prevSoaPayout = (prevSoaResult.data as { closing_balance?: number } | null)?.closing_balance ?? null;

      const validation = await validateSoaForAutoApproval({
        totalIncome:     computed.totals.total_payments,
        totalDeductions: computed.totals.total_expenses,
        payout:          computed.totals.closing_balance,
        mgmtFeePct:      computed.meta.mgmtFeePct,
        vatPct:          computed.meta.vatPct,
        lines:           computed.lines,
        prevSoaPayout,
      });

      if (validation.safe) {
        // Auto-approve — admin reviews today; auto-publish cron fires tomorrow if enabled
        await supabase.from("statements_of_account")
          .update({ status: "approved" })
          .eq("id", soaRow.id);
        autoApproved++;

        // Notify staff the SOA is ready for review
        for (const staffId of staffIds) {
          await createNotification(supabase, {
            recipientUserId: staffId,
            type:       "soa_auto_approved",
            title:      "SOA ready for review",
            body:       `Owner SOA for ${start.slice(0, 7)} (lease ${lease.id.slice(0, 8)}…) was AI-approved. Review before it auto-publishes tomorrow.`,
            link:       `/admin/statements/${soaRow.id}`,
            entityType: "statement",
            entityId:   soaRow.id,
          });
        }
      } else {
        // Stays as "generated" — admin must review manually
        flagged++;
        const flagSummary = validation.flags.slice(0, 3).join("; ");

        for (const staffId of staffIds) {
          await createNotification(supabase, {
            recipientUserId: staffId,
            type:       "soa_flagged",
            title:      "SOA needs manual review",
            body:       `SOA for ${start.slice(0, 7)} (lease ${lease.id.slice(0, 8)}…) was flagged: ${flagSummary}`,
            link:       `/admin/statements/${soaRow.id}`,
            entityType: "statement",
            entityId:   soaRow.id,
          });
        }
      }
    } catch (e) {
      errors.push(`lease ${lease.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const status = errors.length === 0 ? "success" : taken > 0 ? "partial" : "failed";
  await logCronRun(supabase, "generate_owner_soa", {
    processed: leases?.length ?? 0,
    taken,
    errors: errors.length || autoApproved || flagged
      ? { errors: errors.length ? errors : undefined, autoApproved, flagged }
      : undefined,
    status,
  });
  return NextResponse.json({ created: taken, autoApproved, flagged, total: leases?.length ?? 0, errors });
}
