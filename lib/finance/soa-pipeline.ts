import type { SupabaseClient } from "@supabase/supabase-js";
import { recomputeTotalsFromLines, recalcTotals, type SoaType } from "@/lib/finance/soa";
import { generateSoaSummary } from "@/lib/ai/soa-summary";
import { renderSoaPdf, renderOwnerSoaPdf } from "@/lib/pdf/soa";
import { FINANCE_DOCS_BUCKET } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { archiveOwnerSoaToDrive, archiveTenantSoaToDrive } from "@/lib/archive";
import { createNotification } from "@/lib/notify";
import { sendEmail } from "@/lib/email";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://allabode.vercel.app").replace(/\/$/, "");
}

async function notifyOwner(
  supabase: SupabaseClient,
  ownerId: string | null,
  statementId: string,
  periodStart: string,
  periodEnd: string
) {
  if (!ownerId) return;
  const { data: owner } = await supabase
    .from("owners")
    .select("name,email,auth_user_id")
    .eq("id", ownerId)
    .maybeSingle();
  const row = owner as { name?: string | null; email?: string | null; auth_user_id?: string | null } | null;
  if (!row?.email && !row?.auth_user_id) return;

  const period = `${periodStart} to ${periodEnd}`;
  const title = "Statement of Account available";
  const body = `Your Statement of Account for ${period} is now available. Please check your owner dashboard.`;
  const link = `/dashboard/owner/statements/${statementId}`;

  if (row.auth_user_id) {
    await createNotification(supabase, {
      recipientUserId: row.auth_user_id,
      type: "statement_published",
      title,
      body,
      link,
      entityType: "statement",
      entityId: statementId,
      recipientEmail: row.email ?? undefined,
    });
    return;
  }
  if (row.email) {
    await sendEmail({
      to: row.email,
      subject: title,
      html: `<p>Hi ${row.name ?? "Owner"},</p><p>${body}</p><p><a href="${siteUrl()}${link}">View in dashboard</a></p>`,
    });
  }
}

/**
 * Approve-to-publish pipeline — callable from both cron and admin server actions.
 * Requires the SOA to already be in "approved" status.
 * Renders PDF, uploads, marks commissions applied, notifies owner, logs audit.
 */
export async function runSoaPublishPipeline(
  supabase: SupabaseClient,
  soaId: string,
  options?: { actorId?: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: stored } = await supabase
      .from("statements_of_account")
      .select("*")
      .eq("id", soaId)
      .maybeSingle();
    if (!stored) return { ok: false, error: "Statement not found" };
    if (stored.status !== "approved") {
      return { ok: false, error: `Statement status is "${stored.status}", expected "approved"` };
    }

    const { data: lineRows } = await supabase
      .from("soa_lines")
      .select("*")
      .eq("statement_id", soaId)
      .order("sort_order");

    const path = `soa/${soaId}.pdf`;
    let pdf: Buffer;
    let summary: string | null = null;
    let driveOwnerParams: { ownerName: string; propertyName?: string; unitLabel?: string } | null = null;
    let driveTenantName: string | null = null;

    if (stored.lease_id) {
      // ── Lease-based owner SOA ──
      const { totalIncome, totalDeductions, payout } = await recomputeTotalsFromLines(supabase, soaId);

      // Update totals to ensure they reflect current lines before publishing
      await supabase.from("statements_of_account").update({
        total_payments: totalIncome,
        total_expenses: totalDeductions,
        closing_balance: payout,
        net_remittance: payout,
      }).eq("id", soaId);

      const { data: leaseRow } = await supabase
        .from("leases")
        .select("rent_amount,lease_type,mgmt_fee_pct,vat_pct,unit_id")
        .eq("id", stored.lease_id)
        .maybeSingle();
      const lease = leaseRow as { rent_amount: number; lease_type: string; mgmt_fee_pct: number; vat_pct: number; unit_id: string } | null;

      const { data: unitRow } = lease
        ? await supabase.from("units").select("unit_label,property_id").eq("id", lease.unit_id).maybeSingle()
        : { data: null };
      const unit = unitRow as { unit_label: string; property_id: string } | null;

      const { data: propRow } = unit
        ? await supabase.from("properties").select("name,owner_id").eq("id", unit.property_id).maybeSingle()
        : { data: null };
      const prop = propRow as { name: string; owner_id: string } | null;

      const { data: ownerRow } = prop
        ? await supabase.from("owners").select("name").eq("id", prop.owner_id).maybeSingle()
        : { data: null };
      const ownerName = (ownerRow as { name?: string } | null)?.name ?? "Owner";

      driveOwnerParams = { ownerName, propertyName: prop?.name, unitLabel: unit?.unit_label };

      summary = await generateSoaSummary({
        type: "owner",
        party: ownerName,
        periodStart: stored.period_start,
        periodEnd: stored.period_end,
        totals: {
          opening_balance: 0, total_charges: 0,
          total_payments: totalIncome, total_expenses: totalDeductions,
          total_adjustments: 0, closing_balance: payout, net_remittance: payout,
        },
      });

      pdf = await renderOwnerSoaPdf({
        ownerName,
        propertyName: prop?.name ?? "Property",
        unitLabel:    unit?.unit_label ?? "",
        periodStart:  stored.period_start,
        periodEnd:    stored.period_end,
        monthlyRent:  Number(lease?.rent_amount ?? 0),
        payoutDueAt:  stored.payout_due_at ?? null,
        leaseType:    stored.lease_type ?? "long_term",
        mgmtFeePct:   Number(stored.mgmt_fee_amt && totalIncome
          ? (Number(stored.mgmt_fee_amt) / totalIncome * 100)
          : (lease?.mgmt_fee_pct ?? 5)),
        vatPct:       Number(lease?.vat_pct ?? 12),
        adjustments:  Number(stored.adjustments ?? 0),
        prevSoaRef:   stored.prev_soa_ref ?? null,
        payout,
        lines:        (lineRows ?? []) as never,
        summary,
      });
    } else {
      // ── Legacy per-owner/tenant SOA ──
      const type = stored.statement_type as SoaType;
      const { match } = await recalcTotals(supabase, stored);
      if (!match) {
        return { ok: false, error: "Totals no longer match the ledger — re-approve before publishing." };
      }

      const partyId = (type === "owner" ? stored.owner_id : stored.tenant_id) as string;
      const { data: partyRow } = type === "owner"
        ? await supabase.from("owners").select("name").eq("id", partyId).maybeSingle()
        : await supabase.from("tenants").select("name").eq("id", partyId).maybeSingle();
      const party = (partyRow as { name?: string } | null)?.name ?? (type === "owner" ? "Owner" : "Tenant");

      if (type === "owner") driveOwnerParams = { ownerName: party };
      else driveTenantName = party;

      const totals = {
        opening_balance:    Number(stored.opening_balance),
        total_charges:      Number(stored.total_charges),
        total_payments:     Number(stored.total_payments),
        total_expenses:     Number(stored.total_expenses),
        total_adjustments:  Number(stored.total_adjustments),
        closing_balance:    Number(stored.closing_balance),
        net_remittance:     Number(stored.net_remittance),
      };
      summary = await generateSoaSummary({ type, party, periodStart: stored.period_start, periodEnd: stored.period_end, totals });
      pdf = await renderSoaPdf({
        type, party, periodStart: stored.period_start, periodEnd: stored.period_end,
        lines: (lineRows ?? []) as never, totals, summary,
      });

      const col = type === "owner" ? "owner_id" : "tenant_id";
      await supabase.from("expenses")
        .update({ status: "locked", locked_at: new Date().toISOString() })
        .eq(col, partyId).eq("status", "posted")
        .gte("expense_date", stored.period_start).lte("expense_date", stored.period_end);
    }

    // Upload PDF
    const { error: upErr } = await supabase.storage
      .from(FINANCE_DOCS_BUCKET)
      .upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (upErr) {
      return { ok: false, error: `PDF upload failed: ${upErr.message}` };
    }

    // Publish
    await supabase.from("statements_of_account").update({
      status:       "published",
      pdf_path:     path,
      ai_summary:   summary,
      published_at: new Date().toISOString(),
      payout_status: "pending",
    }).eq("id", soaId);

    // Best-effort Google Drive archive
    try {
      const driveResult = driveOwnerParams
        ? await archiveOwnerSoaToDrive({ pdf, ...driveOwnerParams, periodStart: stored.period_start })
        : driveTenantName
        ? await archiveTenantSoaToDrive({ pdf, tenantName: driveTenantName, periodStart: stored.period_start })
        : null;
      if (driveResult) {
        await supabase.from("statements_of_account").update({
          gdrive_file_id:    driveResult.fileId,
          gdrive_folder_url: driveResult.folderUrl,
        }).eq("id", soaId);
      }
    } catch {
      // Never block publish for Drive failure
    }

    // Mark commissions applied
    const { data: commLines } = await supabase
      .from("soa_lines")
      .select("commission_id")
      .eq("statement_id", soaId)
      .in("line_type", ["info_commission", "deduction_commission"])
      .not("commission_id", "is", null);
    const commIds = ((commLines ?? []) as { commission_id: string | null }[])
      .map((l) => l.commission_id).filter(Boolean) as string[];
    if (commIds.length) {
      await supabase.from("lease_commissions")
        .update({ status: "applied", soa_id: soaId, applied_at: new Date().toISOString() })
        .in("id", commIds);
    }

    await logAudit(supabase, {
      action: "soa.published",
      entityType: "statement",
      entityId: soaId,
      actorId: options?.actorId,
    });

    // Notify owner
    if (stored.statement_type === "owner") {
      await notifyOwner(supabase, stored.owner_id as string | null, soaId, stored.period_start, stored.period_end);
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
