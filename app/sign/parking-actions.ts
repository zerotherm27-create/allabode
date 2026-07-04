"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGREEMENTS_BUCKET } from "@/lib/storage";
import { completeParkingAgreement } from "@/lib/parking/complete";
import type {
  ParkingLandlordDetails, ParkingTenantDetails, ParkingSpaceDetails,
  VehicleDetails, ParkingScheduleRow, ParkingBankDetails,
} from "@/lib/pm/parking-clauses";

export type ParkingAgreementRecord = {
  id: string;
  status: string;
  tenant_email: string;
  tenant_name_hint: string | null;
  landlord_name_hint: string | null;
  agreement_date: string | null;
  agreement_city: string | null;
  landlord_details: ParkingLandlordDetails;
  parking_details: ParkingSpaceDetails;
  lease_start_date: string | null;
  lease_end_date: string | null;
  rent_amount: number | null;
  rent_amount_words: string | null;
  signing_total_amount: number | null;
  signing_total_words: string | null;
  sticker_amount: number | null;
  rent_due_day: number | null;
  payment_schedule: ParkingScheduleRow[] | null;
  bank_details: Partial<ParkingBankDetails> | null;
  tenant_details: ParkingTenantDetails;
  vehicle_details: VehicleDetails;
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

export async function loadParkingAgreement(token: string): Promise<ParkingAgreementRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_parking_agreement_by_token", { p_token: token });
  if (error || !data) return null;
  return data as ParkingAgreementRecord;
}

export type SaveParkingDraftInput = {
  tenantDetails: Record<string, unknown>;
  vehicleDetails: Record<string, unknown>;
  tenantIdType: string | null;
  tenantIdNumber: string | null;
  tenantIdIssuedDate: string | null;
};

export async function saveParkingDraft(token: string, input: SaveParkingDraftInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_parking_draft", {
    p_token: token,
    p_tenant_details: input.tenantDetails,
    p_vehicle_details: input.vehicleDetails,
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
export async function createParkingIdUploadTicket(
  token: string,
  fileName: string,
  fileSize: number,
  fileType: string
): Promise<{ signedUrl?: string; uploadToken?: string; path?: string; error?: string }> {
  if (fileSize <= 0) return { error: "Please choose a file." };
  if (fileSize > MAX_ID_SIZE) return { error: "File must be under 10 MB." };
  if (!ALLOWED_ID_TYPES.includes(fileType)) return { error: "Please upload a JPG, PNG, or PDF file." };

  const supabase = await createClient();
  const { data: agreement, error: lookupError } = await supabase.rpc("get_parking_agreement_by_token", { p_token: token });
  if (lookupError || !agreement) return { error: "This link is no longer valid." };
  const record = agreement as ParkingAgreementRecord;
  if (record.status !== "sent") return { error: "This agreement can no longer be edited." };

  const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
  const path = `parking/${record.id}/tenant-id-${Date.now()}.${ext}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(AGREEMENTS_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: error?.message ?? "Could not prepare upload." };
    return { signedUrl: data.signedUrl, uploadToken: data.token, path: data.path };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not prepare upload." };
  }
}

export async function createParkingOccupantIdUploadTicket(
  token: string,
  fileName: string,
  fileSize: number,
  fileType: string
): Promise<{ signedUrl?: string; uploadToken?: string; path?: string; error?: string }> {
  if (fileSize <= 0) return { error: "Please choose a file." };
  if (fileSize > MAX_ID_SIZE) return { error: "File must be under 10 MB." };
  if (!ALLOWED_ID_TYPES.includes(fileType)) return { error: "Please upload a JPG, PNG, or PDF file." };

  const supabase = await createClient();
  const { data: agreement, error: lookupError } = await supabase.rpc("get_parking_agreement_by_token", { p_token: token });
  if (lookupError || !agreement) return { error: "This link is no longer valid." };
  const record = agreement as ParkingAgreementRecord;
  if (record.status !== "sent") return { error: "This agreement can no longer be edited." };

  const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
  const path = `parking/${record.id}/occupant-id-${Date.now()}.${ext}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(AGREEMENTS_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: error?.message ?? "Could not prepare upload." };
    return { signedUrl: data.signedUrl, uploadToken: data.token, path: data.path };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not prepare upload." };
  }
}

export async function confirmParkingIdUpload(token: string, path: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_parking_id_upload", { p_token: token, p_path: path });
  if (error) return { error: error.message };
  return {};
}

export type SubmitSignatureInput = {
  typedName: string;
  signatureDataUrl: string;
};

export async function submitParkingTenantSignature(token: string, input: SubmitSignatureInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ip = await clientIp();
  const { error } = await supabase.rpc("submit_parking_tenant_signature", {
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

export async function loadParkingAgreementForLandlord(token: string): Promise<ParkingAgreementRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_parking_agreement_by_landlord_token", { p_token: token });
  if (error || !data) return null;
  return data as ParkingAgreementRecord;
}

export async function createParkingLandlordIdUploadTicket(
  token: string,
  fileName: string,
  fileSize: number,
  fileType: string
): Promise<{ signedUrl?: string; uploadToken?: string; path?: string; error?: string }> {
  if (fileSize <= 0) return { error: "Please choose a file." };
  if (fileSize > MAX_ID_SIZE) return { error: "File must be under 10 MB." };
  if (!ALLOWED_ID_TYPES.includes(fileType)) return { error: "Please upload a JPG, PNG, or PDF file." };

  const supabase = await createClient();
  const { data: agreement, error: lookupError } = await supabase.rpc("get_parking_agreement_by_landlord_token", { p_token: token });
  if (lookupError || !agreement) return { error: "This link is no longer valid." };
  const record = agreement as ParkingAgreementRecord;
  if (record.status !== "tenant_signed" || record.landlord_signature_data) {
    return { error: "This agreement can no longer be edited." };
  }

  const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
  const path = `parking/${record.id}/landlord-id-${Date.now()}.${ext}`;

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

export async function confirmParkingLandlordIdUpload(token: string, input: ConfirmLandlordIdInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_parking_landlord_id_upload", {
    p_token: token,
    p_id_type: input.idType,
    p_id_number: input.idNumber,
    p_id_issued_date: input.idIssuedDate,
    p_path: input.path,
  });
  if (error) return { error: error.message };
  return {};
}

export async function submitParkingLandlordSignature(token: string, input: SubmitSignatureInput): Promise<{ error?: string; completed?: boolean }> {
  const supabase = await createClient();
  const ip = await clientIp();
  const { error } = await supabase.rpc("submit_parking_landlord_signature", {
    p_token: token,
    p_typed_name: input.typedName,
    p_signature_data: input.signatureDataUrl,
    p_ip: ip,
  });
  if (error) return { error: error.message };

  // The signature is durable at this point. Completion (PDF, tenant record,
  // portal account) runs best-effort — if it fails, staff retry from the
  // admin "Finalize" button, so we never surface an error that would make
  // the landlord think their signature didn't register.
  const { data } = await supabase.rpc("get_parking_agreement_by_landlord_token", { p_token: token });
  const record = data as ParkingAgreementRecord | null;
  if (record?.id) {
    try {
      // Anonymous caller — the completion pipeline needs table + storage
      // writes that only the service role can perform (no anon RLS policies
      // exist by design; the token validated by the RPC above is the
      // credential for this narrow step).
      await completeParkingAgreement(record.id, createAdminClient());
      return { completed: true };
    } catch (err) {
      console.warn("[parking] completion after landlord signature failed:", err);
    }
  }
  return { completed: false };
}
