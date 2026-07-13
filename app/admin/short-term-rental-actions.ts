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
import { completeStrAgreement } from "@/lib/short-term-rental/complete";
import type { StrFeeItem, StrInventoryRow } from "@/lib/pm/short-term-rental-clauses";
import { DEFAULT_STR_BANK_DETAILS } from "@/lib/pm/short-term-rental-clauses";

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

const HOMEOWNER_LINK_VALIDITY_DAYS = 14;

/** Staff-authored term columns, shared by create + update. */
function parseTerms(fd: FormData) {
  let feeItems: StrFeeItem[] = [];
  try {
    const raw = s(fd, "fee_items");
    if (raw) feeItems = JSON.parse(raw) as StrFeeItem[];
  } catch {
    throw new Error("The fee items could not be read — please re-check the rows.");
  }

  let occupants: string[] = [];
  try {
    const raw = s(fd, "occupants");
    if (raw) occupants = JSON.parse(raw) as string[];
  } catch {
    throw new Error("The occupants list could not be read.");
  }

  let inventory: StrInventoryRow[] = [];
  try {
    const raw = s(fd, "inventory");
    if (raw) inventory = JSON.parse(raw) as StrInventoryRow[];
  } catch {
    throw new Error("The rental agreement checklist could not be read — please re-check the rows.");
  }

  return {
    agreement_date: s(fd, "agreement_date"),
    homeowner_email: s(fd, "homeowner_email"),
    homeowner_name_hint: s(fd, "homeowner_name"),
    homeowner_details: {
      name: s(fd, "homeowner_name") ?? "",
      address: s(fd, "homeowner_address") ?? "",
    },
    property_details: {
      buildingName: s(fd, "building_name") ?? "",
      unitNumber: s(fd, "unit_number") ?? "",
      address: s(fd, "property_address") ?? "",
    },
    check_in_date: s(fd, "check_in_date"),
    check_out_date: s(fd, "check_out_date"),
    occupants,
    amenity_location: s(fd, "amenity_location"),
    amenities_list: s(fd, "amenities_list"),
    garbage_disposal_location: s(fd, "garbage_disposal_location"),
    fee_items: feeItems,
    security_deposit_amount: num(fd, "security_deposit_amount"),
    bank_details: {
      name: s(fd, "bank_name") ?? DEFAULT_STR_BANK_DETAILS.name,
      bank: s(fd, "bank_bank") ?? DEFAULT_STR_BANK_DETAILS.bank,
      branch: s(fd, "bank_branch") ?? DEFAULT_STR_BANK_DETAILS.branch,
      accountNumber: s(fd, "bank_account_number") ?? DEFAULT_STR_BANK_DETAILS.accountNumber,
    },
    inventory,
  };
}

// ============================================================
// Create + send links
// ============================================================

export async function createStrAgreement(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tenantEmail = s(fd, "tenant_email");
  if (!tenantEmail) throw new Error("Tenant email is required.");

  const { data, error } = await supabase
    .from("short_term_rental_agreements")
    .insert({
      tenant_email: tenantEmail,
      tenant_name_hint: s(fd, "tenant_name_hint"),
      tenant_details: tenantDetailsFromForm(fd, tenantEmail),
      created_by: user?.id ?? null,
      ...parseTerms(fd),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const id = data.id as string;
  await logAudit(supabase, { action: "short_term_rental_agreement.created", entityType: "short_term_rental_agreement", entityId: id, actorId: user?.id });
  await sendStrTenantLink(id);

  revalidatePath("/admin/contracts");
  redirect(`/admin/contracts/short-term-rental/${id}`);
}

export async function sendStrTenantLink(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement, error } = await supabase
    .from("short_term_rental_agreements")
    .select("access_token,tenant_email,tenant_name_hint,property_details,status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "voided" || agreement.status === "completed") {
    throw new Error("This agreement can no longer be sent.");
  }

  const link = `${getPublicSiteUrl()}/sign/short-term-rental/${agreement.access_token}`;
  await supabase.from("short_term_rental_agreements").update({ status: "sent" }).eq("id", id).eq("status", "draft");

  const pd = (agreement.property_details ?? {}) as { buildingName?: string; unitNumber?: string };
  await sendEmail({
    to: agreement.tenant_email,
    subject: "Your All Abode Short Term Rental Agreement is ready to sign",
    html: `
      <p>Hi ${agreement.tenant_name_hint ?? "there"},</p>
      <p>All Abode Brokerage and Valuation OPC has prepared your Short Term Rental Agreement${pd.buildingName ? ` for ${pd.unitNumber ? `${pd.unitNumber}, ` : ""}${pd.buildingName}` : ""} for review and electronic signature.</p>
      <p><a href="${link}">Review and sign your rental agreement</a></p>
      <p>You'll need a valid ID on hand to complete the form.</p>
    `,
  });

  await logAudit(supabase, { action: "short_term_rental_agreement.sent", entityType: "short_term_rental_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/short-term-rental/${id}`);
}

/**
 * Issues (or re-issues) the homeowner's own signing link once the tenant has
 * signed. Each send extends the link's validity window.
 */
export async function sendStrHomeownerLink(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement, error } = await supabase
    .from("short_term_rental_agreements")
    .select("status,homeowner_access_token,homeowner_email,homeowner_name_hint,tenant_details,homeowner_signed_via")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status !== "tenant_signed") {
    throw new Error("The homeowner link becomes available once the tenant has signed.");
  }
  if (agreement.homeowner_signed_via) {
    throw new Error("The homeowner signature is already in place.");
  }

  const homeownerEmail = s(fd, "homeowner_email") ?? agreement.homeowner_email;
  if (!homeownerEmail) throw new Error("Enter the homeowner's email address first.");

  const token = agreement.homeowner_access_token ?? randomUUID();
  const expiresAt = new Date(Date.now() + HOMEOWNER_LINK_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error: upErr } = await supabase.from("short_term_rental_agreements").update({
    homeowner_access_token: token,
    homeowner_token_expires_at: expiresAt,
    homeowner_email: homeownerEmail,
  }).eq("id", id);
  if (upErr) throw new Error(upErr.message);

  const td = (agreement.tenant_details ?? {}) as { name?: string };
  const link = `${getPublicSiteUrl()}/sign/short-term-rental/homeowner/${token}`;
  await sendEmail({
    to: homeownerEmail,
    subject: "Short Term Rental Agreement ready for your signature",
    html: `
      <p>Hi ${agreement.homeowner_name_hint ?? "there"},</p>
      <p>${td.name ?? "Your tenant"} has signed the Short Term Rental Agreement prepared by All Abode Brokerage and Valuation OPC. It's now ready for your signature.</p>
      <p><a href="${link}">Review and sign the rental agreement</a></p>
      <p>You'll need a valid ID on hand to complete the signing. This link is valid for ${HOMEOWNER_LINK_VALIDITY_DAYS} days.</p>
    `,
  });

  await logAudit(supabase, { action: "short_term_rental_agreement.homeowner_link_sent", entityType: "short_term_rental_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/short-term-rental/${id}`);
}

// ============================================================
// Staff edits (terms lock once the tenant signs)
// ============================================================

export async function updateStrTerms(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase.from("short_term_rental_agreements").select("status,tenant_details").eq("id", id).maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status !== "draft" && agreement.status !== "sent") {
    throw new Error("Terms are locked once the tenant has signed against them.");
  }

  const { homeowner_email, homeowner_name_hint, ...terms } = parseTerms(fd);
  const { error } = await supabase.from("short_term_rental_agreements").update({
    homeowner_email, homeowner_name_hint, ...terms,
    tenant_name_hint: s(fd, "tenant_name_hint"),
    tenant_details: tenantDetailsFromForm(fd, s(fd, "tenant_email"), (agreement.tenant_details ?? {}) as Record<string, unknown>),
  }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "short_term_rental_agreement.terms_updated", entityType: "short_term_rental_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/short-term-rental/${id}`);
}

/** Annex A (Rental Agreement Checklist) stays editable through completion. */
export async function updateStrInventory(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase.from("short_term_rental_agreements").select("status").eq("id", id).maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "completed" || agreement.status === "voided") {
    throw new Error("This agreement's checklist can no longer be edited.");
  }

  let inventory: StrInventoryRow[] = [];
  try {
    const raw = s(fd, "inventory");
    if (raw) inventory = JSON.parse(raw) as StrInventoryRow[];
  } catch {
    throw new Error("The checklist could not be read — please re-check the rows.");
  }

  const { error } = await supabase.from("short_term_rental_agreements").update({ inventory }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "short_term_rental_agreement.inventory_updated", entityType: "short_term_rental_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/short-term-rental/${id}`);
}

// ============================================================
// Homeowner countersign fallback (designated signatory) -> completion
// ============================================================

export async function countersignStrAgreement(id: string, signatureDataUrl: string, typedName: string) {
  if (!typedName.trim()) throw new Error("Please enter your name.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: staffRow } = await supabase.from("users").select("is_signatory").eq("id", user.id).maybeSingle();
  if (!staffRow?.is_signatory) {
    throw new Error("Only a designated signatory account can countersign this agreement.");
  }

  const { data: agreement } = await supabase
    .from("short_term_rental_agreements")
    .select("status,homeowner_signed_via,homeowner_signature_data")
    .eq("id", id)
    .maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status !== "tenant_signed") {
    throw new Error("This agreement is not ready for the homeowner signature yet.");
  }
  if (agreement.homeowner_signed_via === "remote" || agreement.homeowner_signature_data) {
    throw new Error("The homeowner has already signed via their signing link.");
  }

  const ip = await clientIp();
  const { error } = await supabase.from("short_term_rental_agreements").update({
    homeowner_typed_name: typedName.trim(),
    homeowner_signature_data: signatureDataUrl,
    homeowner_signed_at: new Date().toISOString(),
    homeowner_signed_ip: ip,
    homeowner_signed_via: "countersign",
    signatory_user_id: user.id,
  }).eq("id", id).is("homeowner_signature_data", null);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "short_term_rental_agreement.countersigned", entityType: "short_term_rental_agreement", entityId: id, actorId: user.id });

  await completeStrAgreement(id, supabase);
  revalidatePath(`/admin/contracts/short-term-rental/${id}`);
}

/**
 * Retry button for the case where the homeowner's remote signature landed
 * but the completion pipeline failed afterwards (the signature is durable;
 * the status stays 'tenant_signed' until this succeeds).
 */
export async function finalizeStrAgreement(id: string) {
  const supabase = await createClient();

  const { data: agreement } = await supabase
    .from("short_term_rental_agreements")
    .select("status,homeowner_signature_data")
    .eq("id", id)
    .maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "completed") return;
  if (agreement.status !== "tenant_signed" || !agreement.homeowner_signature_data) {
    throw new Error("Both signatures are required before the agreement can be finalized.");
  }

  await completeStrAgreement(id, supabase);
  revalidatePath(`/admin/contracts/short-term-rental/${id}`);
}

// ============================================================
// Void / delete (same semantics as the other agreement flows)
// ============================================================

export async function voidStrAgreement(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase.from("short_term_rental_agreements").select("status").eq("id", id).maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "voided") return;

  const { error } = await supabase.from("short_term_rental_agreements").update({ status: "voided" }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "short_term_rental_agreement.voided", entityType: "short_term_rental_agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/short-term-rental/${id}`);
  revalidatePath("/admin/contracts");
}

export async function deleteStrAgreement(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase
    .from("short_term_rental_agreements")
    .select("status,pdf_path,tenant_id_document_path,homeowner_id_document_path")
    .eq("id", id)
    .maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "completed") {
    throw new Error("A fully executed agreement can't be deleted — void it instead to preserve the signed record.");
  }

  const paths = [agreement.pdf_path, agreement.tenant_id_document_path, agreement.homeowner_id_document_path]
    .filter((p): p is string => !!p);
  if (paths.length) {
    await supabase.storage.from(AGREEMENTS_BUCKET).remove(paths);
  }

  const { error } = await supabase.from("short_term_rental_agreements").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "short_term_rental_agreement.deleted", entityType: "short_term_rental_agreement", entityId: id, actorId: user?.id });
  revalidatePath("/admin/contracts");
  redirect("/admin/contracts");
}

export async function getStrPdfSignedUrl(id: string) {
  const supabase = await createClient();
  const { data: a } = await supabase.from("short_term_rental_agreements").select("pdf_path,status").eq("id", id).maybeSingle();
  if (!a?.pdf_path || a.status !== "completed") return null;
  return signedUrl(supabase, AGREEMENTS_BUCKET, a.pdf_path, 120);
}
