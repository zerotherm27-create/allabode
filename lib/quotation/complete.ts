import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicSiteUrl } from "@/lib/url";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { AGREEMENTS_BUCKET } from "@/lib/storage";
import { renderQuotationPdf, type QuotationPdfInput } from "@/lib/pdf/quotation";
import type { QuotationLineItem, ProgressMilestone } from "@/lib/quotation/totals";

function manilaTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

/**
 * Completion pipeline for a quotation whose company signature has just
 * landed (remote link or staff countersign): render + store the PDF, email
 * both parties, and mark completed. No tenant/owner upsert, no portal
 * account, no ID handling — a quotation is a commercial price proposal, not
 * a notarized legal contract.
 *
 * Takes the Supabase client as a parameter because the two callers run under
 * different trust models: the staff countersign action passes the normal
 * RLS-scoped staff client, while the remote company-rep path is anonymous
 * (token-authenticated by the RPC) and passes the service-role admin client.
 */
export async function completeQuotation(id: string, supabase: SupabaseClient): Promise<void> {
  const { data: q, error } = await supabase.from("quotations").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!q) throw new Error("Quotation not found.");
  if (q.status === "completed") return; // idempotent — retry-safe
  if (!q.recipient_signature_data || !q.company_signature_data) {
    throw new Error("Both signatures are required before the quotation can be finalized.");
  }

  const rd = (q.recipient_details ?? {}) as { name?: string; email?: string; phone?: string; address?: string };

  const pdfInput: QuotationPdfInput = {
    quotationNumber: q.quotation_number,
    quotationDate: q.quotation_date,
    validUntil: q.valid_until,
    title: q.title,
    propertyReference: q.property_reference,
    recipientDetails: rd,
    recipientEmail: q.recipient_email,
    lineItems: (q.line_items ?? []) as QuotationLineItem[],
    scopeOfWork: q.scope_of_work,
    paymentTermsType: q.payment_terms_type,
    paymentTermsNotes: q.payment_terms_notes,
    progressMilestones: (q.progress_milestones ?? []) as ProgressMilestone[],
    recipientTypedName: q.recipient_typed_name ?? "",
    recipientSignatureDataUri: q.recipient_signature_data ?? "",
    recipientSignedAtManila: manilaTime(q.recipient_signed_at),
    recipientSignedIp: q.recipient_signed_ip ?? "unknown",
    companyTypedName: q.company_typed_name ?? "",
    companySignatureDataUri: q.company_signature_data ?? "",
    companySignedAtManila: manilaTime(q.company_signed_at),
    companySignedIp: q.company_signed_ip ?? "unknown",
    companySignedVia: (q.company_signed_via ?? "countersign") as "remote" | "countersign",
    countersignerEmail: null,
  };
  if (q.signatory_user_id) {
    const { data: signatoryRow } = await supabase.from("users").select("email").eq("id", q.signatory_user_id).maybeSingle();
    pdfInput.countersignerEmail = signatoryRow?.email ?? null;
  }
  const pdfBuffer = await renderQuotationPdf(pdfInput);

  const pdfPath = `quotations/${q.id}/quotation-${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage.from(AGREEMENTS_BUCKET).upload(pdfPath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) throw new Error(`PDF upload failed: ${upErr.message}`);

  const { error: doneErr } = await supabase.from("quotations").update({
    status: "completed",
    pdf_path: pdfPath,
  }).eq("id", id);
  if (doneErr) throw new Error(doneErr.message);

  await logAudit(supabase, { action: "quotation.completed", entityType: "quotation", entityId: id });

  const recipientLink = `${getPublicSiteUrl()}/sign/quotation/${q.access_token}`;
  await sendEmail({
    to: q.recipient_email,
    subject: "Your All Abode quotation is fully executed",
    html: `<p>Hi ${rd.name ?? "there"},</p><p>Your quotation${q.title ? ` (${q.title})` : ""} has been fully executed. You can download your copy from your signing link.</p><p><a href="${recipientLink}">View and download</a></p>`,
  });

  if (q.company_signed_via !== "countersign" && q.company_email) {
    const companyLink = q.company_access_token ? `${getPublicSiteUrl()}/sign/quotation/company/${q.company_access_token}` : null;
    await sendEmail({
      to: q.company_email,
      subject: "Quotation fully executed",
      html: `<p>Hi ${q.company_name_hint ?? "there"},</p><p>The quotation with ${rd.name ?? q.recipient_email} has been fully executed.${companyLink ? ` You can download your copy from your signing link.</p><p><a href="${companyLink}">View and download</a></p>` : "</p>"}`,
    });
  }
  if (q.created_by) {
    await createNotification(supabase, {
      recipientUserId: q.created_by,
      type: "quotation_completed",
      title: "Quotation fully signed",
      body: `The quotation for ${rd.name ?? q.recipient_email} has been fully executed.`,
      link: `/admin/quotations/${id}`,
      entityType: "quotation",
      entityId: id,
    });
  }

  revalidatePath(`/admin/quotations/${id}`);
  revalidatePath("/admin/quotations");
}
