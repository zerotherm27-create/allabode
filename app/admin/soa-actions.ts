"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeSoa, precheckSoa, recalcTotals, computeOwnerSoaByLease, recomputeTotalsFromLines, type SoaType } from "@/lib/finance/soa";
import { generateSoaSummary } from "@/lib/ai/soa-summary";
import { renderSoaPdf, renderOwnerSoaPdf } from "@/lib/pdf/soa";
import { FINANCE_DOCS_BUCKET } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { archiveOwnerSoaToDrive, archiveTenantSoaToDrive } from "@/lib/archive";
import { createNotification } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { runSoaPublishPipeline } from "@/lib/finance/soa-pipeline";
import { validateSoaForAutoApproval } from "@/lib/ai/soa-validate";

function str(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://allabodeph.com").replace(/\/$/, "");
}

function revalidateOwnerStatementPaths(statementId: string) {
  revalidatePath("/dashboard/owner");
  revalidatePath(`/dashboard/owner/statements/${statementId}`);
}

async function notifyOwnerStatementAvailable(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

// ---- Generate a draft statement (deterministic totals from the DB) ----
export async function generateStatement(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const type = (str(formData, "statement_type") as SoaType) ?? "owner";
  const partyId = str(formData, "party_id");
  const periodStart = str(formData, "period_start");
  const periodEnd = str(formData, "period_end");
  if (!partyId || !periodStart || !periodEnd) throw new Error("Party and period are required.");

  const pre = await precheckSoa(supabase, { type, partyId, periodStart, periodEnd });
  if (!pre.ok) throw new Error(`Pre-check failed: ${pre.issues.join(" ")}`);

  const { totals, lines } = await computeSoa(supabase, type, partyId, periodStart, periodEnd);

  const { data: stmt, error } = await supabase
    .from("statements_of_account")
    .insert({
      statement_type: type,
      owner_id: type === "owner" ? partyId : null,
      tenant_id: type === "tenant" ? partyId : null,
      period_start: periodStart,
      period_end: periodEnd,
      ...totals,
      status: "generated",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const id = stmt.id as string;
  await supabase.from("soa_lines").insert(lines.map((l) => ({ ...l, statement_id: id })));
  await logAudit(supabase, { action: "soa.generated", entityType: "statement", entityId: id, actorId: user?.id, metadata: { type, partyId } });
  revalidatePath("/admin/statements");
  redirect(`/admin/statements/${id}`);
}

export async function submitForReview(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("statements_of_account").update({ status: "checker_review" }).eq("id", id);
  await logAudit(supabase, { action: "soa.submitted_for_review", entityType: "statement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/statements/${id}`);
}

// ---- Checker approves: deterministic recalc gate + maker-checker (when configured) ----
export async function approveStatement(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: stored } = await supabase.from("statements_of_account").select("*").eq("id", id).maybeSingle();
  if (!stored) throw new Error("Statement not found");

  // For lease-based SOAs: recompute totals from lines (admin edited them in review).
  // For legacy SOAs: use ledger recalc.
  if (stored.lease_id) {
    const { totalIncome, totalDeductions, payout } = await recomputeTotalsFromLines(supabase, id);
    await supabase.from("statements_of_account").update({
      total_payments: totalIncome,
      total_expenses: totalDeductions,
      closing_balance: payout,
      net_remittance: payout,
    }).eq("id", id);
  } else {
    const { match } = await recalcTotals(supabase, stored);
    if (!match) throw new Error("Totals no longer match the ledger — regenerate before approving.");
  }

  // Maker-checker: block self-approval only when another finance checker exists.
  if (stored.created_by && stored.created_by === user?.id) {
    const { data: checkers } = await supabase
      .from("users").select("id").eq("finance_role", "checker").neq("id", user?.id ?? "");
    if (checkers && checkers.length) {
      throw new Error("Maker-checker: a different finance checker must approve this statement.");
    }
  }

  await supabase.from("statements_of_account")
    .update({ status: "approved", approved_by: user?.id ?? null, approved_at: new Date().toISOString() })
    .eq("id", id);
  await logAudit(supabase, { action: "soa.approved", entityType: "statement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/statements/${id}`);
}

// ---- Publish: delegates to runSoaPublishPipeline ----
export async function publishStatement(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const result = await runSoaPublishPipeline(supabase, id, { actorId: user?.id });
  if (!result.ok) throw new Error(result.error ?? "Publish failed");

  revalidatePath(`/admin/statements/${id}`);
  revalidatePath("/admin/statements");

  const { data: s } = await supabase.from("statements_of_account").select("statement_type").eq("id", id).maybeSingle();
  if ((s as { statement_type?: string } | null)?.statement_type === "owner") revalidateOwnerStatementPaths(id);
}

export async function voidStatement(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: s } = await supabase.from("statements_of_account").select("statement_type").eq("id", id).maybeSingle();
  const reason = str(formData, "reason") ?? "Voided";
  await supabase.from("statements_of_account").update({ status: "voided" }).eq("id", id);
  await logAudit(supabase, { action: "soa.voided", entityType: "statement", entityId: id, actorId: user?.id, metadata: { reason } });
  revalidatePath(`/admin/statements/${id}`);
  revalidatePath("/admin/statements");
  if ((s as { statement_type?: string } | null)?.statement_type === "owner") revalidateOwnerStatementPaths(id);
}

export async function reopenStatement(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: s } = await supabase.from("statements_of_account").select("status,statement_type").eq("id", id).maybeSingle();
  if (!s) throw new Error("Statement not found.");
  if (s.status !== "approved" && s.status !== "published") {
    throw new Error("Only approved or published statements can be re-opened.");
  }

  await supabase.from("statements_of_account").update({
    status:       "generated",
    approved_by:  null,
    approved_at:  null,
    published_at: null,
    pdf_path:     null,
    payout_status: null,
    ai_summary:   null,
  }).eq("id", id);

  await logAudit(supabase, { action: "soa.reopened", entityType: "statement", entityId: id, actorId: user?.id, metadata: { from_status: s.status } });
  revalidatePath(`/admin/statements/${id}`);
  if ((s as { statement_type?: string }).statement_type === "owner") revalidateOwnerStatementPaths(id);
}

export async function deleteStatement(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Only allow deleting draft/generated or voided SOAs — published ones have an audit trail.
  const { data: s } = await supabase.from("statements_of_account").select("status").eq("id", id).maybeSingle();
  if (!s) throw new Error("Statement not found.");
  if (s.status === "published" || s.status === "approved" || s.status === "checker_review") {
    throw new Error("Only generated or voided statements can be deleted. Void it first.");
  }

  await supabase.from("soa_lines").delete().eq("statement_id", id);
  await supabase.from("statements_of_account").delete().eq("id", id);
  await logAudit(supabase, { action: "soa.deleted", entityType: "statement", entityId: id, actorId: user?.id });
  revalidatePath("/admin/statements");
  redirect("/admin/statements");
}

// ─────────────────────────────────────────────────────────────────
// Lease-based owner SOA generation
// ─────────────────────────────────────────────────────────────────

export async function generateOwnerSoaByLease(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const leaseId    = str(formData, "lease_id");
  const periodStart = str(formData, "period_start");
  const periodEnd   = str(formData, "period_end");
  if (!leaseId || !periodStart || !periodEnd) throw new Error("Lease and period are required.");

  // Check no duplicate for this lease + period
  const { count } = await supabase.from("statements_of_account")
    .select("id", { count: "exact", head: true })
    .eq("lease_id", leaseId)
    .eq("period_start", periodStart)
    .neq("status", "voided");
  if (count && count > 0) redirect("/admin/statements?genError=An+SOA+for+this+lease+and+period+already+exists.");

  const { totals, lines, meta } = await computeOwnerSoaByLease(supabase, leaseId, periodStart, periodEnd);
  const { data: leaseDefaults } = await supabase
    .from("leases")
    .select("remittance_due_date")
    .eq("id", leaseId)
    .maybeSingle();

  const { data: stmt, error } = await supabase
    .from("statements_of_account")
    .insert({
      statement_type: "owner",
      owner_id:       meta.ownerId,
      property_id:    meta.propertyId,
      unit_id:        meta.unitId,
      lease_id:       leaseId,
      lease_type:     meta.leaseType,
      mgmt_fee_amt:   meta.mgmtFeeAmt,
      vat_amt:        meta.vatAmt,
      period_start:   periodStart,
      period_end:     periodEnd,
      payout_due_at:   (leaseDefaults as { remittance_due_date?: string | null } | null)?.remittance_due_date ?? null,
      ...totals,
      status:         "generated",
      created_by:     user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const soaId = stmt.id as string;
  if (lines.length) {
    const { error: linesError } = await supabase.from("soa_lines").insert(
      lines.map((l) => ({
        statement_id:  soaId,
        line_type:     l.line_type,
        description:   l.description,
        amount:        l.amount,
        sort_order:    l.sort_order,
        expense_id:    (l as { expense_id?: string | null }).expense_id ?? null,
        receipt_path:  (l as { receipt_path?: string | null }).receipt_path ?? null,
        billing_note:  (l as { billing_note?: string | null }).billing_note ?? null,
        commission_id: (l as { commission_id?: string | null }).commission_id ?? null,
        deposit_id:    (l as { deposit_id?: string | null }).deposit_id ?? null,
      }))
    );
    if (linesError) {
      // Statement row would otherwise be left with computed totals but no
      // supporting lines — clean it up rather than leave an inconsistent SOA.
      await supabase.from("statements_of_account").delete().eq("id", soaId);
      throw new Error(`Failed to save SOA lines: ${linesError.message}`);
    }
  }

  await logAudit(supabase, { action: "soa.generated", entityType: "statement", entityId: soaId, actorId: user?.id, metadata: { leaseId } });
  revalidatePath("/admin/statements");
  redirect(`/admin/statements/${soaId}`);
}

// ─────────────────────────────────────────────────────────────────
// Regenerate lines for an existing SOA (e.g. after entering a late receipt)
// ─────────────────────────────────────────────────────────────────

export async function regenerateSoaLines(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: s } = await supabase
    .from("statements_of_account")
    .select("lease_id,status,period_start,period_end")
    .eq("id", id)
    .maybeSingle();
  if (!s) throw new Error("Statement not found.");
  if (!s.lease_id) throw new Error("Only lease-based SOAs can be regenerated.");
  if (s.status === "published") throw new Error("Cannot regenerate a published SOA — re-open it first.");

  // Delete existing lines and recompute from current DB state
  await supabase.from("soa_lines").delete().eq("statement_id", id);

  const computed = await computeOwnerSoaByLease(supabase, s.lease_id, s.period_start, s.period_end);

  if (computed.lines.length > 0) {
    const { error: linesError } = await supabase.from("soa_lines").insert(
      computed.lines.map((l) => ({
        statement_id:  id,
        line_type:     l.line_type,
        description:   l.description,
        amount:        l.amount,
        sort_order:    l.sort_order,
        expense_id:    l.expense_id ?? null,
        receipt_path:  l.receipt_path ?? null,
        billing_note:  l.billing_note ?? null,
        commission_id: l.commission_id ?? null,
        deposit_id:    l.deposit_id ?? null,
      }))
    );
    // Old lines are already deleted above — don't overwrite the statement's
    // totals to match lines that failed to save, and surface the failure
    // instead of leaving a payout with no supporting line items.
    if (linesError) throw new Error(`Failed to save SOA lines: ${linesError.message}`);
  }

  // Update totals from recomputed lines and re-run AI validation
  await supabase.from("statements_of_account").update({
    total_payments:  computed.totals.total_payments,
    total_expenses:  computed.totals.total_expenses,
    closing_balance: computed.totals.closing_balance,
    net_remittance:  computed.totals.net_remittance,
    mgmt_fee_amt:    computed.meta.mgmtFeeAmt,
    vat_amt:         computed.meta.vatAmt,
    status:          "generated",
  }).eq("id", id);

  // Re-run AI validation to determine if still auto-approvable
  const validation = await validateSoaForAutoApproval({
    totalIncome:     computed.totals.total_payments,
    totalDeductions: computed.totals.total_expenses,
    payout:          computed.totals.closing_balance,
    mgmtFeePct:      computed.meta.mgmtFeePct,
    vatPct:          computed.meta.vatPct,
    lines:           computed.lines,
  });

  if (validation.safe) {
    await supabase.from("statements_of_account").update({ status: "approved" }).eq("id", id);
  }

  await logAudit(supabase, {
    action: "soa.regenerated",
    entityType: "statement",
    entityId: id,
    actorId: user?.id,
    metadata: { newStatus: validation.safe ? "approved" : "generated" },
  });
  revalidatePath(`/admin/statements/${id}`);
}

// ─────────────────────────────────────────────────────────────────
// Review editing (editable lines + meta)
// ─────────────────────────────────────────────────────────────────

export async function saveOwnerSoaReview(id: string, formData: FormData) {
  const supabase = await createClient();

  // Update editable line amounts (utility + recurring expense + manual)
  const lineIdsRaw = (str(formData, "editable_line_ids") ?? "").split(",").filter(Boolean);
  for (let i = 0; i < lineIdsRaw.length; i++) {
    const lineId = lineIdsRaw[i];
    const amt = parseFloat((formData.get(`line_amount_${i}`) as string | null) ?? "0");
    const note = ((formData.get(`line_note_${i}`) as string | null) ?? "").trim();
    if (!isNaN(amt)) {
      await supabase.from("soa_lines").update({
        amount:       -Math.abs(amt),
        billing_note: note || null,
      }).eq("id", lineId).in("line_type", ["deduction_utility", "deduction_expense_recurring", "deduction_mgmt_fee", "deduction_vat"]);
    }
  }

  // Delete removed one-time expense lines
  const deletedIds = (str(formData, "deleted_line_ids") ?? "").split(",").filter(Boolean);
  for (const dId of deletedIds) {
    await supabase.from("soa_lines").delete().eq("id", dId).eq("line_type", "deduction_expense_manual");
  }

  // Add new one-time expense lines
  const newCount = parseInt((formData.get("new_expense_count") as string | null) ?? "0", 10);
  const newLines: Record<string, unknown>[] = [];
  const { data: maxRow } = await supabase.from("soa_lines").select("sort_order").eq("statement_id", id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  let maxSort = Number((maxRow as { sort_order?: number } | null)?.sort_order ?? 900);
  for (let i = 0; i < newCount; i++) {
    const desc = ((formData.get(`new_desc_${i}`) as string | null) ?? "").trim();
    const amt  = parseFloat((formData.get(`new_amount_${i}`) as string | null) ?? "0");
    if (desc && !isNaN(amt) && amt !== 0) {
      newLines.push({ statement_id: id, line_type: "deduction_expense_manual", description: desc, amount: -Math.abs(amt), sort_order: ++maxSort });
    }
  }
  if (newLines.length) await supabase.from("soa_lines").insert(newLines);

  // SOA meta fields
  const adjustments  = parseFloat((formData.get("adjustments") as string | null) ?? "0");
  const prevSoaRef   = ((formData.get("prev_soa_ref") as string | null) ?? "").trim() || null;
  const payoutDueAt  = ((formData.get("payout_due_at") as string | null) ?? "").trim() || null;

  // Recompute totals from current lines
  const { data: allLines } = await supabase.from("soa_lines").select("amount,line_type").eq("statement_id", id);
  const all = (allLines ?? []) as { amount: number; line_type: string }[];
  const totalIncome     = all.filter((l) => l.line_type.startsWith("income_")).reduce((s, l) => s + Number(l.amount), 0);
  const totalDeductions = all.filter((l) => l.line_type.startsWith("deduction_")).reduce((s, l) => s + Math.abs(Number(l.amount)), 0);
  const adj = isNaN(adjustments) ? 0 : adjustments;
  const payout = totalIncome - totalDeductions + adj;

  await supabase.from("statements_of_account").update({
    total_payments:  totalIncome,
    total_expenses:  totalDeductions,
    closing_balance: payout,
    net_remittance:  payout,
    adjustments:     adj,
    prev_soa_ref:    prevSoaRef,
    payout_due_at:   payoutDueAt,
    status:          "generated",
  }).eq("id", id);

  revalidatePath(`/admin/statements/${id}`);
}

// ─────────────────────────────────────────────────────────────────
// Payout tracking
// ─────────────────────────────────────────────────────────────────

export async function markSoaProcessing(id: string) {
  const supabase = await createClient();
  await supabase.from("statements_of_account").update({ payout_status: "processing" }).eq("id", id);
  revalidatePath(`/admin/statements/${id}`);
}

export async function markSoaPaid(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const file = formData.get("slip") as File | null;

  let slipUrl: string | null = null;
  if (file && file.size > 0) {
    const ext  = file.name.split(".").pop() ?? "pdf";
    const path = `payout-slips/${id}.${ext}`;
    const buf  = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from(FINANCE_DOCS_BUCKET).upload(path, buf, { contentType: file.type, upsert: true });
    if (upErr) throw new Error(`Slip upload failed: ${upErr.message}`);
    slipUrl = path;
  }

  await supabase.from("statements_of_account").update({
    payout_status:    "paid",
    payout_slip_url:  slipUrl,
    paid_at:          new Date().toISOString(),
  }).eq("id", id);

  await logAudit(supabase, { action: "soa.payout_marked_paid", entityType: "statement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/statements/${id}`);
}

export async function carryForwardSoa(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: s } = await supabase
    .from("statements_of_account")
    .select("status,closing_balance,statement_type")
    .eq("id", id).maybeSingle();
  if (!s) throw new Error("Statement not found.");
  if (s.status !== "published") throw new Error("Only published statements can be carried forward.");
  if (Number(s.closing_balance) >= 0) throw new Error("Carry forward only applies to negative payouts.");

  await supabase.from("statements_of_account")
    .update({ payout_status: "carried_forward" })
    .eq("id", id);
  await logAudit(supabase, { action: "soa.carried_forward", entityType: "statement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/statements/${id}`);
  if ((s as { statement_type?: string }).statement_type === "owner") revalidateOwnerStatementPaths(id);
}

export async function markMultipleSoasPaid(soaIds: string[], formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const file = formData.get("slip") as File | null;

  let slipUrl: string | null = null;
  if (file && file.size > 0) {
    const ext  = file.name.split(".").pop() ?? "pdf";
    const path = `payout-slips/combined-${Date.now()}.${ext}`;
    const buf  = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from(FINANCE_DOCS_BUCKET).upload(path, buf, { contentType: file.type, upsert: true });
    if (upErr) throw new Error(`Slip upload failed: ${upErr.message}`);
    slipUrl = path;
  }

  const now = new Date().toISOString();
  for (const id of soaIds) {
    await supabase.from("statements_of_account").update({
      payout_status:   "paid",
      payout_slip_url: slipUrl,
      paid_at:         now,
    }).eq("id", id);
    await logAudit(supabase, { action: "soa.payout_marked_paid", entityType: "statement", entityId: id, actorId: user?.id });
  }
  if (soaIds[0]) revalidatePath(`/admin/statements/${soaIds[0]}`);
}
