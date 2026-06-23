"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeSoa, precheckSoa, recalcTotals, type SoaType } from "@/lib/finance/soa";
import { generateSoaSummary } from "@/lib/ai/soa-summary";
import { renderSoaPdf } from "@/lib/pdf/soa";
import { FINANCE_DOCS_BUCKET } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

function str(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

// ---- Generate a draft statement (deterministic totals from the DB) ----
export async function generateStatement(formData: FormData) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();

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
  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  await supabase.from("statements_of_account").update({ status: "checker_review" }).eq("id", id);
  await logAudit(supabase, { action: "soa.submitted_for_review", entityType: "statement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/statements/${id}`);
}

// ---- Checker approves: deterministic recalc gate + maker-checker (when configured) ----
export async function approveStatement(id: string) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();

  const { data: stored } = await supabase.from("statements_of_account").select("*").eq("id", id).maybeSingle();
  if (!stored) throw new Error("Statement not found");

  const { match } = await recalcTotals(supabase, stored);
  if (!match) throw new Error("Totals no longer match the ledger — regenerate before approving.");

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

// ---- Publish: render PDF, store privately, lock period expenses, expose to portal ----
export async function publishStatement(id: string) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();

  const { data: stored } = await supabase.from("statements_of_account").select("*").eq("id", id).maybeSingle();
  if (!stored) throw new Error("Statement not found");
  if (stored.status !== "approved") throw new Error("Statement must be approved before publishing.");

  const { match } = await recalcTotals(supabase, stored);
  if (!match) throw new Error("Totals no longer match the ledger — re-approve before publishing.");

  const type = stored.statement_type as SoaType;
  const partyId = (type === "owner" ? stored.owner_id : stored.tenant_id) as string;
  const { data: partyRow } = type === "owner"
    ? await supabase.from("owners").select("name").eq("id", partyId).maybeSingle()
    : await supabase.from("tenants").select("name").eq("id", partyId).maybeSingle();
  const party = (partyRow as { name?: string } | null)?.name ?? (type === "owner" ? "Owner" : "Tenant");

  const { data: lineRows } = await supabase.from("soa_lines").select("*").eq("statement_id", id).order("sort_order");
  const totals = {
    opening_balance: Number(stored.opening_balance), total_charges: Number(stored.total_charges),
    total_payments: Number(stored.total_payments), total_expenses: Number(stored.total_expenses),
    total_adjustments: Number(stored.total_adjustments), closing_balance: Number(stored.closing_balance),
    net_remittance: Number(stored.net_remittance),
  };

  const summary = await generateSoaSummary({ type, party, periodStart: stored.period_start, periodEnd: stored.period_end, totals });

  const pdf = await renderSoaPdf({
    type, party, periodStart: stored.period_start, periodEnd: stored.period_end,
    lines: (lineRows ?? []) as never, totals, summary,
  });

  const path = `soa/${id}.pdf`;
  const { error: upErr } = await supabase.storage
    .from(FINANCE_DOCS_BUCKET)
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(`PDF upload failed: ${upErr.message}. Make sure the private "finance-docs" bucket exists.`);

  await supabase.from("statements_of_account")
    .update({ status: "published", pdf_path: path, ai_summary: summary, published_at: new Date().toISOString() })
    .eq("id", id);

  // Lock the period's posted expenses for this party (spec §10.8 step 9).
  const col = type === "owner" ? "owner_id" : "tenant_id";
  await supabase.from("expenses")
    .update({ status: "locked", locked_at: new Date().toISOString() })
    .eq(col, partyId).eq("status", "posted")
    .gte("expense_date", stored.period_start).lte("expense_date", stored.period_end);

  await logAudit(supabase, { action: "soa.published", entityType: "statement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/statements/${id}`);
  revalidatePath("/admin/statements");
}

export async function voidStatement(id: string, formData: FormData) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();
  const reason = str(formData, "reason") ?? "Voided";
  await supabase.from("statements_of_account").update({ status: "voided" }).eq("id", id);
  await logAudit(supabase, { action: "soa.voided", entityType: "statement", entityId: id, actorId: user?.id, metadata: { reason } });
  revalidatePath(`/admin/statements/${id}`);
  revalidatePath("/admin/statements");
}
