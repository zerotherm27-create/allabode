"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGREEMENTS_BUCKET } from "@/lib/storage";
import { completeTenancyAgreement } from "@/lib/tenancy/complete";
import type {
  TenancyLandlordDetails, TenancyTenantDetails, TenancyPropertyDetails,
  PaymentScheduleRow, InventoryRow, TenancyBankDetails,
} from "@/lib/pm/tenancy-clauses";

export type TenancyAgreementRecord = {
  id: string;
  status: string;
  tenant_email: string;
  tenant_name_hint: string | null;
  landlord_name_hint: string | null;
  agreement_date: string | null;
  landlord_details: TenancyLandlordDetails;
  property_details: TenancyPropertyDetails;
  lease_months: number | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  rent_amount: number | null;
  rent_amount_words: string | null;
  advance_deposit_amount: number | null;
  advance_deposit_words: string | null;
  deposit_amount: number | null;
  deposit_amount_words: string | null;
  rent_due_day: number | null;
  payment_schedule: PaymentScheduleRow[] | null;
  bank_details: Partial<TenancyBankDetails> | null;
  inventory: InventoryRow[] | null;
  tenant_details: TenancyTenantDetails;
  occupants: string[] | null;
  tenant_id_type: string | null;
  tenant_id_number: string | null;
  tenant_id_issued_date: string | null;
  tenant_id_document_path: string | null;
  tenant_signed_at: string | null;
  landlord_id_type: string | null;
  landlord_id_number: string | null;
  landlord_id_issued_date: string | null;
  landlord_id_document_path: string | null;
  landlord_signature_data: string | null;
  landlord_signed_at: string | null;
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

export async function loadTenancyAgreement(token: string): Promise<TenancyAgreementRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_tenancy_agreement_by_token", { p_token: token });
  if (error || !data) return null;
  return data as TenancyAgreementRecord;
}

export type SaveTenancyDraftInput = {
  tenantDetails: Record<string, unknown>;
  occupants: string[];
  tenantIdType: string | null;
  tenantIdNumber: string | null;
  tenantIdIssuedDate: string | null;
};

export async function saveTenancyDraft(token: string, input: SaveTenancyDraftInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_tenancy_draft", {
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
 * Same signed-upload-URL ticket pattern as the PM agreement: Vercel Functions
 * cap request bodies at 4.5MB, well under phone-camera ID photos, so the file
 * goes browser -> Supabase Storage directly and this step only validates and
 * issues the short-lived upload credential.
 */
export async function createTenancyIdUploadTicket(
  token: string,
  fileName: string,
  fileSize: number,
  fileType: string
): Promise<{ signedUrl?: string; uploadToken?: string; path?: string; error?: string }> {
  if (fileSize <= 0) return { error: "Please choose a file." };
  if (fileSize > MAX_ID_SIZE) return { error: "File must be under 10 MB." };
  if (!ALLOWED_ID_TYPES.includes(fileType)) return { error: "Please upload a JPG, PNG, or PDF file." };

  const supabase = await createClient();
  const { data: agreement, error: lookupError } = await supabase.rpc("get_tenancy_agreement_by_token", { p_token: token });
  if (lookupError || !agreement) return { error: "This link is no longer valid." };
  const record = agreement as TenancyAgreementRecord;
  if (record.status !== "sent") return { error: "This agreement can no longer be edited." };

  const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
  const path = `tenancy/${record.id}/tenant-id-${Date.now()}.${ext}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(AGREEMENTS_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: error?.message ?? "Could not prepare upload." };
    return { signedUrl: data.signedUrl, uploadToken: data.token, path: data.path };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not prepare upload." };
  }
}

export async function createTenancyOccupantIdUploadTicket(
  token: string,
  fileName: string,
  fileSize: number,
  fileType: string
): Promise<{ signedUrl?: string; uploadToken?: string; path?: string; error?: string }> {
  if (fileSize <= 0) return { error: "Please choose a file." };
  if (fileSize > MAX_ID_SIZE) return { error: "File must be under 10 MB." };
  if (!ALLOWED_ID_TYPES.includes(fileType)) return { error: "Please upload a JPG, PNG, or PDF file." };

  const supabase = await createClient();
  const { data: agreement, error: lookupError } = await supabase.rpc("get_tenancy_agreement_by_token", { p_token: token });
  if (lookupError || !agreement) return { error: "This link is no longer valid." };
  const record = agreement as TenancyAgreementRecord;
  if (record.status !== "sent") return { error: "This agreement can no longer be edited." };

  const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
  const path = `tenancy/${record.id}/occupant-id-${Date.now()}.${ext}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(AGREEMENTS_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: error?.message ?? "Could not prepare upload." };
    return { signedUrl: data.signedUrl, uploadToken: data.token, path: data.path };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not prepare upload." };
  }
}

export async function confirmTenancyIdUpload(token: string, path: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_tenancy_id_upload", { p_token: token, p_path: path });
  if (error) return { error: error.message };
  return {};
}

export type SubmitSignatureInput = {
  typedName: string;
  signatureDataUrl: string;
};

export async function submitTenantSignature(token: string, input: SubmitSignatureInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ip = await clientIp();
  const { error } = await supabase.rpc("submit_tenant_signature", {
    p_token: token,
    p_typed_name: input.typedName,
    p_signature_data: input.signatureDataUrl,
    p_ip: ip,
  });
  if (error) return { error: error.message };
  return {};
}

// ============================================================
// Landlord side (separate token; issued after the tenant signs)
// ============================================================

export async function loadTenancyAgreementForLandlord(token: string): Promise<TenancyAgreementRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_tenancy_agreement_by_landlord_token", { p_token: token });
  if (error || !data) return null;
  return data as TenancyAgreementRecord;
}

export async function createLandlordIdUploadTicket(
  token: string,
  fileName: string,
  fileSize: number,
  fileType: string
): Promise<{ signedUrl?: string; uploadToken?: string; path?: string; error?: string }> {
  if (fileSize <= 0) return { error: "Please choose a file." };
  if (fileSize > MAX_ID_SIZE) return { error: "File must be under 10 MB." };
  if (!ALLOWED_ID_TYPES.includes(fileType)) return { error: "Please upload a JPG, PNG, or PDF file." };

  const supabase = await createClient();
  const { data: agreement, error: lookupError } = await supabase.rpc("get_tenancy_agreement_by_landlord_token", { p_token: token });
  if (lookupError || !agreement) return { error: "This link is no longer valid." };
  const record = agreement as TenancyAgreementRecord;
  if (record.status !== "tenant_signed" || record.landlord_signature_data) {
    return { error: "This agreement can no longer be edited." };
  }

  const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
  const path = `tenancy/${record.id}/landlord-id-${Date.now()}.${ext}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(AGREEMENTS_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: error?.message ?? "Could not prepare upload." };
    return { signedUrl: data.signedUrl, uploadToken: data.token, path: data.path };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not prepare upload." };
  }
}

export type ConfirmLandlordIdInput = {
  idType: string;
  idNumber: string;
  idIssuedDate: string;
  path: string;
};

export async function confirmLandlordIdUpload(token: string, input: ConfirmLandlordIdInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_tenancy_landlord_id_upload", {
    p_token: token,
    p_id_type: input.idType,
    p_id_number: input.idNumber,
    p_id_issued_date: input.idIssuedDate,
    p_path: input.path,
  });
  if (error) return { error: error.message };
  return {};
}

export async function submitLandlordSignature(token: string, input: SubmitSignatureInput): Promise<{ error?: string; completed?: boolean }> {
  const supabase = await createClient();
  const ip = await clientIp();
  const { error } = await supabase.rpc("submit_landlord_signature", {
    p_token: token,
    p_typed_name: input.typedName,
    p_signature_data: input.signatureDataUrl,
    p_ip: ip,
  });
  if (error) return { error: error.message };

  // The signature is durable at this point. Completion (PDF, tenant + lease
  // records, portal account) runs best-effort — if it fails, staff retry it
  // from the admin "Finalize" button, so we never surface an error that would
  // make the landlord think their signature didn't register.
  const { data } = await supabase.rpc("get_tenancy_agreement_by_landlord_token", { p_token: token });
  const record = data as TenancyAgreementRecord | null;
  if (record?.id) {
    try {
      // Anonymous caller — the completion pipeline needs table + storage
      // writes that only the service role can perform (no anon RLS policies
      // exist by design; the token validated by the RPC above is the
      // credential for this narrow step).
      await completeTenancyAgreement(record.id, createAdminClient());
      return { completed: true };
    } catch (err) {
      console.warn("[tenancy] completion after landlord signature failed:", err);
    }
  }
  return { completed: false };
}
