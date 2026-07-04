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
import { completeParkingAgreement } from "@/lib/parking/complete";
import type { ParkingScheduleRow } from "@/lib/pm/parking-clauses";
import { DEFAULT_PARKING_BANK_DETAILS } from "@/lib/pm/parking-clauses";

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

function num(fd: FormData, k: string): number | null {
  const raw = s(fd, k);
  if (raw === null) return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

const LANDLORD_LINK_VALIDITY_DAYS = 14;

/** Staff-authored term columns, shared by create + update. */
function parseTerms(fd: FormData) {
  const rentDueDay = num(fd, "rent_due_day");
  if (rentDueDay !== null && (!Number.isInteger(rentDueDay) || rentDueDay < 1 || rentDueDay > 31)) {
    throw new Error("Rent due day must be between 1 and 31.");
  }

  let paymentSchedule: ParkingScheduleRow[] = [];
  try {
    const raw = s(fd, "payment_schedule");
    if (raw) paymentSchedule = JSON.parse(raw) as ParkingScheduleRow[];
  } catch {
    throw new Error("The payment schedule could not be read — please re-check the rows.");
  }

  return {
    agreement_date: s(fd, "agreement_date"),
    agreement_city: s(fd, "agreement_city") ?? "Makati City",
    landlord_email: s(fd, "landlord_email"),
    landlord_name_hint: s(fd, "landlord_name"),
    landlord_details: {
      name: s(fd, "landlord_name") ?? "",
      idNumber: s(fd, "landlord_id_number") ?? "",
      address: s(fd, "landlord_address") ?? "",
    },
    parking_details: {
      slotLabel: s(fd, "slot_label") ?? "",
      buildingName: s(fd, "building_name") ?? "",
      address: s(fd, "parking_address") ?? "",
    },
    lease_start_date: s(fd, "lease_start_date"),
    lease_end_date: s(fd, "lease_end_date"),
    rent_amount: num(fd, "rent_amount"),
    rent_amount_words: s(fd, "rent_amount_words"),
    signing_total_amount: num(fd, "signing_total_amount"),
    signing_total_words: s(fd, "signing_total_words"),
    sticker_amount: num(fd, "sticker_amount"),
    rent_due_day: rentDueDay,
    payment_schedule: paymentSchedule,
    bank_details: {
      name: s(fd, "bank_name") ?? DEFAULT_PARKING_BANK_DETAILS.name,
      bank: s(fd, "bank_bank") ?? DEFAULT_PARKING_BANK_DETAILS.bank,
      branch: s(fd, "bank_branch") ?? DEFAULT_PARKING_BANK_DETAILS.branch,
      accountNumber: s(fd, "bank_account_number") ?? DEFAULT_PARKING_BANK_DETAILS.accountNumber,
    },
  };
}

// ============================================================
// Create + send links
// ============================================================

export async function createParkingAgreement(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tenantEmail = s(fd, "tenant_email");
  if (!tenantEmail) throw new Error("Tenant email is required.");

  const { data, error } = await supabase
    .from("parking_agreements")
    .insert({
      tenant_email: tenantEmail,
      tenant_name_hint: s(fd, "tenant_name_hint"),
      created_by: user?.id ?? null,
      ...parseTerms(fd),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const id = data.id as string;
  await logAudit(supabase, { action: "parking_agreement.created", entityType: "parking_agreement", entityId: id, actorId: user?.id });
  await sendParkingTenantLink(id);

  revalidatePath("/admin/contracts");
  redirect(`/admin/contracts/parking/${id}`);
}

export async function sendParkingTenantLink(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement, error } = await supabase
    .from("parking_agreements")
    .select("access_token,tenant_email,tenant_name_hint,parking_details,status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "voided" || agreement.status === "completed") {
    throw new Error("This agreement can no longer be sent.");
  }

  const link = `${getPublicSiteUrl()}/sign/parking/${agreement.access_token}`;
  await supabase.from("parking_agreements").update({ status: "sent" }).eq("id", id).eq("status", "draft");

  const pd = (agreement.parking_details ?? {}) as { slotLabel?: string; buildingName?: string };
  await sendEmail({
    to: agreement.tenant_email,
    subject: "Your All Abode Parking Space Rental Agreement is ready to sign",
    html: `
      <p>Hi ${agreement.tenant_name_hint ?? "there"},</p>
      <p>All Abode Property Solutions has prepared your Parking Space Rental Agreement${pd.slotLabel ? ` for ${pd.slotLabel}${pd.buildingName ? ` at ${pd.buildingName}` : ""}` : ""} for review and electronic signature.</p>
      <p><a href="${link}">Review and sign your parking agreement</a></p>
      <p>You'll need a valid government ID (passport preferred) and your vehicle details (make/model, plate number, color) on hand to complete the form.</p>
    `,
  });

  await logAudit(supabase, { action: "parking_agreement.sent", entityType: "parking_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/parking/${id}`);
}

/**
 * Issues (or re-issues) the landlord's own signing link once the tenant has
 * signed. Each send extends the link's validity window.
 */
export async function sendParkingLandlordLink(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement, error } = await supabase
    .from("parking_agreements")
    .select("status,landlord_access_token,landlord_email,landlord_name_hint,tenant_details,landlord_signed_via")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status !== "tenant_signed") {
    throw new Error("The landlord link becomes available once the tenant has signed.");
  }
  if (agreement.landlord_signed_via) {
    throw new Error("The landlord signature is already in place.");
  }

  const landlordEmail = s(fd, "landlord_email") ?? agreement.landlord_email;
  if (!landlordEmail) throw new Error("Enter the landlord's email address first.");

  const token = agreement.landlord_access_token ?? randomUUID();
  const expiresAt = new Date(Date.now() + LANDLORD_LINK_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error: upErr } = await supabase.from("parking_agreements").update({
    landlord_access_token: token,
    landlord_token_expires_at: expiresAt,
    landlord_email: landlordEmail,
  }).eq("id", id);
  if (upErr) throw new Error(upErr.message);

  const td = (agreement.tenant_details ?? {}) as { name?: string };
  const link = `${getPublicSiteUrl()}/sign/parking/landlord/${token}`;
  await sendEmail({
    to: landlordEmail,
    subject: "Parking Space Rental Agreement ready for your signature",
    html: `
      <p>Hi ${agreement.landlord_name_hint ?? "there"},</p>
      <p>${td.name ?? "Your tenant"} has signed the Parking Space Rental Agreement prepared by All Abode Property Solutions. It's now ready for your signature.</p>
      <p><a href="${link}">Review and sign the parking agreement</a></p>
      <p>You'll need a valid government ID (passport preferred) on hand to complete the signing. This link is valid for ${LANDLORD_LINK_VALIDITY_DAYS} days.</p>
    `,
  });

  await logAudit(supabase, { action: "parking_agreement.landlord_link_sent", entityType: "parking_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/parking/${id}`);
}

// ============================================================
// Staff edits (terms lock once the tenant signs)
// ============================================================

export async function updateParkingTerms(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase.from("parking_agreements").select("status").eq("id", id).maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status !== "draft" && agreement.status !== "sent") {
    throw new Error("Terms are locked once the tenant has signed against them.");
  }

  const { landlord_email, landlord_name_hint, ...terms } = parseTerms(fd);
  const { error } = await supabase.from("parking_agreements").update({
    landlord_email, landlord_name_hint, ...terms,
    tenant_name_hint: s(fd, "tenant_name_hint"),
  }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "parking_agreement.terms_updated", entityType: "parking_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/parking/${id}`);
}

// ============================================================
// Landlord countersign fallback (designated signatory) -> completion
// ============================================================

export async function countersignParkingAgreement(id: string, signatureDataUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: staffRow } = await supabase.from("users").select("is_signatory").eq("id", user.id).maybeSingle();
  if (!staffRow?.is_signatory) {
    throw new Error("Only a designated signatory account can countersign this agreement.");
  }

  const { data: agreement } = await supabase
    .from("parking_agreements")
    .select("status,landlord_signed_via,landlord_signature_data,landlord_details")
    .eq("id", id)
    .maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status !== "tenant_signed") {
    throw new Error("This agreement is not ready for the landlord signature yet.");
  }
  if (agreement.landlord_signed_via === "remote" || agreement.landlord_signature_data) {
    throw new Error("The landlord has already signed via their signing link.");
  }

  const ip = await clientIp();
  const landlordName = (agreement.landlord_details as { name?: string } | null)?.name ?? "";
  const { error } = await supabase.from("parking_agreements").update({
    landlord_typed_name: landlordName,
    landlord_signature_data: signatureDataUrl,
    landlord_signed_at: new Date().toISOString(),
    landlord_signed_ip: ip,
    landlord_signed_via: "countersign",
    signatory_user_id: user.id,
  }).eq("id", id).is("landlord_signature_data", null);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "parking_agreement.countersigned", entityType: "parking_agreement", entityId: id, actorId: user.id });

  await completeParkingAgreement(id, supabase);
  revalidatePath(`/admin/contracts/parking/${id}`);
}

/**
 * Retry button for the case where the landlord's remote signature landed but
 * the completion pipeline failed afterwards (the signature is durable; the
 * status stays 'tenant_signed' until this succeeds).
 */
export async function finalizeParkingAgreement(id: string) {
  const supabase = await createClient();

  const { data: agreement } = await supabase
    .from("parking_agreements")
    .select("status,landlord_signature_data")
    .eq("id", id)
    .maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "completed") return;
  if (agreement.status !== "tenant_signed" || !agreement.landlord_signature_data) {
    throw new Error("Both signatures are required before the agreement can be finalized.");
  }

  await completeParkingAgreement(id, supabase);
  revalidatePath(`/admin/contracts/parking/${id}`);
}

// ============================================================
// Void / delete (same semantics as the other agreement flows)
// ============================================================

export async function voidParkingAgreement(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase.from("parking_agreements").select("status").eq("id", id).maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "voided") return;

  const { error } = await supabase.from("parking_agreements").update({ status: "voided" }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "parking_agreement.voided", entityType: "parking_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/parking/${id}`);
  revalidatePath("/admin/contracts");
}

export async function deleteParkingAgreement(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase
    .from("parking_agreements")
    .select("status,pdf_path,tenant_id_document_path,landlord_id_document_path")
    .eq("id", id)
    .maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "completed") {
    throw new Error("A fully executed agreement can't be deleted — void it instead to preserve the signed record.");
  }

  const paths = [agreement.pdf_path, agreement.tenant_id_document_path, agreement.landlord_id_document_path]
    .filter((p): p is string => !!p);
  if (paths.length) {
    await supabase.storage.from(AGREEMENTS_BUCKET).remove(paths);
  }

  const { error } = await supabase.from("parking_agreements").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "parking_agreement.deleted", entityType: "parking_agreement", entityId: id, actorId: user?.id });
  revalidatePath("/admin/contracts");
  redirect("/admin/contracts");
}

export async function getParkingPdfSignedUrl(id: string) {
  const supabase = await createClient();
  const { data: a } = await supabase.from("parking_agreements").select("pdf_path,status").eq("id", id).maybeSingle();
  if (!a?.pdf_path || a.status !== "completed") return null;
  return signedUrl(supabase, AGREEMENTS_BUCKET, a.pdf_path, 120);
}
