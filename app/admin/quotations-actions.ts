"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getPublicSiteUrl } from "@/lib/url";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { signedUrl, AGREEMENTS_BUCKET } from "@/lib/storage";
import { completeQuotation } from "@/lib/quotation/complete";
import { draftQuotationScope, type QuotationScopeInput } from "@/lib/ai/quotation-scope";
import type { QuotationLineItem, ProgressMilestone } from "@/lib/quotation/totals";

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

function recipientDetailsFromForm(fd: FormData, recipientEmail: string | null, existing: Record<string, unknown> = {}) {
  return {
    ...existing,
    name: s(fd, "recipient_name_hint") ?? "",
    address: s(fd, "recipient_address_hint") ?? "",
    phone: s(fd, "recipient_phone_hint") ?? "",
    email: recipientEmail ?? "",
  };
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

const COMPANY_LINK_VALIDITY_DAYS = 14;

/** Staff-authored quotation fields, shared by create + update. */
function parseTerms(fd: FormData) {
  let lineItems: QuotationLineItem[] = [];
  try {
    const raw = s(fd, "line_items");
    if (raw) lineItems = JSON.parse(raw) as QuotationLineItem[];
  } catch {
    throw new Error("The line items could not be read — please re-check the rows.");
  }

  let progressMilestones: ProgressMilestone[] = [];
  try {
    const raw = s(fd, "progress_milestones");
    if (raw) progressMilestones = JSON.parse(raw) as ProgressMilestone[];
  } catch {
    throw new Error("The payment milestones could not be read — please re-check the rows.");
  }

  const paymentTermsType = s(fd, "payment_terms_type");
  if (paymentTermsType && paymentTermsType !== "cash" && paymentTermsType !== "progress_billing") {
    throw new Error("Invalid payment terms type.");
  }

  const grandTotalOverrideRaw = s(fd, "grand_total_override");
  const grandTotalOverride = grandTotalOverrideRaw != null ? Number(grandTotalOverrideRaw) : null;
  if (grandTotalOverride != null && !Number.isFinite(grandTotalOverride)) {
    throw new Error("Invalid grand total override.");
  }

  return {
    quotation_date: s(fd, "quotation_date"),
    valid_until: s(fd, "valid_until"),
    title: s(fd, "title"),
    property_reference: s(fd, "property_reference"),
    unit_id: s(fd, "unit_id"),
    line_items: lineItems,
    grand_total_override: grandTotalOverride,
    scope_of_work: s(fd, "scope_of_work"),
    notes: s(fd, "notes"),
    payment_terms_type: paymentTermsType,
    payment_terms_notes: s(fd, "payment_terms_notes"),
    progress_milestones: progressMilestones,
    terms_payment: s(fd, "terms_payment"),
    terms_completion: s(fd, "terms_completion"),
    terms_warranty: s(fd, "terms_warranty"),
    terms_validity: s(fd, "terms_validity"),
  };
}

// ============================================================
// Create + sign-as-company + send links
// ============================================================

export async function createQuotation(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const recipientEmail = s(fd, "recipient_email");
  if (!recipientEmail) throw new Error("Recipient email is required.");

  const { data: quotationNumber, error: numErr } = await supabase.rpc("generate_quotation_number");
  if (numErr || !quotationNumber) throw new Error(numErr?.message ?? "Could not generate a quotation number.");

  const { data, error } = await supabase
    .from("quotations")
    .insert({
      quotation_number: quotationNumber as string,
      recipient_email: recipientEmail,
      recipient_name_hint: s(fd, "recipient_name_hint"),
      recipient_phone_hint: s(fd, "recipient_phone_hint"),
      recipient_address_hint: s(fd, "recipient_address_hint"),
      recipient_details: recipientDetailsFromForm(fd, recipientEmail),
      created_by: user?.id ?? null,
      ...parseTerms(fd),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const id = data.id as string;
  await logAudit(supabase, { action: "quotation.created", entityType: "quotation", entityId: id, actorId: user?.id });

  // Stays at 'draft' — no email goes out until staff sign as company (in-dashboard
  // or via a remote pre-sign link) and then explicitly send the recipient link.
  revalidatePath("/admin/quotations");
  redirect(`/admin/quotations/${id}`);
}

/**
 * Issues (or re-issues) the remote pre-signing link sent to a colleague
 * signatory. Each send refreshes the link's validity window. Only usable
 * while the quotation is still a draft — the company signature must land
 * before the recipient is ever sent anything.
 */
export async function sendQuotationCompanyLink(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: q, error } = await supabase
    .from("quotations")
    .select("status,company_access_token,company_email,company_name_hint,company_signature_data,title")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!q) throw new Error("Quotation not found.");
  if (q.status !== "draft") {
    throw new Error("The pre-signing link can only be sent while the quotation is still a draft.");
  }
  if (q.company_signature_data) {
    throw new Error("The company signature is already in place.");
  }

  const companyEmail = s(fd, "company_email") ?? q.company_email;
  if (!companyEmail) throw new Error("Enter the signatory's email address first.");
  const companyNameHint = s(fd, "company_name_hint") ?? q.company_name_hint;

  const expiresAt = new Date(Date.now() + COMPANY_LINK_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error: upErr } = await supabase.from("quotations").update({
    company_token_expires_at: expiresAt,
    company_email: companyEmail,
    company_name_hint: companyNameHint,
  }).eq("id", id);
  if (upErr) throw new Error(upErr.message);

  const link = `${getPublicSiteUrl()}/sign/quotation/company/${q.company_access_token}`;
  await sendEmail({
    to: companyEmail,
    subject: `Quotation${q.title ? ` — ${q.title}` : ""} ready for your signature`,
    html: `
      <p>Hi ${companyNameHint ?? "there"},</p>
      <p>A quotation${q.title ? ` (${q.title})` : ""} is ready for your review and signature as company representative, before it goes out to the client.</p>
      <p><a href="${link}">Review and sign the quotation</a></p>
      <p>This link is valid for ${COMPANY_LINK_VALIDITY_DAYS} days.</p>
    `,
  });

  await logAudit(supabase, { action: "quotation.company_link_sent", entityType: "quotation", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/quotations/${id}`);
}

/**
 * Sends the recipient (client) their signing link. Only usable once the
 * company representative has signed. Their signature completes the
 * quotation immediately, so this is always the last link sent.
 */
export async function sendQuotationRecipientLink(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: q, error } = await supabase
    .from("quotations")
    .select("access_token,recipient_email,recipient_name_hint,title,status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!q) throw new Error("Quotation not found.");
  if (q.status !== "company_signed") {
    throw new Error("The quotation must be signed by the company representative before it can be sent to the recipient.");
  }

  const token = q.access_token ?? randomUUID();
  const { error: upErr } = await supabase.from("quotations").update({
    access_token: token,
    status: "sent",
  }).eq("id", id).eq("status", "company_signed");
  if (upErr) throw new Error(upErr.message);

  const link = `${getPublicSiteUrl()}/sign/quotation/${token}`;
  await sendEmail({
    to: q.recipient_email,
    subject: `Your All Abode Quotation${q.title ? ` — ${q.title}` : ""} is ready to review`,
    html: `
      <p>Hi ${q.recipient_name_hint ?? "there"},</p>
      <p>All Abode Property Solutions has prepared a quotation${q.title ? ` for ${q.title}` : ""} for your review and electronic signature.</p>
      <p><a href="${link}">Review and sign your quotation</a></p>
    `,
  });

  await logAudit(supabase, { action: "quotation.sent", entityType: "quotation", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/quotations/${id}`);
}

// ============================================================
// Staff edits (terms lock once the company representative signs)
// ============================================================

export async function updateQuotationTerms(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: q } = await supabase.from("quotations").select("status,recipient_details").eq("id", id).maybeSingle();
  if (!q) throw new Error("Quotation not found.");
  if (q.status !== "draft") {
    throw new Error("Terms are locked once the company representative has signed against them.");
  }

  const recipientEmail = s(fd, "recipient_email");
  const { error } = await supabase.from("quotations").update({
    recipient_email: recipientEmail,
    recipient_name_hint: s(fd, "recipient_name_hint"),
    recipient_phone_hint: s(fd, "recipient_phone_hint"),
    recipient_address_hint: s(fd, "recipient_address_hint"),
    recipient_details: recipientDetailsFromForm(fd, recipientEmail, (q.recipient_details ?? {}) as Record<string, unknown>),
    ...parseTerms(fd),
  }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "quotation.terms_updated", entityType: "quotation", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/quotations/${id}`);
}

// ============================================================
// In-dashboard company signature — signs first. Allowed for a designated
// signatory, OR the staff member who prepared this particular quotation
// (the preparer is the default signatory for their own quotations; they
// send a pre-signing link instead if they want someone else to sign it).
// ============================================================

export async function countersignQuotationAsCompany(id: string, signatureDataUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const [{ data: staffRow }, { data: q }] = await Promise.all([
    supabase.from("users").select("is_signatory,name").eq("id", user.id).maybeSingle(),
    supabase.from("quotations").select("status,company_signature_data,created_by").eq("id", id).maybeSingle(),
  ]);
  if (!q) throw new Error("Quotation not found.");

  const isCreator = q.created_by === user.id;
  if (!staffRow?.is_signatory && !isCreator) {
    throw new Error("Only the quotation's preparer or a designated signatory can sign as company representative.");
  }
  if (q.status !== "draft") {
    throw new Error("This quotation is not ready to be signed.");
  }
  if (q.company_signature_data) {
    throw new Error("The company representative has already signed.");
  }

  const ip = await clientIp();
  const { error } = await supabase.from("quotations").update({
    company_typed_name: staffRow?.name ?? "",
    company_signature_data: signatureDataUrl,
    company_signed_at: new Date().toISOString(),
    company_signed_ip: ip,
    company_signed_via: "countersign",
    signatory_user_id: user.id,
    status: "company_signed",
  }).eq("id", id).is("company_signature_data", null);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "quotation.company_signed", entityType: "quotation", entityId: id, actorId: user.id });
  revalidatePath(`/admin/quotations/${id}`);
}

/**
 * Retry button for the case where the recipient's remote signature landed
 * but the completion pipeline failed afterwards (the signature is durable;
 * the status stays 'sent' until this succeeds).
 */
export async function finalizeQuotation(id: string) {
  const supabase = await createClient();

  const { data: q } = await supabase
    .from("quotations")
    .select("status,recipient_signature_data")
    .eq("id", id)
    .maybeSingle();
  if (!q) throw new Error("Quotation not found.");
  if (q.status === "completed") return;
  if (q.status !== "sent" || !q.recipient_signature_data) {
    throw new Error("The recipient's signature is required before the quotation can be finalized.");
  }

  await completeQuotation(id, supabase);
  revalidatePath(`/admin/quotations/${id}`);
}

// ============================================================
// AI: generate scope of work from the current draft's line items
// ============================================================

export async function generateQuotationScope(input: QuotationScopeInput): Promise<string | null> {
  return draftQuotationScope(input);
}

// ============================================================
// Void / delete
// ============================================================

export async function voidQuotation(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: q } = await supabase.from("quotations").select("status").eq("id", id).maybeSingle();
  if (!q) throw new Error("Quotation not found.");
  if (q.status === "voided") return;

  const { error } = await supabase.from("quotations").update({ status: "voided" }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "quotation.voided", entityType: "quotation", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/quotations/${id}`);
  revalidatePath("/admin/quotations");
}

export async function deleteQuotation(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: q } = await supabase.from("quotations").select("status,pdf_path").eq("id", id).maybeSingle();
  if (!q) throw new Error("Quotation not found.");
  if (q.status !== "draft") {
    throw new Error("A quotation with a signature on file can't be deleted — void it instead to preserve the record.");
  }

  if (q.pdf_path) {
    await supabase.storage.from(AGREEMENTS_BUCKET).remove([q.pdf_path]);
  }

  const { error } = await supabase.from("quotations").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "quotation.deleted", entityType: "quotation", entityId: id, actorId: user?.id });
  revalidatePath("/admin/quotations");
  redirect("/admin/quotations");
}

export async function getQuotationPdfSignedUrl(id: string) {
  const supabase = await createClient();
  const { data: q } = await supabase.from("quotations").select("pdf_path,status").eq("id", id).maybeSingle();
  if (!q?.pdf_path || q.status !== "completed") return null;
  return signedUrl(supabase, AGREEMENTS_BUCKET, q.pdf_path, 120);
}
