"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeQuotation } from "@/lib/quotation/complete";
import type { QuotationLineItem, ProgressMilestone } from "@/lib/quotation/totals";

export type QuotationRecord = {
  id: string;
  status: string;
  quotation_number: string;
  recipient_email: string;
  recipient_name_hint: string | null;
  recipient_details: { name?: string; email?: string; phone?: string; address?: string } | null;
  quotation_date: string | null;
  valid_until: string | null;
  title: string | null;
  property_reference: string | null;
  line_items: QuotationLineItem[] | null;
  scope_of_work: string | null;
  payment_terms_type: "cash" | "progress_billing" | null;
  payment_terms_notes: string | null;
  progress_milestones: ProgressMilestone[] | null;
  recipient_typed_name: string | null;
  recipient_signature_data: string | null;
  recipient_signed_at: string | null;
  company_typed_name: string | null;
  company_signature_data: string | null;
  company_signed_at: string | null;
  pdf_path: string | null;
};

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export type SubmitSignatureInput = {
  typedName: string;
  signatureDataUrl: string;
};

// ============================================================
// Recipient side
// ============================================================

export async function loadQuotation(token: string): Promise<QuotationRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_quotation_by_token", { p_token: token });
  if (error || !data) return null;
  return data as QuotationRecord;
}

export async function saveQuotationRecipientDetails(
  token: string,
  recipientDetails: Record<string, unknown>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_quotation_recipient_details", {
    p_token: token,
    p_recipient_details: recipientDetails,
  });
  if (error) return { error: error.message };
  return {};
}

export async function submitQuotationRecipientSignature(token: string, input: SubmitSignatureInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ip = await clientIp();
  const { error } = await supabase.rpc("submit_quotation_recipient_signature", {
    p_token: token,
    p_typed_name: input.typedName,
    p_signature_data: input.signatureDataUrl,
    p_ip: ip,
  });
  if (error) return { error: error.message };
  return {};
}

// ============================================================
// Company-rep side (separate token; issued after the recipient signs)
// ============================================================

export async function loadQuotationForCompany(token: string): Promise<QuotationRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_quotation_by_company_token", { p_token: token });
  if (error || !data) return null;
  return data as QuotationRecord;
}

export async function submitQuotationCompanySignature(token: string, input: SubmitSignatureInput): Promise<{ error?: string; completed?: boolean }> {
  const supabase = await createClient();
  const ip = await clientIp();
  const { error } = await supabase.rpc("submit_quotation_company_signature", {
    p_token: token,
    p_typed_name: input.typedName,
    p_signature_data: input.signatureDataUrl,
    p_ip: ip,
  });
  if (error) return { error: error.message };

  // The signature is durable at this point. Completion (PDF render + upload)
  // runs best-effort — if it fails, staff retry from the admin "Finalize"
  // button, so we never surface an error that would make the company rep
  // think their signature didn't register.
  const { data } = await supabase.rpc("get_quotation_by_company_token", { p_token: token });
  const record = data as QuotationRecord | null;
  if (record?.id) {
    try {
      // Anonymous caller — the completion pipeline needs table + storage
      // writes that only the service role can perform (no anon RLS policies
      // exist by design; the token validated by the RPC above is the
      // credential for this narrow step).
      await completeQuotation(record.id, createAdminClient());
      return { completed: true };
    } catch (err) {
      console.warn("[quotation] completion after company signature failed:", err);
    }
  }
  return { completed: false };
}
