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
import { completeTenancyAgreement } from "@/lib/tenancy/complete";
import type { PaymentScheduleRow, InventoryRow } from "@/lib/pm/tenancy-clauses";
import { DEFAULT_BANK_DETAILS, DEFAULT_INVENTORY } from "@/lib/pm/tenancy-clauses";

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

function tenantDetailsFromForm(fd: FormData, tenantEmail: string | null, existing: Record<string, unknown> = {}) {
  return {
    ...existing,
    name: s(fd, "tenant_name_hint") ?? "",
    address: s(fd, "tenant_address") ?? "",
    contact: s(fd, "tenant_contact") ?? "",
    email: tenantEmail ?? "",
  };
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
  const leaseMonths = num(fd, "lease_months");
  if (leaseMonths !== null && (!Number.isInteger(leaseMonths) || leaseMonths < 1)) {
    throw new Error("Lease period must be a whole number of months.");
  }

  let paymentSchedule: PaymentScheduleRow[] = [];
  try {
    const raw = s(fd, "payment_schedule");
    if (raw) paymentSchedule = JSON.parse(raw) as PaymentScheduleRow[];
  } catch {
    throw new Error("The payment schedule could not be read — please re-check the rows.");
  }

  return {
    unit_id: s(fd, "unit_id"),
    agreement_date: s(fd, "agreement_date"),
    landlord_email: s(fd, "landlord_email"),
    landlord_name_hint: s(fd, "landlord_name"),
    landlord_details: {
      name: s(fd, "landlord_name") ?? "",
      address: s(fd, "landlord_address") ?? "",
    },
    property_details: {
      buildingName: s(fd, "building_name") ?? "",
      floorUnit: s(fd, "floor_unit") ?? "",
      address: s(fd, "property_address") ?? "",
    },
    lease_months: leaseMonths,
    lease_start_date: s(fd, "lease_start_date"),
    lease_end_date: s(fd, "lease_end_date"),
    rent_amount: num(fd, "rent_amount"),
    rent_amount_words: s(fd, "rent_amount_words"),
    advance_deposit_amount: num(fd, "advance_deposit_amount"),
    advance_deposit_words: s(fd, "advance_deposit_words"),
    deposit_amount: num(fd, "deposit_amount"),
    deposit_amount_words: s(fd, "deposit_amount_words"),
    rent_due_day: rentDueDay,
    payment_schedule: paymentSchedule,
    bank_details: {
      name: s(fd, "bank_name") ?? DEFAULT_BANK_DETAILS.name,
      bank: s(fd, "bank_bank") ?? DEFAULT_BANK_DETAILS.bank,
      branch: s(fd, "bank_branch") ?? DEFAULT_BANK_DETAILS.branch,
      accountNumber: s(fd, "bank_account_number") ?? DEFAULT_BANK_DETAILS.accountNumber,
    },
  };
}

// ============================================================
// Create + send links
// ============================================================

export async function createTenancyAgreement(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tenantEmail = s(fd, "tenant_email");
  if (!tenantEmail) throw new Error("Tenant email is required.");

  const { data, error } = await supabase
    .from("tenancy_agreements")
    .insert({
      tenant_email: tenantEmail,
      tenant_name_hint: s(fd, "tenant_name_hint"),
      tenant_details: tenantDetailsFromForm(fd, tenantEmail),
      created_by: user?.id ?? null,
      inventory: DEFAULT_INVENTORY,
      ...parseTerms(fd),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const id = data.id as string;
  await logAudit(supabase, { action: "tenancy_agreement.created", entityType: "tenancy_agreement", entityId: id, actorId: user?.id });
  await sendTenancyTenantLink(id);

  revalidatePath("/admin/contracts");
  redirect(`/admin/contracts/tenancy/${id}`);
}

export async function sendTenancyTenantLink(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement, error } = await supabase
    .from("tenancy_agreements")
    .select("access_token,tenant_email,tenant_name_hint,property_details,status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "voided" || agreement.status === "completed") {
    throw new Error("This agreement can no longer be sent.");
  }

  const link = `${getPublicSiteUrl()}/sign/tenancy/${agreement.access_token}`;
  await supabase.from("tenancy_agreements").update({ status: "sent" }).eq("id", id).eq("status", "draft");

  const pd = (agreement.property_details ?? {}) as { buildingName?: string; floorUnit?: string };
  await sendEmail({
    to: agreement.tenant_email,
    subject: "Your All Abode Tenancy Agreement is ready to sign",
    html: `
      <p>Hi ${agreement.tenant_name_hint ?? "there"},</p>
      <p>All Abode Property Solutions has prepared your Tenancy Agreement${pd.buildingName ? ` for ${pd.buildingName}${pd.floorUnit ? ` ${pd.floorUnit}` : ""}` : ""} for review and electronic signature.</p>
      <p><a href="${link}">Review and sign your tenancy agreement</a></p>
      <p>You'll need a valid ID (passport preferred; School ID allowed for students 18+) on hand to complete the form.</p>
    `,
  });

  await logAudit(supabase, { action: "tenancy_agreement.sent", entityType: "tenancy_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/tenancy/${id}`);
}

/**
 * Issues (or re-issues) the landlord's own signing link once the tenant has
 * signed. Each send extends the link's validity window.
 */
export async function sendTenancyLandlordLink(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement, error } = await supabase
    .from("tenancy_agreements")
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
  const { error: upErr } = await supabase.from("tenancy_agreements").update({
    landlord_access_token: token,
    landlord_token_expires_at: expiresAt,
    landlord_email: landlordEmail,
  }).eq("id", id);
  if (upErr) throw new Error(upErr.message);

  const td = (agreement.tenant_details ?? {}) as { name?: string };
  const link = `${getPublicSiteUrl()}/sign/tenancy/landlord/${token}`;
  await sendEmail({
    to: landlordEmail,
    subject: "Tenancy Agreement ready for your signature",
    html: `
      <p>Hi ${agreement.landlord_name_hint ?? "there"},</p>
      <p>${td.name ?? "Your tenant"} has signed the Tenancy Agreement prepared by All Abode Property Solutions. It's now ready for your signature.</p>
      <p><a href="${link}">Review and sign the tenancy agreement</a></p>
      <p>You'll need a valid ID (passport preferred; School ID allowed for students 18+) on hand to complete the signing. This link is valid for ${LANDLORD_LINK_VALIDITY_DAYS} days.</p>
    `,
  });

  await logAudit(supabase, { action: "tenancy_agreement.landlord_link_sent", entityType: "tenancy_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/tenancy/${id}`);
}

// ============================================================
// Staff edits (terms lock once the tenant signs; inventory stays open)
// ============================================================

export async function updateTenancyTerms(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase.from("tenancy_agreements").select("status,tenant_details").eq("id", id).maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status !== "draft" && agreement.status !== "sent") {
    throw new Error("Terms are locked once the tenant has signed against them.");
  }

  const { landlord_email, landlord_name_hint, ...terms } = parseTerms(fd);
  const { error } = await supabase.from("tenancy_agreements").update({
    landlord_email, landlord_name_hint, ...terms,
    tenant_name_hint: s(fd, "tenant_name_hint"),
    tenant_details: tenantDetailsFromForm(fd, s(fd, "tenant_email"), (agreement.tenant_details ?? {}) as Record<string, unknown>),
  }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "tenancy_agreement.terms_updated", entityType: "tenancy_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/tenancy/${id}`);
}

export async function updateTenancyInventory(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase.from("tenancy_agreements").select("status").eq("id", id).maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "completed" || agreement.status === "voided") {
    throw new Error("This agreement is locked.");
  }

  let inventory: InventoryRow[] = [];
  try {
    const raw = s(fd, "inventory");
    if (raw) inventory = JSON.parse(raw) as InventoryRow[];
  } catch {
    throw new Error("The inventory rows could not be read.");
  }

  const { error } = await supabase.from("tenancy_agreements").update({ inventory }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "tenancy_agreement.inventory_updated", entityType: "tenancy_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/tenancy/${id}`);
}

// ============================================================
// Landlord countersign fallback (designated signatory) -> completion
// ============================================================

export async function countersignTenancyAgreement(id: string, signatureDataUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: staffRow } = await supabase.from("users").select("is_signatory").eq("id", user.id).maybeSingle();
  if (!staffRow?.is_signatory) {
    throw new Error("Only a designated signatory account can countersign this agreement.");
  }

  const { data: agreement } = await supabase
    .from("tenancy_agreements")
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
  const { error } = await supabase.from("tenancy_agreements").update({
    landlord_typed_name: landlordName,
    landlord_signature_data: signatureDataUrl,
    landlord_signed_at: new Date().toISOString(),
    landlord_signed_ip: ip,
    landlord_signed_via: "countersign",
    signatory_user_id: user.id,
  }).eq("id", id).is("landlord_signature_data", null);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "tenancy_agreement.countersigned", entityType: "tenancy_agreement", entityId: id, actorId: user.id });

  await completeTenancyAgreement(id, supabase);
  revalidatePath(`/admin/contracts/tenancy/${id}`);
}

/**
 * Retry button for the case where the landlord's remote signature landed but
 * the completion pipeline failed afterwards (the signature is durable; the
 * status stays 'tenant_signed' until this succeeds).
 */
export async function finalizeTenancyAgreement(id: string) {
  const supabase = await createClient();

  const { data: agreement } = await supabase
    .from("tenancy_agreements")
    .select("status,landlord_signature_data")
    .eq("id", id)
    .maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "completed") return;
  if (agreement.status !== "tenant_signed" || !agreement.landlord_signature_data) {
    throw new Error("Both signatures are required before the agreement can be finalized.");
  }

  await completeTenancyAgreement(id, supabase);
  revalidatePath(`/admin/contracts/tenancy/${id}`);
}

// ============================================================
// Void / delete (same semantics as the PM agreement)
// ============================================================

export async function voidTenancyAgreement(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase.from("tenancy_agreements").select("status").eq("id", id).maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "voided") return;

  const { error } = await supabase.from("tenancy_agreements").update({ status: "voided" }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "tenancy_agreement.voided", entityType: "tenancy_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/tenancy/${id}`);
  revalidatePath("/admin/contracts");
}

export async function deleteTenancyAgreement(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase
    .from("tenancy_agreements")
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

  const { error } = await supabase.from("tenancy_agreements").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "tenancy_agreement.deleted", entityType: "tenancy_agreement", entityId: id, actorId: user?.id });
  revalidatePath("/admin/contracts");
  redirect("/admin/contracts");
}

export async function getTenancyPdfSignedUrl(id: string) {
  const supabase = await createClient();
  const { data: a } = await supabase.from("tenancy_agreements").select("pdf_path,status").eq("id", id).maybeSingle();
  if (!a?.pdf_path || a.status !== "completed") return null;
  return signedUrl(supabase, AGREEMENTS_BUCKET, a.pdf_path, 120);
}
