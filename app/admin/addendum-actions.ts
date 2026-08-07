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
import { completeAddendum } from "@/lib/addendum/complete";
import type {
  AddendumFeeItem, AddendumScheduleRow, AddendumPartyChange,
  AddendumAmendedClause, AddendumParentType, AddendumParentSnapshot,
  AddendumParentSource,
} from "@/lib/pm/addendum-clauses";
import { DEFAULT_ADDENDUM_BANK_DETAILS, PARENT_TYPE_TITLE } from "@/lib/pm/addendum-clauses";
import { isAiConfigured } from "@/lib/ai/client";
import { extractParentContract, isSupportedContractMime, type ContractExtraction } from "@/lib/ai/contract-extract";

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
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

function parseJson<T>(fd: FormData, key: string, label: string): T[] {
  try {
    const raw = s(fd, key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    throw new Error(`The ${label} could not be read — please re-check the rows.`);
  }
}

/** Staff-authored amendment columns, shared by create + update. */
function parseTerms(fd: FormData) {
  const feeItems = parseJson<AddendumFeeItem>(fd, "fee_items", "fee items");
  const paymentSchedule = parseJson<AddendumScheduleRow>(fd, "payment_schedule", "payment schedule");
  const partyChanges = parseJson<AddendumPartyChange>(fd, "party_changes", "party changes");
  const amendedClauses = parseJson<AddendumAmendedClause>(fd, "amended_clauses", "amended provisions");

  return {
    landlord_email: s(fd, "landlord_email"),
    landlord_name_hint: s(fd, "landlord_name_hint"),
    agreement_date: s(fd, "agreement_date"),
    effective_date: s(fd, "effective_date"),
    landlord_details: {
      name: s(fd, "landlord_name_hint") ?? "",
      address: s(fd, "landlord_address") ?? "",
    },
    new_start_date: s(fd, "new_start_date"),
    new_end_date: s(fd, "new_end_date"),
    fee_items: feeItems,
    payment_schedule: paymentSchedule,
    party_changes: partyChanges,
    amended_clauses: amendedClauses,
    bank_details: {
      name: s(fd, "bank_name") ?? DEFAULT_ADDENDUM_BANK_DETAILS.name,
      bank: s(fd, "bank_bank") ?? DEFAULT_ADDENDUM_BANK_DETAILS.bank,
      branch: s(fd, "bank_branch") ?? DEFAULT_ADDENDUM_BANK_DETAILS.branch,
      accountNumber: s(fd, "bank_account_number") ?? DEFAULT_ADDENDUM_BANK_DETAILS.accountNumber,
    },
  };
}

// ============================================================
// Parent contract picker
// ============================================================

export type ParentContractOption = {
  parentType: AddendumParentType;
  parentId: string;
  referenceCode: string;
  contractTitle: string;
  agreementDate: string | null;
  propertyDescription: string;
  counterpartyName: string;
  counterpartyEmail: string;
  landlordName: string;
  signedAt: string | null;
};

function refCode(prefix: string, id: string) {
  return `${prefix}-${id.slice(0, 8).toUpperCase()}`;
}

/**
 * Only *completed* contracts can be amended — an agreement that has not been
 * executed has nothing to amend; staff should edit it in place instead.
 */
export async function listAmendableContracts(): Promise<ParentContractOption[]> {
  const supabase = await createClient();
  const [{ data: pm }, { data: tenancy }, { data: parking }, { data: str }] = await Promise.all([
    supabase
      .from("agreements")
      .select("id,owner_email,owner_name_hint,owner_details,property_details,created_at,manager_signed_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
    supabase
      .from("tenancy_agreements")
      .select("id,tenant_email,tenant_name_hint,tenant_details,landlord_details,property_details,agreement_date,landlord_signed_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
    supabase
      .from("parking_agreements")
      .select("id,tenant_email,tenant_name_hint,tenant_details,landlord_details,parking_details,agreement_date,landlord_signed_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
    supabase
      .from("short_term_rental_agreements")
      .select("id,tenant_email,tenant_name_hint,tenant_details,landlord_details,property_details,agreement_date,landlord_signed_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
  ]);

  const options: ParentContractOption[] = [];

  for (const r of pm ?? []) {
    const od = (r.owner_details ?? {}) as { name?: string; address?: string };
    // The PM flow names these `condo`/`unit`, not buildingName/unitNumber.
    const pd = (r.property_details ?? {}) as { condo?: string; unit?: string; address?: string };
    options.push({
      parentType: "pm",
      parentId: r.id,
      referenceCode: refCode("AGMT", r.id),
      contractTitle: PARENT_TYPE_TITLE.pm,
      agreementDate: r.created_at ?? null,
      propertyDescription: [pd.unit, pd.condo, pd.address].filter(Boolean).join(", ") || "—",
      counterpartyName: od.name || r.owner_name_hint || r.owner_email,
      counterpartyEmail: r.owner_email,
      landlordName: od.name || r.owner_name_hint || "",
      signedAt: r.manager_signed_at ?? null,
    });
  }

  const pushTenantSide = (
    rows: Record<string, unknown>[] | null,
    parentType: Exclude<AddendumParentType, "pm">,
    prefix: string,
    describe: (row: Record<string, unknown>) => string,
  ) => {
    for (const r of rows ?? []) {
      const td = (r.tenant_details ?? {}) as { name?: string };
      const ld = (r.landlord_details ?? {}) as { name?: string };
      options.push({
        parentType,
        parentId: r.id as string,
        referenceCode: refCode(prefix, r.id as string),
        contractTitle: PARENT_TYPE_TITLE[parentType],
        agreementDate: (r.agreement_date as string | null) ?? null,
        propertyDescription: describe(r),
        counterpartyName: td.name || (r.tenant_name_hint as string | null) || (r.tenant_email as string),
        counterpartyEmail: r.tenant_email as string,
        landlordName: ld.name || "",
        signedAt: (r.landlord_signed_at as string | null) ?? null,
      });
    }
  };

  pushTenantSide(tenancy as Record<string, unknown>[] | null, "tenancy", "TA", (r) => {
    const pd = (r.property_details ?? {}) as { buildingName?: string; floorUnit?: string; address?: string };
    return [pd.floorUnit, pd.buildingName, pd.address].filter(Boolean).join(", ") || "—";
  });
  pushTenantSide(parking as Record<string, unknown>[] | null, "parking", "PA", (r) => {
    const pd = (r.parking_details ?? {}) as { slotLabel?: string; buildingName?: string };
    return [pd.slotLabel, pd.buildingName].filter(Boolean).join(", ") || "—";
  });
  pushTenantSide(str as Record<string, unknown>[] | null, "short_term_rental", "STR", (r) => {
    const pd = (r.property_details ?? {}) as { buildingName?: string; unitNumber?: string; address?: string };
    return [pd.unitNumber, pd.buildingName, pd.address].filter(Boolean).join(", ") || "—";
  });

  return options;
}

// ============================================================
// Uploaded (off-system) parent contract
// ============================================================

/** Where the amended contract came from — an in-system row, or an uploaded copy. */
function parseParentSource(fd: FormData): AddendumParentSource {
  return s(fd, "parent_source") === "uploaded" ? "uploaded" : "system";
}

/**
 * The parent's identity is snapshotted rather than joined, so an executed
 * addendum keeps printing the parent exactly as it stood when signed. For an
 * uploaded parent these four fields are AI-read and then staff-corrected on the
 * form — what lands here is what a human approved, not what the model said.
 */
function parseParentSnapshot(
  fd: FormData,
  parentType: AddendumParentType,
  source: AddendumParentSource,
): AddendumParentSnapshot {
  return {
    contractTitle: s(fd, "parent_contract_title") ?? PARENT_TYPE_TITLE[parentType],
    referenceCode: s(fd, "parent_reference_code") ?? "",
    agreementDate: s(fd, "parent_agreement_date") ?? "",
    propertyDescription: s(fd, "parent_property_description") ?? "",
    source,
  };
}

/** The extraction record round-trips through the form as JSON; a broken one is not worth failing the send over. */
function parseParentExtraction(fd: FormData): ContractExtraction | null {
  const raw = s(fd, "parent_extraction");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ContractExtraction;
  } catch {
    return null;
  }
}

export type AnalyzeContractState =
  | { ok?: false; error?: string; extraction?: undefined }
  | { ok: true; error?: undefined; extraction: ContractExtraction };

const MAX_CONTRACT_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * Reads an already-uploaded contract file and returns the extraction for staff
 * review. The file itself is uploaded straight from the browser to the private
 * `agreements` bucket (staff sessions already satisfy its RLS), so a 15 MB scan
 * never has to travel through a server action body.
 *
 * Returns `{ error }` rather than throwing — the create form renders failures
 * inline via `useActionState`, the same convention as `uploadReceipt`.
 */
export async function analyzeUploadedContract(
  _prev: AnalyzeContractState,
  fd: FormData,
): Promise<AnalyzeContractState> {
  const path = s(fd, "path");
  const mime = s(fd, "mime") ?? "";
  const fileName = s(fd, "file_name") ?? "contract.pdf";
  if (!path) return { error: "The upload did not complete — please try the file again." };
  if (!isSupportedContractMime(mime)) {
    return { error: "Upload the contract as a PDF, JPG, PNG or WebP file." };
  }
  if (!isAiConfigured()) {
    return {
      error:
        "AI reading is not configured on this environment. The file is attached — fill in the contract details below by hand.",
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: blob, error: dlErr } = await supabase.storage.from(AGREEMENTS_BUCKET).download(path);
  if (dlErr || !blob) return { error: "The uploaded file could not be read back from storage." };
  if (blob.size > MAX_CONTRACT_UPLOAD_BYTES) {
    return { error: "That file is larger than 20 MB — upload a smaller scan or split it." };
  }

  let extraction: ContractExtraction;
  try {
    extraction = await extractParentContract(Buffer.from(await blob.arrayBuffer()), mime, fileName);
  } catch (e) {
    return {
      error: `The contract could not be read automatically (${e instanceof Error ? e.message : "unknown error"}). The file is attached — fill in the contract details below by hand.`,
    };
  }

  // No addendum row exists yet, and `audit_log.entity_id` is a uuid — the file
  // path belongs in metadata, not there.
  await logAudit(supabase, {
    action: "addendum.parent_extracted",
    entityType: "addendum",
    actorId: user?.id,
    metadata: { path, mime, file_name: fileName, model: extraction.model_name, confidence: extraction.confidence },
  });

  return { ok: true, extraction };
}

// ============================================================
// Create + send links
// ============================================================

export async function createAddendum(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tenantEmail = s(fd, "tenant_email");
  if (!tenantEmail) throw new Error("Tenant email is required.");

  const parentType = s(fd, "parent_type") as AddendumParentType | null;
  const parentId = s(fd, "parent_id");
  const parentSource = parseParentSource(fd);
  if (!parentType) throw new Error("Select the contract this addendum amends.");
  if (!PARENT_TYPE_TITLE[parentType]) throw new Error("Unknown parent contract type.");

  const parentDocumentPath = s(fd, "parent_document_path");
  if (parentSource === "system" && !parentId) {
    throw new Error("Select the contract this addendum amends.");
  }
  if (parentSource === "uploaded" && !parentDocumentPath) {
    throw new Error("Upload the signed original contract this addendum amends.");
  }

  const { data, error } = await supabase
    .from("addenda")
    .insert({
      tenant_email: tenantEmail,
      tenant_name_hint: s(fd, "tenant_name_hint"),
      tenant_details: tenantDetailsFromForm(fd, tenantEmail),
      parent_type: parentType,
      parent_id: parentSource === "uploaded" ? null : parentId,
      parent_source: parentSource,
      parent_document_path: parentSource === "uploaded" ? parentDocumentPath : null,
      parent_document_name: parentSource === "uploaded" ? s(fd, "parent_document_name") : null,
      parent_extraction: parentSource === "uploaded" ? parseParentExtraction(fd) : null,
      parent_snapshot: parseParentSnapshot(fd, parentType, parentSource),
      created_by: user?.id ?? null,
      ...parseTerms(fd),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const id = data.id as string;
  await logAudit(supabase, { action: "addendum.created", entityType: "addendum", entityId: id, actorId: user?.id });
  await sendAddendumTenantLink(id);

  revalidatePath("/admin/contracts");
  redirect(`/admin/contracts/addendum/${id}`);
}

export async function sendAddendumTenantLink(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: addendum, error } = await supabase
    .from("addenda")
    .select("access_token,tenant_email,tenant_name_hint,parent_snapshot,parent_type,status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!addendum) throw new Error("Addendum not found.");

  const link = `${getPublicSiteUrl()}/sign/addendum/${addendum.access_token}`;
  await supabase.from("addenda").update({ status: "sent" }).eq("id", id).eq("status", "draft");

  const snap = (addendum.parent_snapshot ?? {}) as AddendumParentSnapshot;
  const parentTitle = snap.contractTitle || PARENT_TYPE_TITLE[addendum.parent_type as AddendumParentType] || "agreement";
  await sendEmail({
    to: addendum.tenant_email,
    subject: `Your Addendum to the ${parentTitle} is ready to sign`,
    html: `
      <p>Hi ${addendum.tenant_name_hint ?? "there"},</p>
      <p>All Abode Brokerage and Valuation OPC has prepared an Addendum amending your ${parentTitle}${snap.referenceCode ? ` (${snap.referenceCode})` : ""} for review and electronic signature.</p>
      <p><a href="${link}">Review and sign your addendum</a></p>
      <p>You'll need a valid ID on hand to complete the form.</p>
    `,
  });

  await logAudit(supabase, { action: "addendum.sent", entityType: "addendum", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/addendum/${id}`);
}

/**
 * Issues (or re-issues) the landlord's own signing link once the tenant has
 * signed. Each send extends the link's validity window.
 */
export async function sendAddendumLandlordLink(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: addendum, error } = await supabase
    .from("addenda")
    .select("status,landlord_access_token,landlord_email,landlord_name_hint,tenant_details,landlord_signed_via,parent_snapshot,parent_type")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!addendum) throw new Error("Addendum not found.");
  if (addendum.status !== "tenant_signed") {
    throw new Error("The landlord link becomes available once the tenant has signed.");
  }
  if (addendum.landlord_signed_via) {
    throw new Error("The landlord signature is already in place.");
  }

  const landlordEmail = s(fd, "landlord_email") ?? addendum.landlord_email;
  if (!landlordEmail) throw new Error("Enter the landlord's email address first.");

  const token = addendum.landlord_access_token ?? randomUUID();
  const expiresAt = new Date(Date.now() + LANDLORD_LINK_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error: upErr } = await supabase.from("addenda").update({
    landlord_access_token: token,
    landlord_token_expires_at: expiresAt,
    landlord_email: landlordEmail,
  }).eq("id", id);
  if (upErr) throw new Error(upErr.message);

  const td = (addendum.tenant_details ?? {}) as { name?: string };
  const snap = (addendum.parent_snapshot ?? {}) as AddendumParentSnapshot;
  const parentTitle = snap.contractTitle || PARENT_TYPE_TITLE[addendum.parent_type as AddendumParentType] || "agreement";
  const link = `${getPublicSiteUrl()}/sign/addendum/landlord/${token}`;
  await sendEmail({
    to: landlordEmail,
    subject: "Addendum ready for your signature",
    html: `
      <p>Hi ${addendum.landlord_name_hint ?? "there"},</p>
      <p>${td.name ?? "Your tenant"} has signed the Addendum to the ${parentTitle} prepared by All Abode Brokerage and Valuation OPC. It's now ready for your signature.</p>
      <p><a href="${link}">Review and sign the addendum</a></p>
      <p>You'll need a valid ID on hand to complete the signing. This link is valid for ${LANDLORD_LINK_VALIDITY_DAYS} days.</p>
    `,
  });

  await logAudit(supabase, { action: "addendum.landlord_link_sent", entityType: "addendum", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/addendum/${id}`);
}

// ============================================================
// Staff edits (amendment content locks once the tenant signs)
// ============================================================

export async function updateAddendumTerms(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: addendum } = await supabase
    .from("addenda")
    .select("status,tenant_details,parent_type,parent_source")
    .eq("id", id)
    .maybeSingle();
  if (!addendum) throw new Error("Addendum not found.");
  if (addendum.status !== "draft" && addendum.status !== "sent") {
    throw new Error("The amendment terms are locked once the tenant has signed against them.");
  }

  // An uploaded parent's identity was AI-read, so staff must be able to correct
  // it before the tenant signs. A system parent's snapshot came from a real row
  // and is never re-editable.
  const parentType = (s(fd, "parent_type") as AddendumParentType | null) ?? (addendum.parent_type as AddendumParentType);
  const parentSnapshot =
    addendum.parent_source === "uploaded"
      ? {
          parent_type: PARENT_TYPE_TITLE[parentType] ? parentType : addendum.parent_type,
          parent_snapshot: parseParentSnapshot(fd, parentType, "uploaded"),
        }
      : {};

  const { landlord_email, landlord_name_hint, ...terms } = parseTerms(fd);
  const { error } = await supabase.from("addenda").update({
    landlord_email, landlord_name_hint, ...terms, ...parentSnapshot,
    tenant_name_hint: s(fd, "tenant_name_hint"),
    tenant_details: tenantDetailsFromForm(fd, s(fd, "tenant_email"), (addendum.tenant_details ?? {}) as Record<string, unknown>),
  }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "addendum.terms_updated", entityType: "addendum", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/addendum/${id}`);
}

// ============================================================
// Landlord countersign fallback (designated signatory) -> completion
// ============================================================

export async function countersignAddendum(id: string, signatureDataUrl: string, typedName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: staffRow } = await supabase.from("users").select("is_signatory").eq("id", user.id).maybeSingle();
  if (!staffRow?.is_signatory) {
    throw new Error("Only a designated signatory account can countersign this addendum.");
  }

  const { data: addendum } = await supabase
    .from("addenda")
    .select("status,landlord_signed_via,landlord_signature_data")
    .eq("id", id)
    .maybeSingle();
  if (!addendum) throw new Error("Addendum not found.");
  if (addendum.status !== "tenant_signed") {
    throw new Error("This addendum is not ready for the landlord signature yet.");
  }
  if (addendum.landlord_signed_via === "remote" || addendum.landlord_signature_data) {
    throw new Error("The landlord has already signed via their signing link.");
  }

  const ip = await clientIp();
  const { error } = await supabase.from("addenda").update({
    landlord_typed_name: typedName.trim(),
    landlord_signature_data: signatureDataUrl,
    landlord_signed_at: new Date().toISOString(),
    landlord_signed_ip: ip,
    landlord_signed_via: "countersign",
    signatory_user_id: user.id,
  }).eq("id", id).is("landlord_signature_data", null);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "addendum.countersigned", entityType: "addendum", entityId: id, actorId: user.id });

  await completeAddendum(id, supabase);
  revalidatePath(`/admin/contracts/addendum/${id}`);
}

/**
 * Retry button for the case where the landlord's remote signature landed
 * but the completion pipeline failed afterwards (the signature is durable;
 * the status stays 'tenant_signed' until this succeeds).
 */
export async function finalizeAddendum(id: string) {
  const supabase = await createClient();

  const { data: addendum } = await supabase
    .from("addenda")
    .select("status,landlord_signature_data")
    .eq("id", id)
    .maybeSingle();
  if (!addendum) throw new Error("Addendum not found.");
  if (addendum.status === "completed") return;
  if (addendum.status !== "tenant_signed" || !addendum.landlord_signature_data) {
    throw new Error("Both signatures are required before the addendum can be finalized.");
  }

  await completeAddendum(id, supabase);
  revalidatePath(`/admin/contracts/addendum/${id}`);
}

// ============================================================
// Void / delete (same semantics as the other agreement flows)
// ============================================================

export async function voidAddendum(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: addendum } = await supabase.from("addenda").select("status").eq("id", id).maybeSingle();
  if (!addendum) throw new Error("Addendum not found.");
  if (addendum.status === "voided") return;

  const { error } = await supabase.from("addenda").update({ status: "voided" }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "addendum.voided", entityType: "addendum", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/addendum/${id}`);
  revalidatePath("/admin/contracts");
}

export async function deleteAddendum(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: addendum } = await supabase
    .from("addenda")
    .select("status,pdf_path,tenant_id_document_path,landlord_id_document_path,parent_source,parent_document_path")
    .eq("id", id)
    .maybeSingle();
  if (!addendum) throw new Error("Addendum not found.");
  if (addendum.status === "completed") {
    throw new Error("A fully executed addendum can't be deleted — void it instead to preserve the signed record.");
  }

  const paths = [
    addendum.pdf_path,
    addendum.tenant_id_document_path,
    addendum.landlord_id_document_path,
    // The uploaded original sits outside the addendum/{id}/ prefix (it is
    // staged before the row exists), so it has to be named explicitly here.
    addendum.parent_source === "uploaded" ? addendum.parent_document_path : null,
  ].filter((p): p is string => !!p);
  if (paths.length) {
    await supabase.storage.from(AGREEMENTS_BUCKET).remove(paths);
  }

  const { error } = await supabase.from("addenda").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "addendum.deleted", entityType: "addendum", entityId: id, actorId: user?.id });
  revalidatePath("/admin/contracts");
  redirect("/admin/contracts");
}

export async function getAddendumPdfSignedUrl(id: string) {
  const supabase = await createClient();
  const { data: a } = await supabase.from("addenda").select("pdf_path,status").eq("id", id).maybeSingle();
  if (!a?.pdf_path || a.status !== "completed") return null;
  return signedUrl(supabase, AGREEMENTS_BUCKET, a.pdf_path, 120);
}
