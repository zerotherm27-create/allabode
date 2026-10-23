"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGREEMENTS_BUCKET } from "@/lib/storage";
import { isSafeSignatureDataUrl } from "@/lib/pm/authority-to-sell-clauses";

export type AuthorityToSellRecord = {
  id: string;
  status: string;
  owner_email: string;
  owner_details: Record<string, unknown>;
  property_details: Record<string, unknown>;
  sale_terms: Record<string, unknown>;
  execution_date: string | null;
  owner_id_type: string | null;
  owner_id_number: string | null;
  owner_id_issued_date: string | null;
  owner_id_document_path: string | null;
  pdf_path: string | null;
};

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function loadAuthorityToSell(token: string): Promise<AuthorityToSellRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_ats_by_token", { p_token: token });
  if (error || !data) return null;
  return data as AuthorityToSellRecord;
}

export type SaveAtsDraftInput = {
  ownerDetails: Record<string, unknown>;
  propertyDetails: Record<string, unknown>;
  saleTerms: Record<string, unknown>;
  executionDate: string | null;
  ownerIdType: string | null;
  ownerIdNumber: string | null;
  ownerIdIssuedDate: string | null;
};

export async function saveAuthorityToSellDraft(token: string, input: SaveAtsDraftInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_ats_draft", {
    p_token: token,
    p_owner_details: input.ownerDetails,
    p_property_details: input.propertyDetails,
    p_sale_terms: input.saleTerms,
    p_execution_date: input.executionDate,
    p_owner_id_type: input.ownerIdType,
    p_owner_id_number: input.ownerIdNumber,
    p_owner_id_issued_date: input.ownerIdIssuedDate,
  });
  if (error) return { error: error.message };
  return {};
}

const ALLOWED_ID_TYPES = ["image/jpeg", "image/png"];
const MAX_ID_SIZE = 10 * 1024 * 1024;

/**
 * Vercel caps request bodies at 4.5MB, so the ID photo never touches a server
 * action: the browser uploads straight to Supabase Storage with a short-lived
 * signed upload token. This step only validates and issues that ticket.
 */
export async function createAuthorityToSellIdUploadTicket(
  token: string,
  fileName: string,
  fileSize: number,
  fileType: string,
): Promise<{ signedUrl?: string; uploadToken?: string; path?: string; error?: string }> {
  if (fileSize <= 0) return { error: "Please choose a file." };
  if (fileSize > MAX_ID_SIZE) return { error: "File must be under 10 MB." };
  if (!ALLOWED_ID_TYPES.includes(fileType)) return { error: "Please upload a JPG or PNG image — PDF files are not accepted for IDs." };

  const supabase = await createClient();
  const { data, error: lookupError } = await supabase.rpc("get_ats_by_token", { p_token: token });
  if (lookupError || !data) return { error: "This link is no longer valid." };
  const record = data as AuthorityToSellRecord;
  if (record.status !== "sent") return { error: "This document can no longer be edited." };

  void fileName;
  const ext = fileType === "image/png" ? "png" : "jpg";
  const path = `authority-to-sell/${record.id}/owner-id-${Date.now()}.${ext}`;

  try {
    const admin = createAdminClient();
    const { data: ticket, error } = await admin.storage.from(AGREEMENTS_BUCKET).createSignedUploadUrl(path);
    if (error || !ticket) return { error: error?.message ?? "Could not prepare upload." };
    return { signedUrl: ticket.signedUrl, uploadToken: ticket.token, path: ticket.path };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not prepare upload." };
  }
}

/** Called after the browser has uploaded the file directly to storage. */
export async function confirmAuthorityToSellIdUpload(token: string, path: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_ats_id_upload", { p_token: token, p_path: path });
  if (error) return { error: error.message };
  return {};
}

export async function submitAuthorityToSellOwnerSignature(
  token: string,
  input: { typedName: string; signatureDataUrl: string },
): Promise<{ error?: string }> {
  if (!isSafeSignatureDataUrl(input.signatureDataUrl)) return { error: "Invalid signature — please draw or upload it again." };
  const supabase = await createClient();
  const ip = await clientIp();
  const { error } = await supabase.rpc("submit_ats_owner_signature", {
    p_token: token,
    p_typed_name: input.typedName,
    p_signature_data: input.signatureDataUrl,
    p_ip: ip,
  });
  if (error) return { error: error.message };
  return {};
}
