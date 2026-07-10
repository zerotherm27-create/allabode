"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSiteUrl, getAuthRedirectUrl } from "@/lib/url";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { signedUrl, AGREEMENTS_BUCKET, DOCUMENTS_BUCKET } from "@/lib/storage";
import { renderAgreementPdf, type AgreementPdfInput } from "@/lib/pdf/agreement";
import { ownerIdTypeLabel } from "@/lib/pm/agreement-labels";
import { COMPANY_SIGNATORY, loadCompanySignatoryIdImage } from "@/lib/pm/company-signatory";

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

function referenceCode(id: string) {
  return `AGMT-${id.slice(0, 8).toUpperCase()}`;
}

function manilaTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

// ============================================================
// Create + send
// ============================================================

export async function createAgreement(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const ownerEmail = s(fd, "owner_email");
  const ownerNameHint = s(fd, "owner_name_hint");
  if (!ownerEmail) throw new Error("Owner email is required.");

  const { data, error } = await supabase
    .from("agreements")
    .insert({ owner_email: ownerEmail, owner_name_hint: ownerNameHint, created_by: user?.id ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const id = data.id as string;
  await logAudit(supabase, { action: "agreement.created", entityType: "agreement", entityId: id, actorId: user?.id });
  await sendAgreementLink(id);

  revalidatePath("/admin/contracts");
  redirect(`/admin/contracts/${id}`);
}

export async function sendAgreementLink(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement, error } = await supabase
    .from("agreements")
    .select("access_token,owner_email,owner_name_hint,status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!agreement) throw new Error("Agreement not found.");

  const link = `${getPublicSiteUrl()}/sign/agreement/${agreement.access_token}`;

  await supabase.from("agreements").update({ status: "sent" }).eq("id", id).eq("status", "draft");

  await sendEmail({
    to: agreement.owner_email,
    subject: "Your All Abode Property Management Agreement is ready to sign",
    html: `
      <p>Hi ${agreement.owner_name_hint ?? "there"},</p>
      <p>All Abode Property Solutions has prepared a Property Management Agreement for your review and electronic signature.</p>
      <p><a href="${link}">Review and sign your agreement</a></p>
      <p>You'll need a valid ID (passport preferred; School ID allowed for students 18+) on hand to complete the form.</p>
    `,
  });

  await logAudit(supabase, { action: "agreement.sent", entityType: "agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/${id}`);
}

// ============================================================
// Staff-only Annex B pre-fill (optional, never blocks owner flow)
// ============================================================

function annexBRow(fd: FormData) {
  function group(prefix: string, fields: string[]) {
    const out: Record<string, Record<string, string>> = {};
    const ids = (s(fd, `${prefix}_ids`) ?? "").split(",").filter(Boolean);
    for (const id of ids) {
      const entry: Record<string, string> = {};
      for (const f of fields) {
        const v = s(fd, `${prefix}_${id}_${f}`);
        if (v) entry[f] = v;
      }
      if (Object.keys(entry).length) out[id] = entry;
    }
    return out;
  }

  const fixtures = fd.getAll("fixtures").map(String);
  const conditionReport: Record<string, string> = {};
  for (const k of ["walls", "flooring", "ceiling", "kitchen", "bathroom", "bedroom", "living_room", "balcony", "other_remarks"]) {
    const v = s(fd, `condition_${k}`);
    if (v) conditionReport[k] = v;
  }

  return {
    keys: group("key", ["qty", "remarks"]),
    furniture: group("furniture", ["qty", "condition"]),
    appliances: group("appliance", ["brand", "condition"]),
    fixtures,
    conditionReport,
  };
}

export async function updateAnnexB(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase.from("agreements").select("status").eq("id", id).maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "completed") throw new Error("This agreement is already fully signed and locked.");

  const { error } = await supabase.from("agreements").update({ annex_b: annexBRow(fd) }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "agreement.annex_b_updated", entityType: "agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/${id}`);
}

// Payout is always monthly (fixed in the contract text); the owner never
// picks a schedule. Only the specific day of the month is staff-set, and
// it lives in its own column rather than inside annex_c — the owner's
// save_agreement_draft overwrites annex_c wholesale on every "Next" click,
// which would silently wipe this if it were stored there instead.
export async function updatePayoutDay(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase.from("agreements").select("status").eq("id", id).maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "completed") throw new Error("This agreement is already fully signed and locked.");

  const raw = s(fd, "payout_day");
  const day = raw ? Number(raw) : null;
  if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) {
    throw new Error("Payout day must be between 1 and 31.");
  }

  const { error } = await supabase.from("agreements").update({ payout_day: day }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "agreement.payout_day_updated", entityType: "agreement", entityId: id, actorId: user?.id, metadata: { day } });
  revalidatePath(`/admin/contracts/${id}`);
}

// Void invalidates the agreement (blocks the signing link / countersigning)
// but keeps the record and any signed PDF for history. Allowed at any
// status, including completed — e.g. a fully executed contract that later
// needs to be nullified, without destroying the executed record.
export async function voidAgreement(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase.from("agreements").select("status").eq("id", id).maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "voided") return;

  const { error } = await supabase.from("agreements").update({ status: "voided" }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "agreement.voided", entityType: "agreement", entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/${id}`);
  revalidatePath("/admin/contracts");
}

// Delete permanently removes the agreement and its storage files. Blocked
// once completed — a fully executed contract should be voided instead so
// the signed record is preserved, not destroyed.
export async function deleteAgreement(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: agreement } = await supabase
    .from("agreements")
    .select("status,pdf_path,owner_id_document_path")
    .eq("id", id)
    .maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status === "completed") {
    throw new Error("A fully executed agreement can't be deleted — void it instead to preserve the signed record.");
  }

  const paths = [agreement.pdf_path, agreement.owner_id_document_path].filter((p): p is string => !!p);
  if (paths.length) {
    await supabase.storage.from(AGREEMENTS_BUCKET).remove(paths);
  }

  const { error } = await supabase.from("agreements").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "agreement.deleted", entityType: "agreement", entityId: id, actorId: user?.id });
  revalidatePath("/admin/contracts");
  redirect("/admin/contracts");
}

export async function toggleSpaAuthorizationReceived(ownerId: string, received: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("owners").update({ spa_authorization_received: received }).eq("id", ownerId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/contracts");
}

// ============================================================
// Countersign (designated signatory only) -> triggers completion
// ============================================================

export async function countersignAgreement(id: string, signatureDataUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: staffRow } = await supabase.from("users").select("is_signatory").eq("id", user.id).maybeSingle();
  if (!staffRow?.is_signatory) {
    throw new Error("Only a designated signatory account can countersign this agreement.");
  }

  const { data: agreement } = await supabase.from("agreements").select("status").eq("id", id).maybeSingle();
  if (!agreement) throw new Error("Agreement not found.");
  if (agreement.status !== "owner_signed") {
    throw new Error("This agreement is not ready to be countersigned yet.");
  }

  const ip = await clientIp();
  const { error } = await supabase.from("agreements").update({
    manager_signature_data: signatureDataUrl,
    manager_signed_at: new Date().toISOString(),
    manager_signed_ip: ip,
    signatory_user_id: user.id,
  }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "agreement.countersigned", entityType: "agreement", entityId: id, actorId: user.id });

  await completeAgreement(id);
  revalidatePath(`/admin/contracts/${id}`);
}

// ============================================================
// Completion: render PDF, provision owner account, attach document
// ============================================================

async function completeAgreement(id: string) {
  const supabase = await createClient();
  const { data: a, error } = await supabase.from("agreements").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!a) throw new Error("Agreement not found.");

  let ownerIdImageDataUri: string | null = null;
  let ownerIdFileBuffer: Buffer | null = null;
  let ownerIdMime = "image/jpeg";
  if (a.owner_id_document_path) {
    const { data: idFile } = await supabase.storage.from(AGREEMENTS_BUCKET).download(a.owner_id_document_path);
    if (idFile) {
      ownerIdFileBuffer = Buffer.from(await idFile.arrayBuffer());
      const ext = a.owner_id_document_path.split(".").pop()?.toLowerCase();
      ownerIdMime = ext === "png" ? "image/png" : "image/jpeg";
      ownerIdImageDataUri = `data:${ownerIdMime};base64,${ownerIdFileBuffer.toString("base64")}`;
    }
  }

  const { data: signatoryRow } = await supabase.from("users").select("email").eq("id", a.signatory_user_id ?? "").maybeSingle();
  const managerIdImage = await loadCompanySignatoryIdImage(supabase);

  const pdfInput: AgreementPdfInput = {
    id: a.id,
    referenceCode: referenceCode(a.id),
    ownerDetails: a.owner_details ?? {},
    propertyDetails: a.property_details ?? {},
    serviceSelections: a.service_selections ?? {},
    annexC: a.annex_c ?? {},
    annexB: a.annex_b && Object.keys(a.annex_b).length ? a.annex_b : null,
    payoutDay: a.payout_day ?? null,
    effectiveDate: a.effective_date,
    ownerIdTypeLabel: ownerIdTypeLabel(a.owner_id_type),
    ownerIdNumber: a.owner_id_number ?? "",
    ownerIdIssuedDate: a.owner_id_issued_date,
    ownerIdImageDataUri,
    managerIdTypeLabel: COMPANY_SIGNATORY.idTypeLabel,
    managerIdNumber: COMPANY_SIGNATORY.idNumber,
    managerIdIssuedDate: COMPANY_SIGNATORY.idIssuedDate,
    managerIdImageDataUri: managerIdImage.dataUri,
    ownerTypedName: a.owner_typed_name ?? "",
    ownerSignatureDataUri: a.owner_signature_data ?? "",
    ownerSignedAtManila: manilaTime(a.owner_signed_at),
    ownerSignedIp: a.owner_signed_ip ?? "unknown",
    managerSignatureDataUri: a.manager_signature_data ?? "",
    managerSignedAtManila: manilaTime(a.manager_signed_at),
    managerSignedIp: a.manager_signed_ip ?? "unknown",
    managerSignerEmail: signatoryRow?.email ?? "",
  };

  const pdfBuffer = await renderAgreementPdf(pdfInput);
  const pdfPath = `${a.id}/agreement-${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage.from(AGREEMENTS_BUCKET).upload(pdfPath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) throw new Error(`PDF upload failed: ${upErr.message}`);

  // The generic /api/portal/documents/[id] download route only signs URLs
  // against the `documents` bucket (the `agreements` bucket's RLS is
  // staff-only, so an owner session can never sign a URL for a path there).
  // Copy the files a `documents` row will point to into `documents` too,
  // rather than reusing the agreements-bucket path.
  const documentsPdfPath = `agreement/${a.id}/agreement-signed.pdf`;
  await supabase.storage.from(DOCUMENTS_BUCKET).upload(documentsPdfPath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  let documentsIdPath: string | null = null;
  if (ownerIdFileBuffer) {
    const ext = ownerIdMime === "image/png" ? "png" : "jpg";
    documentsIdPath = `agreement/${a.id}/owner-id.${ext}`;
    await supabase.storage.from(DOCUMENTS_BUCKET).upload(documentsIdPath, ownerIdFileBuffer, {
      contentType: ownerIdMime,
      upsert: true,
    });
  }

  // Upsert owner by email
  const od = (a.owner_details ?? {}) as { name?: string; phone?: string; address?: string; contact?: string };
  const ac = (a.annex_c ?? {}) as { bankName?: string; bankAccountName?: string; bankAccountNo?: string };
  const { data: existingOwner } = await supabase.from("owners").select("id,auth_user_id").eq("email", a.owner_email).maybeSingle();

  let ownerId: string;
  if (existingOwner) {
    ownerId = existingOwner.id;
    await supabase.from("owners").update({
      name: od.name ?? a.owner_name_hint ?? "Owner",
      phone: od.contact ?? od.phone ?? null,
      address: od.address ?? null,
      bank_name: ac.bankName ?? null,
      bank_account_name: ac.bankAccountName ?? null,
      bank_account_no: ac.bankAccountNo ?? null,
    }).eq("id", ownerId);
  } else {
    const { data: newOwner, error: ownerErr } = await supabase.from("owners").insert({
      name: od.name ?? a.owner_name_hint ?? "Owner",
      email: a.owner_email,
      phone: od.contact ?? od.phone ?? null,
      address: od.address ?? null,
      bank_name: ac.bankName ?? null,
      bank_account_name: ac.bankAccountName ?? null,
      bank_account_no: ac.bankAccountNo ?? null,
    }).select("id,auth_user_id").single();
    if (ownerErr) throw new Error(ownerErr.message);
    ownerId = newOwner.id;
  }

  // Admin reference info handoff (intake_profile) -> owners.notes, never rendered into the PDF
  const intake = (a.intake_profile ?? {}) as Record<string, string>;
  if (Object.keys(intake).length) {
    const lines = Object.entries(intake)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
      .join("\n");
    if (lines) {
      const { data: ownerNotes } = await supabase.from("owners").select("notes").eq("id", ownerId).maybeSingle();
      const existingNotes = ownerNotes?.notes ? `${ownerNotes.notes}\n\n` : "";
      await supabase.from("owners").update({
        notes: `${existingNotes}From signed agreement, not part of the contract (${new Date().toLocaleDateString("en-PH")}):\n${lines}`,
      }).eq("id", ownerId);
    }
  }

  // Provision portal account if owner has none yet
  let hasAuthAccount = !!existingOwner?.auth_user_id;
  if (!hasAuthAccount) {
    try {
      const admin = createAdminClient();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: a.owner_email,
        email_confirm: true,
      });
      if (!createErr && created.user) {
        await supabase.from("owners").update({ auth_user_id: created.user.id }).eq("id", ownerId);
        hasAuthAccount = true;

        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "recovery",
          email: a.owner_email,
          options: { redirectTo: getAuthRedirectUrl("/auth/set-password") },
        });
        if (linkData?.properties?.action_link) {
          await sendEmail({
            to: a.owner_email,
            subject: "Your All Abode owner portal is ready",
            html: `
              <p>Hi ${od.name ?? "there"},</p>
              <p>Your Property Management Agreement is fully signed. We've created your owner portal account so you can view your signed agreement and manage your property online.</p>
              <p><a href="${linkData.properties.action_link}">Set your password and log in</a></p>
            `,
          });
        }
        await logAudit(supabase, { action: "owner.portal_account_provisioned", entityType: "owner", entityId: ownerId });
      }
    } catch (err) {
      console.warn("[agreement] owner account provisioning failed:", err);
    }
  }

  if (hasAuthAccount && existingOwner?.auth_user_id) {
    await sendEmail({
      to: a.owner_email,
      subject: "Your Property Management Agreement is fully signed",
      html: `<p>Hi ${od.name ?? "there"},</p><p>Your Property Management Agreement has been fully executed. You can view it in your owner dashboard.</p>`,
    });
  }

  // Attach signed PDF as a staff-visible-to-owner document
  await supabase.from("documents").insert({
    entity_type: "owner",
    entity_id: ownerId,
    document_type: "agreement",
    title: "Property Management Agreement (signed)",
    file_path: documentsPdfPath,
    file_name: "property-management-agreement.pdf",
    file_mime_type: "application/pdf",
    is_signed: true,
    signed_at: new Date().toISOString(),
    is_immutable: true,
    visibility: "owner",
  });

  // Attach uploaded government ID as a staff-only document
  if (documentsIdPath) {
    await supabase.from("documents").insert({
      entity_type: "owner",
      entity_id: ownerId,
      document_type: "id",
      title: `Government ID (${ownerIdTypeLabel(a.owner_id_type)})`,
      file_path: documentsIdPath,
      file_name: documentsIdPath.split("/").pop() ?? "id",
      is_signed: false,
      is_immutable: true,
      visibility: "staff",
    });
  }

  await supabase.from("agreements").update({
    status: "completed",
    pdf_path: pdfPath,
    linked_owner_id: ownerId,
  }).eq("id", id);

  await logAudit(supabase, { action: "agreement.completed", entityType: "agreement", entityId: id, metadata: { ownerId } });

  // Notify staff who created it
  if (a.created_by) {
    await createNotification(supabase, {
      recipientUserId: a.created_by,
      type: "agreement_completed",
      title: "Agreement fully signed",
      body: `The Property Management Agreement for ${od.name ?? a.owner_email} has been fully executed.`,
      link: `/admin/contracts/${id}`,
      entityType: "agreement",
      entityId: id,
    });
  }

  revalidatePath(`/admin/contracts/${id}`);
  revalidatePath("/admin/contracts");
}

export async function getAgreementPdfSignedUrl(id: string) {
  const supabase = await createClient();
  const { data: a } = await supabase.from("agreements").select("pdf_path,status").eq("id", id).maybeSingle();
  if (!a?.pdf_path || a.status !== "completed") return null;
  return signedUrl(supabase, AGREEMENTS_BUCKET, a.pdf_path, 120);
}
