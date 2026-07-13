"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGREEMENTS_BUCKET } from "@/lib/storage";
import { completeStrAgreement } from "@/lib/short-term-rental/complete";
import type {
  StrHomeownerDetails, StrTenantDetails, StrPropertyDetails,
  StrFeeItem, StrInventoryRow, StrBankDetails,
} from "@/lib/pm/short-term-rental-clauses";

export type StrAgreementRecord = {
  id: string;
  status: string;
  tenant_email: string;
  tenant_name_hint: string | null;
  homeowner_name_hint: string | null;
  agreement_date: string | null;
  homeowner_details: StrHomeownerDetails;
  property_details: StrPropertyDetails;
  check_in_date: string | null;
  check_out_date: string | null;
  occupants: string[] | null;
  amenity_location: string | null;
  amenities_list: string | null;
  garbage_disposal_location: string | null;
  fee_items: StrFeeItem[] | null;
  security_deposit_amount: number | null;
  bank_details: Partial<StrBankDetails> | null;
  inventory: StrInventoryRow[] | null;
  tenant_details: StrTenantDetails;
  tenant_id_type: string | null;
  tenant_id_number: string | null;
  tenant_id_issued_date: string | null;
  tenant_id_document_path: string | null;
  tenant_signed_at: string | null;
  homeowner_id_type: string | null;
  homeowner_id_number: string | null;
  homeowner_id_issued_date: string | null;
  homeowner_id_document_path: string | null;
  homeowner_signature_data: string | null;
  homeowner_signed_at: string | null;
  pdf_path: string | null;
};

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

const ALLOWED_ID_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_ID_SIZE = 10 * 1024 * 1024;

// ============================================================
// Tenant side
// ============================================================

export async function loadStrAgreement(token: string): Promise<StrAgreementRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_str_agreement_by_token", { p_token: token });
  if (error || !data) return null;
  return data as StrAgreementRecord;
}

export type SaveStrDraftInput = {
  tenantDetails: Record<string, unknown>;
  occupants: string[];
  tenantIdType: string | null;
  tenantIdNumber: string | null;
  tenantIdIssuedDate: string | null;
};

export async function saveStrDraft(token: string, input: SaveStrDraftInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_str_draft", {
    p_token: token,
    p_tenant_details: input.tenantDetails,
    p_occupants: input.occupants,
    p_tenant_id_type: input.tenantIdType,
    p_tenant_id_number: input.tenantIdNumber,
    p_tenant_id_issued_date: input.tenantIdIssuedDate,
  });
  if (error) return { error: error.message };
  return {};
}

/**
 * Same signed-upload-URL ticket pattern as the other agreement flows: Vercel
 * Functions cap request bodies at 4.5MB, well under phone-camera ID photos,
 * so the file goes browser -> Supabase Storage directly and this step only
 * validates and issues the short-lived upload credential.
 */
export async function createStrIdUploadTicket(
  token: string,
  fileName: string,
  fileSize: number,
  fileType: string
): Promise<{ signedUrl?: string; uploadToken?: string; path?: string; error?: string }> {
  if (fileSize <= 0) return { error: "Please choose a file." };
  if (fileSize > MAX_ID_SIZE) return { error: "File must be under 10 MB." };
  if (!ALLOWED_ID_TYPES.includes(fileType)) return { error: "Please upload a JPG, PNG, or PDF file." };

  const supabase = await createClient();
  const { data: agreement, error: lookupError } = await supabase.rpc("get_str_agreement_by_token", { p_token: token });
  if (lookupError || !agreement) return { error: "This link is no longer valid." };
  const record = agreement as StrAgreementRecord;
  if (record.status !== "sent") return { error: "This agreement can no longer be edited." };

  const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
  const path = `short-term-rental/${record.id}/tenant-id-${Date.now()}.${ext}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(AGREEMENTS_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: error?.message ?? "Could not prepare upload." };
    return { signedUrl: data.signedUrl, uploadToken: data.token, path: data.path };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not prepare upload." };
  }
}

export async function confirmStrIdUpload(token: string, path: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_str_id_upload", { p_token: token, p_path: path });
  if (error) return { error: error.message };
  return {};
}

export type SubmitSignatureInput = {
  typedName: string;
  signatureDataUrl: string;
};

export async function submitStrTenantSignature(token: string, input: SubmitSignatureInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ip = await clientIp();
  const { error } = await supabase.rpc("submit_str_tenant_signature", {
    p_token: token,
    p_typed_name: input.typedName,
    p_signature_data: input.signatureDataUrl,
    p_ip: ip,
  });
  if (error) return { error: error.message };
  return {};
}

// ============================================================
// Homeowner side (separate token; issued after the tenant signs)
// ============================================================

export async function loadStrAgreementForHomeowner(token: string): Promise<StrAgreementRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_str_agreement_by_homeowner_token", { p_token: token });
  if (error || !data) return null;
  return data as StrAgreementRecord;
}

export async function createStrHomeownerIdUploadTicket(
  token: string,
  fileName: string,
  fileSize: number,
  fileType: string
): Promise<{ signedUrl?: string; uploadToken?: string; path?: string; error?: string }> {
  if (fileSize <= 0) return { error: "Please choose a file." };
  if (fileSize > MAX_ID_SIZE) return { error: "File must be under 10 MB." };
  if (!ALLOWED_ID_TYPES.includes(fileType)) return { error: "Please upload a JPG, PNG, or PDF file." };

  const supabase = await createClient();
  const { data: agreement, error: lookupError } = await supabase.rpc("get_str_agreement_by_homeowner_token", { p_token: token });
  if (lookupError || !agreement) return { error: "This link is no longer valid." };
  const record = agreement as StrAgreementRecord;
  if (record.status !== "tenant_signed" || record.homeowner_signature_data) {
    return { error: "This agreement can no longer be edited." };
  }

  const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
  const path = `short-term-rental/${record.id}/homeowner-id-${Date.now()}.${ext}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(AGREEMENTS_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: error?.message ?? "Could not prepare upload." };
    return { signedUrl: data.signedUrl, uploadToken: data.token, path: data.path };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not prepare upload." };
  }
}

export type ConfirmHomeownerIdInput = {
  idType: string;
  idNumber: string;
  idIssuedDate: string;
  path: string;
};

export async function confirmStrHomeownerIdUpload(token: string, input: ConfirmHomeownerIdInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_str_homeowner_id_upload", {
    p_token: token,
    p_id_type: input.idType,
    p_id_number: input.idNumber,
    p_id_issued_date: input.idIssuedDate,
    p_path: input.path,
  });
  if (error) return { error: error.message };
  return {};
}

export async function submitStrHomeownerSignature(token: string, input: SubmitSignatureInput): Promise<{ error?: string; completed?: boolean }> {
  const supabase = await createClient();
  const ip = await clientIp();
  const { error } = await supabase.rpc("submit_str_homeowner_signature", {
    p_token: token,
    p_typed_name: input.typedName,
    p_signature_data: input.signatureDataUrl,
    p_ip: ip,
  });
  if (error) return { error: error.message };

  // The signature is durable at this point. Completion (PDF, tenant record,
  // portal account) runs best-effort — if it fails, staff retry from the
  // admin "Finalize" button, so we never surface an error that would make
  // the homeowner think their signature didn't register.
  const { data } = await supabase.rpc("get_str_agreement_by_homeowner_token", { p_token: token });
  const record = data as StrAgreementRecord | null;
  if (record?.id) {
    try {
      // Anonymous caller — the completion pipeline needs table + storage
      // writes that only the service role can perform (no anon RLS policies
      // exist by design; the token validated by the RPC above is the
      // credential for this narrow step).
      await completeStrAgreement(record.id, createAdminClient());
      return { completed: true };
    } catch (err) {
      console.warn("[short-term-rental] completion after homeowner signature failed:", err);
    }
  }
  return { completed: false };
}
