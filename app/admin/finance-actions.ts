"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai/client";
import { extractReceipt, isImageMime } from "@/lib/ai/receipts";
import { runValidations } from "@/lib/finance/validation";
import { postExpenseToLedger, type PostableExpense } from "@/lib/finance/ledger";
import { RECEIPTS_BUCKET } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

const HIGH_RISK = new Set(["high", "critical"]);
const APPROVAL_THRESHOLD = 10000; // ₱ — above this, approval_required flag is set

// ---- coercion helpers ----
function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}
function n(fd: FormData, k: string): number | null {
  const v = s(fd, k);
  if (v == null) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

// ============================================================
// Upload → triggers AI extraction + validation
// ============================================================
export async function uploadReceipt(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Please choose a file.");

  const buf = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buf).digest("hex");
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${new Date().toISOString().slice(0, 10)}/${hash.slice(0, 16)}-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, buf, { contentType: file.type || "application/octet-stream", upsert: false });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}. Make sure the private "receipts" bucket exists.`);

  const { data: row, error } = await supabase
    .from("receipt_uploads")
    .insert({
      uploaded_by: user?.id ?? null,
      file_path: path,
      file_name: file.name,
      file_mime_type: file.type || null,
      file_size: file.size,
      file_hash_sha256: hash,
      source: "upload",
      status: "uploaded",
      related_property_id: s(formData, "related_property_id"),
      related_owner_id: s(formData, "related_owner_id"),
      related_vendor_id: s(formData, "related_vendor_id"),
      notes: s(formData, "notes"),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const id = row.id as string;
  await logAudit(supabase, { action: "receipt.uploaded", entityType: "receipt_upload", entityId: id, actorId: user?.id });
  await runExtraction(id);
  revalidatePath("/admin/receipts");
  redirect(`/admin/receipts/${id}`);
}

// ============================================================
// AI extraction + deterministic validation (re-runnable)
// ============================================================
export async function runExtraction(id: string) {
  const supabase = await createClient();
  const { data: r } = await supabase.from("receipt_uploads").select("*").eq("id", id).maybeSingle();
  if (!r) return;

  // Clear any prior extraction/validation for a clean re-run.
  await supabase.from("receipt_extractions").delete().eq("receipt_upload_id", id);
  await supabase.from("receipt_validation_results").delete().eq("receipt_upload_id", id);

  // No AI key or non-image file → route straight to manual review (never guess).
  if (!isAiConfigured() || !isImageMime(r.file_mime_type)) {
    await supabase.from("receipt_uploads")
      .update({ status: "needs_review", scan_status: isImageMime(r.file_mime_type) ? "pending" : "scan_failed" })
      .eq("id", id);
    revalidatePath(`/admin/receipts/${id}`);
    return;
  }

  await supabase.from("receipt_uploads").update({ status: "scanning", scan_status: "scanning" }).eq("id", id);

  const { data: file } = await supabase.storage.from(RECEIPTS_BUCKET).download(r.file_path);
  if (!file) {
    await supabase.from("receipt_uploads").update({ status: "scan_failed", scan_status: "scan_failed" }).eq("id", id);
    return;
  }

  let extraction;
  try {
    extraction = await extractReceipt(Buffer.from(await file.arrayBuffer()), r.file_mime_type as string);
  } catch {
    await supabase.from("receipt_uploads").update({ status: "scan_failed", scan_status: "scan_failed" }).eq("id", id);
    return;
  }

  await supabase.from("receipt_extractions").insert({
    receipt_upload_id: id,
    provider: extraction.provider,
    model_name: extraction.model_name,
    prompt_version: extraction.prompt_version,
    raw_ai_json: extraction.raw_ai_json,
    normalized_json: extraction.normalized_json,
    extraction_confidence: extraction.confidence,
    warnings: extraction.warnings,
  });

  // Duplicate detection (by file hash; vendor+total handled at review time).
  const { data: hashDup } = await supabase
    .from("receipt_uploads").select("id").eq("file_hash_sha256", r.file_hash_sha256).neq("id", id).limit(1);

  const outcome = runValidations({
    normalized: extraction.normalized_json as never,
    confidence: extraction.confidence,
    duplicate: { byHash: !!(hashDup && hashDup.length), byVendorTotal: false },
  });

  if (outcome.results.length) {
    await supabase.from("receipt_validation_results").insert(
      outcome.results.map((v) => ({
        receipt_upload_id: id,
        validation_rule_code: v.code,
        severity: v.severity,
        passed: v.passed,
        message: v.message,
      }))
    );
  }

  await supabase.from("receipt_uploads")
    .update({ status: outcome.status, scan_status: "scanned", overall_confidence: extraction.confidence, risk_level: outcome.risk })
    .eq("id", id);
  await logAudit(supabase, {
    action: "receipt.ai_extracted", entityType: "receipt_upload", entityId: id,
    metadata: { risk: outcome.risk, status: outcome.status },
  });
  revalidatePath(`/admin/receipts/${id}`);
}

// ============================================================
// Reviewer approves the extraction → creates a draft expense
// ============================================================
export async function approveExtraction(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const total = n(formData, "total_amount") ?? 0;
  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      receipt_upload_id: id,
      vendor_id: s(formData, "vendor_id"),
      property_id: s(formData, "property_id"),
      unit_id: s(formData, "unit_id"),
      owner_id: s(formData, "owner_id"),
      tenant_id: s(formData, "tenant_id"),
      expense_date: s(formData, "expense_date") ?? new Date().toISOString().slice(0, 10),
      category: s(formData, "category") ?? "Uncategorized",
      description: s(formData, "description"),
      amount: n(formData, "amount") ?? total,
      vat_amount: n(formData, "vat_amount") ?? 0,
      total_amount: total,
      charge_to: s(formData, "charge_to") ?? "company",
      status: "pending_approval",
      approval_required: total >= APPROVAL_THRESHOLD,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("receipt_uploads").update({ status: "reviewed" }).eq("id", id);
  await logAudit(supabase, {
    action: "expense.created", entityType: "expense", entityId: expense.id as string, actorId: user?.id,
    metadata: { receipt_upload_id: id, total },
  });
  revalidatePath("/admin/receipts");
  revalidatePath("/admin/expenses");
  redirect("/admin/expenses");
}

// ============================================================
// Checker posts an approved expense → ledger (maker-checker)
// ============================================================
export async function postExpense(expenseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: e } = await supabase.from("expenses").select("*").eq("id", expenseId).maybeSingle();
  if (!e) throw new Error("Expense not found");
  if (e.status === "posted" || e.status === "locked") return;

  // Maker-checker: a different staff member must post a high-risk receipt's expense.
  if (e.receipt_upload_id) {
    const { data: rcpt } = await supabase
      .from("receipt_uploads").select("uploaded_by,risk_level").eq("id", e.receipt_upload_id).maybeSingle();
    if (rcpt && HIGH_RISK.has(rcpt.risk_level) && rcpt.uploaded_by && rcpt.uploaded_by === user?.id) {
      throw new Error("Maker-checker: a different staff member must post this high-risk expense.");
    }
  }

  await postExpenseToLedger(supabase, e as PostableExpense);
  const now = new Date().toISOString();
  await supabase.from("expenses")
    .update({ status: "posted", approved_by: user?.id ?? null, approved_at: now, posted_by: user?.id ?? null, posted_at: now })
    .eq("id", expenseId);
  if (e.receipt_upload_id) {
    await supabase.from("receipt_uploads").update({ status: "posted" }).eq("id", e.receipt_upload_id);
  }
  await logAudit(supabase, {
    action: "expense.posted", entityType: "expense", entityId: expenseId, actorId: user?.id,
    metadata: { total: e.total_amount },
  });
  revalidatePath("/admin/expenses");
}

// ============================================================
// Reject / void a receipt
// ============================================================
export async function rejectReceipt(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const reason = s(formData, "reason") ?? "Rejected";
  await supabase.from("receipt_uploads").update({ status: "rejected", notes: reason }).eq("id", id);
  await logAudit(supabase, { action: "receipt.rejected", entityType: "receipt_upload", entityId: id, actorId: user?.id, metadata: { reason } });
  revalidatePath("/admin/receipts");
  redirect("/admin/receipts");
}
