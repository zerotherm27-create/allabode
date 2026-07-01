"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGREEMENTS_BUCKET } from "@/lib/storage";

export type AgreementRecord = {
  id: string;
  status: string;
  owner_email: string;
  owner_details: Record<string, unknown>;
  property_details: Record<string, unknown>;
  service_selections: Record<string, unknown>;
  annex_c: Record<string, unknown>;
  effective_date: string | null;
  owner_id_type: string | null;
  owner_id_number: string | null;
  owner_id_document_path: string | null;
  intake_profile: Record<string, unknown>;
  pdf_path: string | null;
};

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function loadAgreement(token: string): Promise<AgreementRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_agreement_by_token", { p_token: token });
  if (error || !data) return null;
  return data as AgreementRecord;
}

export type SaveDraftInput = {
  ownerDetails: Record<string, unknown>;
  propertyDetails: Record<string, unknown>;
  serviceSelections: Record<string, unknown>;
  annexC: Record<string, unknown>;
  effectiveDate: string | null;
  ownerIdType: string | null;
  ownerIdNumber: string | null;
  intakeProfile: Record<string, unknown>;
};

export async function saveAgreementDraft(token: string, input: SaveDraftInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_agreement_draft", {
    p_token: token,
    p_owner_details: input.ownerDetails,
    p_property_details: input.propertyDetails,
    p_service_selections: input.serviceSelections,
    p_annex_c: input.annexC,
    p_effective_date: input.effectiveDate,
    p_owner_id_type: input.ownerIdType,
    p_owner_id_number: input.ownerIdNumber,
    p_intake_profile: input.intakeProfile,
  });
  if (error) return { error: error.message };
  return {};
}

const ALLOWED_ID_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_ID_SIZE = 10 * 1024 * 1024;

/**
 * Vercel Functions cap request bodies at 4.5MB platform-wide (not
 * configurable) — well under phone-camera ID photos, which are commonly
 * 5-10MB. So the file never touches our server action: the browser uploads
 * directly to Supabase Storage using a short-lived signed upload URL/token,
 * which requires no RLS permissions of its own (the token is the
 * credential). This step only validates + issues that ticket.
 */
export async function createAgreementIdUploadTicket(
  token: string,
  fileName: string,
  fileSize: number,
  fileType: string
): Promise<{ signedUrl?: string; uploadToken?: string; path?: string; error?: string }> {
  if (fileSize <= 0) return { error: "Please choose a file." };
  if (fileSize > MAX_ID_SIZE) return { error: "File must be under 10 MB." };
  if (!ALLOWED_ID_TYPES.includes(fileType)) return { error: "Please upload a JPG, PNG, or PDF file." };

  const supabase = await createClient();
  const { data: agreement, error: lookupError } = await supabase.rpc("get_agreement_by_token", { p_token: token });
  if (lookupError || !agreement) return { error: "This link is no longer valid." };
  const record = agreement as AgreementRecord;
  if (record.status !== "sent") return { error: "This agreement can no longer be edited." };

  const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
  const path = `${record.id}/owner-id-${Date.now()}.${ext}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(AGREEMENTS_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: error?.message ?? "Could not prepare upload." };
    return { signedUrl: data.signedUrl, uploadToken: data.token, path: data.path };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not prepare upload." };
  }
}

/** Called after the browser has uploaded the file directly to storage. */
export async function confirmAgreementIdUpload(token: string, path: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_agreement_id_upload", { p_token: token, p_path: path });
  if (error) return { error: error.message };
  return {};
}

export type SubmitSignatureInput = {
  typedName: string;
  signatureDataUrl: string;
};

export async function submitOwnerSignature(token: string, input: SubmitSignatureInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ip = await clientIp();
  const { error } = await supabase.rpc("submit_owner_signature", {
    p_token: token,
    p_typed_name: input.typedName,
    p_signature_data: input.signatureDataUrl,
    p_ip: ip,
  });
  if (error) return { error: error.message };
  return {};
}
