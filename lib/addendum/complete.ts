import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthRedirectUrl } from "@/lib/url";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { AGREEMENTS_BUCKET, DOCUMENTS_BUCKET } from "@/lib/storage";
import { renderAddendumPdf, type AddendumPdfInput } from "@/lib/pdf/addendum";
import { ownerIdTypeLabel } from "@/lib/pm/agreement-labels";
import { normalizeOccupantIdUploads } from "@/lib/signing/form-helpers";
import type {
  AddendumLandlordDetails, AddendumTenantDetails, AddendumParentType,
  AddendumParentSnapshot, AddendumFeeItem, AddendumScheduleRow,
  AddendumBankDetails, AddendumPartyChange, AddendumAmendedClause,
} from "@/lib/pm/addendum-clauses";
import { DEFAULT_ADDENDUM_BANK_DETAILS, PARENT_TYPE_TITLE } from "@/lib/pm/addendum-clauses";

export function addendumReferenceCode(id: string) {
  return `ADD-${id.slice(0, 8).toUpperCase()}`;
}

function manilaTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

async function downloadAsDataUri(
  supabase: SupabaseClient,
  storagePath: string | null
): Promise<{ dataUri: string | null; buffer: Buffer | null; mime: string }> {
  if (!storagePath) return { dataUri: null, buffer: null, mime: "image/jpeg" };
  // The staff countersign path passes an RLS-scoped client, which cannot
  // always read the private `agreements` bucket — without this fallback the
  // download returns null and the ID silently prints as "ID image
  // unavailable" on an otherwise-valid signed PDF.
  let { data: file } = await supabase.storage.from(AGREEMENTS_BUCKET).download(storagePath);
  if (!file) {
    ({ data: file } = await createAdminClient().storage.from(AGREEMENTS_BUCKET).download(storagePath));
  }
  if (!file) {
    console.warn("[addendum] ID image download failed for", storagePath);
    return { dataUri: null, buffer: null, mime: "image/jpeg" };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = storagePath.split(".").pop()?.toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "pdf" ? "application/pdf" : "image/jpeg";
  // @react-pdf can only embed raster images inline; a PDF-format ID (only
  // possible on legacy rows — new uploads are restricted to JPG/PNG) is
  // attached as a document row but not rendered into the IDs page.
  const dataUri = mime === "application/pdf" ? null : `data:${mime};base64,${buffer.toString("base64")}`;
  return { dataUri, buffer, mime };
}

/**
 * Completion pipeline for an addendum whose landlord signature has just
 * landed (remote link or staff countersign): render + store the PDF, upsert
 * the tenant, provision their portal login, attach portal documents, and mark
 * completed. No lease or parent-contract record is mutated — an addendum
 * documents the amendment; staff apply the operational change (new lease
 * dates, new rent) to the affected records themselves.
 *
 * Takes the Supabase client as a parameter because the two callers run under
 * different trust models: the staff countersign action passes the normal
 * RLS-scoped staff client, while the remote landlord path is anonymous
 * (token-authenticated by the RPC) and passes the service-role admin client.
 */
export async function completeAddendum(id: string, supabase: SupabaseClient): Promise<void> {
  const { data: a, error } = await supabase.from("addenda").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!a) throw new Error("Addendum not found.");
  if (a.status === "completed") return; // idempotent — retry-safe
  if (!a.landlord_signature_data || !a.tenant_signature_data) {
    throw new Error("Both signatures are required before the addendum can be finalized.");
  }

  const hd = (a.landlord_details ?? {}) as AddendumLandlordDetails;
  const td = (a.tenant_details ?? {}) as AddendumTenantDetails;

  // 1-2. ID images
  const tenantIdFile = await downloadAsDataUri(supabase, a.tenant_id_document_path);
  const landlordIdFile = await downloadAsDataUri(supabase, a.landlord_id_document_path);

  // IDs for people added or substituted by this addendum ride inside
  // tenant_details, same as the tenancy and parking flows' occupant IDs.
  const partyIdUploads = normalizeOccupantIdUploads(
    (td as { additionalOccupantIds?: unknown }).additionalOccupantIds
  );
  const additionalPartyIds = await Promise.all(
    partyIdUploads.map(async (u) => ({
      name: u.occupantName,
      idImageDataUri: (await downloadAsDataUri(supabase, u.path)).dataUri,
    }))
  );

  // 3. Render the PDF
  const pdfInput: AddendumPdfInput = {
    id: a.id,
    referenceCode: addendumReferenceCode(a.id),
    agreementDate: a.agreement_date,
    landlordDetails: hd,
    tenantDetails: td,
    terms: {
      parentType: a.parent_type as AddendumParentType,
      parentSnapshot: (a.parent_snapshot ?? {}) as AddendumParentSnapshot,
      effectiveDate: a.effective_date,
      newStartDate: a.new_start_date,
      newEndDate: a.new_end_date,
      feeItems: (a.fee_items ?? []) as AddendumFeeItem[],
      partyChanges: (a.party_changes ?? []) as AddendumPartyChange[],
      amendedClauses: (a.amended_clauses ?? []) as AddendumAmendedClause[],
    },
    feeItems: (a.fee_items ?? []) as AddendumFeeItem[],
    paymentSchedule: (a.payment_schedule ?? []) as AddendumScheduleRow[],
    bankDetails: { ...DEFAULT_ADDENDUM_BANK_DETAILS, ...((a.bank_details ?? {}) as Partial<AddendumBankDetails>) },
    tenantIdTypeLabel: ownerIdTypeLabel(a.tenant_id_type),
    tenantIdNumber: a.tenant_id_number ?? "",
    tenantIdIssuedDate: a.tenant_id_issued_date,
    tenantIdImageDataUri: tenantIdFile.dataUri,
    additionalPartyIds,
    landlordIdTypeLabel: a.landlord_id_type ? ownerIdTypeLabel(a.landlord_id_type) : null,
    landlordIdNumber: a.landlord_id_number,
    landlordIdIssuedDate: a.landlord_id_issued_date,
    landlordIdImageDataUri: landlordIdFile.dataUri,
    tenantTypedName: a.tenant_typed_name ?? "",
    tenantSignatureDataUri: a.tenant_signature_data ?? "",
    tenantSignedAtManila: manilaTime(a.tenant_signed_at),
    tenantSignedIp: a.tenant_signed_ip ?? "unknown",
    landlordTypedName: a.landlord_typed_name ?? "",
    landlordSignatureDataUri: a.landlord_signature_data ?? "",
    landlordSignedAtManila: manilaTime(a.landlord_signed_at),
    landlordSignedIp: a.landlord_signed_ip ?? "unknown",
    landlordSignedVia: (a.landlord_signed_via ?? "countersign") as "remote" | "countersign",
    countersignerEmail: null,
  };
  if (a.signatory_user_id) {
    const { data: signatoryRow } = await supabase.from("users").select("email").eq("id", a.signatory_user_id).maybeSingle();
    pdfInput.countersignerEmail = signatoryRow?.email ?? null;
  }
  const pdfBuffer = await renderAddendumPdf(pdfInput);

  // 4. Store in the agreements bucket (staff-only)
  const pdfPath = `addendum/${a.id}/addendum-${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage.from(AGREEMENTS_BUCKET).upload(pdfPath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) throw new Error(`PDF upload failed: ${upErr.message}`);

  // 5. Cross-copy into the documents bucket — the portal download route only
  // signs URLs against `documents` (the agreements bucket is staff-only).
  const documentsPdfPath = `addendum/${a.id}/addendum-signed.pdf`;
  await supabase.storage.from(DOCUMENTS_BUCKET).upload(documentsPdfPath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  // An off-system original lives only as the file staff uploaded, so it has to
  // travel with the addendum — otherwise the tenant's portal shows an amendment
  // to a contract they can't open.
  let documentsParentPath: string | null = null;
  const parentDoc = await downloadAsDataUri(
    supabase,
    a.parent_source === "uploaded" ? a.parent_document_path : null,
  );
  if (parentDoc.buffer) {
    const ext = parentDoc.mime === "image/png" ? "png" : parentDoc.mime?.startsWith("image/") ? "jpg" : "pdf";
    documentsParentPath = `addendum/${a.id}/original-contract.${ext}`;
    await supabase.storage.from(DOCUMENTS_BUCKET).upload(documentsParentPath, parentDoc.buffer, {
      contentType: parentDoc.mime || "application/pdf",
      upsert: true,
    });
  }

  let documentsIdPath: string | null = null;
  if (tenantIdFile.buffer) {
    const ext = tenantIdFile.mime === "image/png" ? "png" : tenantIdFile.mime === "application/pdf" ? "pdf" : "jpg";
    documentsIdPath = `addendum/${a.id}/tenant-id.${ext}`;
    await supabase.storage.from(DOCUMENTS_BUCKET).upload(documentsIdPath, tenantIdFile.buffer, {
      contentType: tenantIdFile.mime,
      upsert: true,
    });
  }

  // 6. Upsert the tenant by email (collision -> update in place, keep auth link)
  const { data: existingTenant } = await supabase
    .from("tenants").select("id,auth_user_id").ilike("email", a.tenant_email).maybeSingle();

  let tenantRecordId: string;
  if (existingTenant) {
    tenantRecordId = existingTenant.id;
    await supabase.from("tenants").update({
      name: td.name ?? a.tenant_name_hint ?? "Tenant",
      phone: td.contact ?? null,
    }).eq("id", tenantRecordId);
  } else {
    const { data: newTenant, error: tenantErr } = await supabase.from("tenants").insert({
      name: td.name ?? a.tenant_name_hint ?? "Tenant",
      email: a.tenant_email,
      phone: td.contact ?? null,
    }).select("id,auth_user_id").single();
    if (tenantErr) throw new Error(tenantErr.message);
    tenantRecordId = newTenant.id;
  }

  const parentTitle =
    (a.parent_snapshot as AddendumParentSnapshot | null)?.contractTitle ??
    PARENT_TYPE_TITLE[a.parent_type as AddendumParentType] ??
    "Agreement";

  // 7. Provision the tenant portal account if they don't have one
  const hasAuthAccount = !!existingTenant?.auth_user_id;
  if (!hasAuthAccount) {
    try {
      const admin = createAdminClient();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: a.tenant_email,
        email_confirm: true,
      });
      if (!createErr && created.user) {
        await supabase.from("tenants").update({ auth_user_id: created.user.id }).eq("id", tenantRecordId);

        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "recovery",
          email: a.tenant_email,
          options: { redirectTo: getAuthRedirectUrl("/auth/set-password") },
        });
        if (linkData?.properties?.action_link) {
          await sendEmail({
            to: a.tenant_email,
            subject: "Your All Abode tenant portal is ready",
            html: `
              <p>Hi ${td.name ?? "there"},</p>
              <p>Your Addendum to the ${parentTitle} is fully signed. We've created your tenant portal account so you can view your signed documents online.</p>
              <p><a href="${linkData.properties.action_link}">Set your password and log in</a></p>
            `,
          });
        }
        await logAudit(supabase, { action: "tenant.portal_account_provisioned", entityType: "tenant", entityId: tenantRecordId });
      }
    } catch (err) {
      console.warn("[addendum] tenant account provisioning failed:", err);
    }
  } else {
    await sendEmail({
      to: a.tenant_email,
      subject: `Your Addendum to the ${parentTitle} is fully signed`,
      html: `<p>Hi ${td.name ?? "there"},</p><p>Your Addendum to the ${parentTitle} has been fully executed. You can view it in your tenant portal.</p>`,
    });
  }

  // 8. Portal document rows
  await supabase.from("documents").insert({
    entity_type: "tenant",
    entity_id: tenantRecordId,
    document_type: "addendum",
    title: `Addendum to ${parentTitle} (signed)`,
    file_path: documentsPdfPath,
    file_name: "addendum.pdf",
    file_mime_type: "application/pdf",
    is_signed: true,
    signed_at: new Date().toISOString(),
    is_immutable: true,
    visibility: "tenant",
  });
  if (documentsParentPath) {
    await supabase.from("documents").insert({
      entity_type: "tenant",
      entity_id: tenantRecordId,
      document_type: "source_contract",
      title: `${parentTitle} (original, as amended)`,
      file_path: documentsParentPath,
      file_name: a.parent_document_name ?? documentsParentPath.split("/").pop() ?? "original-contract.pdf",
      file_mime_type: parentDoc.mime || "application/pdf",
      is_signed: true,
      is_immutable: true,
      visibility: "tenant",
    });
  }
  if (documentsIdPath) {
    await supabase.from("documents").insert({
      entity_type: "tenant",
      entity_id: tenantRecordId,
      document_type: "id",
      title: `Government ID (${ownerIdTypeLabel(a.tenant_id_type)})`,
      file_path: documentsIdPath,
      file_name: documentsIdPath.split("/").pop() ?? "id",
      is_signed: false,
      is_immutable: true,
      visibility: "staff",
    });
  }

  // 9. Flip to completed
  const { error: doneErr } = await supabase.from("addenda").update({
    status: "completed",
    pdf_path: pdfPath,
    linked_tenant_id: tenantRecordId,
  }).eq("id", id);
  if (doneErr) throw new Error(doneErr.message);

  // 10. Audit + notification + landlord copy (remote-signed only)
  await logAudit(supabase, { action: "addendum.completed", entityType: "addendum", entityId: id, metadata: { tenantId: tenantRecordId } });

  if (a.landlord_signed_via !== "countersign" && a.landlord_email) {
    await sendEmail({
      to: a.landlord_email,
      subject: "Addendum fully executed",
      html: `<p>Hi ${hd.name ?? "there"},</p><p>The Addendum to the ${parentTitle} with ${td.name ?? a.tenant_email} has been fully executed. You can download your copy from the signing link we sent you.</p>`,
    });
  }
  if (a.created_by) {
    await createNotification(supabase, {
      recipientUserId: a.created_by,
      type: "agreement_completed",
      title: "Addendum fully signed",
      body: `The Addendum to the ${parentTitle} for ${td.name ?? a.tenant_email} has been fully executed.`,
      link: `/admin/contracts/addendum/${id}`,
      entityType: "addendum",
      entityId: id,
    });
  }

  revalidatePath(`/admin/contracts/addendum/${id}`);
  revalidatePath("/admin/contracts");
}
