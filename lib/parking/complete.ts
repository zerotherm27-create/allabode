import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthRedirectUrl } from "@/lib/url";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { AGREEMENTS_BUCKET, DOCUMENTS_BUCKET } from "@/lib/storage";
import { renderParkingPdf, type ParkingPdfInput } from "@/lib/pdf/parking";
import { ownerIdTypeLabel } from "@/lib/pm/agreement-labels";
import { normalizeOccupantIdUploads } from "@/lib/signing/form-helpers";
import type {
  ParkingLandlordDetails, ParkingTenantDetails, ParkingSpaceDetails,
  VehicleDetails, ParkingScheduleRow, ParkingBankDetails,
} from "@/lib/pm/parking-clauses";
import { DEFAULT_PARKING_BANK_DETAILS } from "@/lib/pm/parking-clauses";

export function parkingReferenceCode(id: string) {
  return `PA-${id.slice(0, 8).toUpperCase()}`;
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
  const { data: file } = await supabase.storage.from(AGREEMENTS_BUCKET).download(storagePath);
  if (!file) return { dataUri: null, buffer: null, mime: "image/jpeg" };
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = storagePath.split(".").pop()?.toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "pdf" ? "application/pdf" : "image/jpeg";
  // @react-pdf can only embed raster images inline; a PDF-format ID is
  // attached as a document row but not rendered into the IDs page.
  const dataUri = mime === "application/pdf" ? null : `data:${mime};base64,${buffer.toString("base64")}`;
  return { dataUri, buffer, mime };
}

/**
 * Completion pipeline for a parking agreement whose landlord signature has
 * just landed (remote link or staff countersign): render + store the PDF,
 * upsert the tenant, provision their portal login, attach portal documents,
 * and mark completed. No lease record is created (per the flow's design —
 * staff handle billing records manually).
 *
 * Takes the Supabase client as a parameter because the two callers run under
 * different trust models: the staff countersign action passes the normal
 * RLS-scoped staff client, while the remote landlord path is anonymous
 * (token-authenticated by the RPC) and passes the service-role admin client.
 */
export async function completeParkingAgreement(id: string, supabase: SupabaseClient): Promise<void> {
  const { data: a, error } = await supabase.from("parking_agreements").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!a) throw new Error("Agreement not found.");
  if (a.status === "completed") return; // idempotent — retry-safe
  if (!a.landlord_signature_data || !a.tenant_signature_data) {
    throw new Error("Both signatures are required before the agreement can be finalized.");
  }

  const ld = (a.landlord_details ?? {}) as ParkingLandlordDetails;
  const td = (a.tenant_details ?? {}) as ParkingTenantDetails;

  // 1-2. ID images
  const tenantIdFile = await downloadAsDataUri(supabase, a.tenant_id_document_path);
  const landlordIdFile = await downloadAsDataUri(supabase, a.landlord_id_document_path);
  const occupantIdUploads = normalizeOccupantIdUploads(
    (a.tenant_details as { additionalOccupantIds?: unknown } | null)?.additionalOccupantIds
  );
  const additionalOccupantIds = await Promise.all(
    occupantIdUploads.map(async (upload) => ({
      name: upload.occupantName,
      idImageDataUri: (await downloadAsDataUri(supabase, upload.path)).dataUri,
    }))
  );

  // 3. Render the PDF
  const pdfInput: ParkingPdfInput = {
    id: a.id,
    referenceCode: parkingReferenceCode(a.id),
    agreementDate: a.agreement_date,
    agreementCity: a.agreement_city,
    landlordDetails: ld,
    tenantDetails: td,
    terms: {
      parkingDetails: (a.parking_details ?? {}) as ParkingSpaceDetails,
      leaseStartDate: a.lease_start_date,
      leaseEndDate: a.lease_end_date,
      rentAmount: a.rent_amount !== null ? Number(a.rent_amount) : null,
      rentAmountWords: a.rent_amount_words,
      signingTotalAmount: a.signing_total_amount !== null ? Number(a.signing_total_amount) : null,
      signingTotalWords: a.signing_total_words,
      stickerAmount: a.sticker_amount !== null ? Number(a.sticker_amount) : null,
      rentDueDay: a.rent_due_day,
      vehicleDetails: (a.vehicle_details ?? {}) as VehicleDetails,
    },
    paymentSchedule: (a.payment_schedule ?? []) as ParkingScheduleRow[],
    bankDetails: { ...DEFAULT_PARKING_BANK_DETAILS, ...((a.bank_details ?? {}) as Partial<ParkingBankDetails>) },
    tenantIdTypeLabel: ownerIdTypeLabel(a.tenant_id_type),
    tenantIdNumber: a.tenant_id_number ?? "",
    tenantIdIssuedDate: a.tenant_id_issued_date,
    tenantIdImageDataUri: tenantIdFile.dataUri,
    additionalOccupantIds,
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
  const pdfBuffer = await renderParkingPdf(pdfInput);

  // 4. Store in the agreements bucket (staff-only)
  const pdfPath = `parking/${a.id}/parking-agreement-${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage.from(AGREEMENTS_BUCKET).upload(pdfPath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) throw new Error(`PDF upload failed: ${upErr.message}`);

  // 5. Cross-copy into the documents bucket — the portal download route only
  // signs URLs against `documents` (the agreements bucket is staff-only).
  const documentsPdfPath = `parking/${a.id}/parking-agreement-signed.pdf`;
  await supabase.storage.from(DOCUMENTS_BUCKET).upload(documentsPdfPath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  let documentsIdPath: string | null = null;
  if (tenantIdFile.buffer) {
    const ext = tenantIdFile.mime === "image/png" ? "png" : tenantIdFile.mime === "application/pdf" ? "pdf" : "jpg";
    documentsIdPath = `parking/${a.id}/tenant-id.${ext}`;
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
              <p>Your Parking Space Rental Agreement is fully signed. We've created your tenant portal account so you can view your signed agreement and documents online.</p>
              <p><a href="${linkData.properties.action_link}">Set your password and log in</a></p>
            `,
          });
        }
        await logAudit(supabase, { action: "tenant.portal_account_provisioned", entityType: "tenant", entityId: tenantRecordId });
      }
    } catch (err) {
      console.warn("[parking] tenant account provisioning failed:", err);
    }
  } else {
    await sendEmail({
      to: a.tenant_email,
      subject: "Your Parking Space Rental Agreement is fully signed",
      html: `<p>Hi ${td.name ?? "there"},</p><p>Your Parking Space Rental Agreement has been fully executed. You can view it in your tenant portal.</p>`,
    });
  }

  // 8. Portal document rows
  await supabase.from("documents").insert({
    entity_type: "tenant",
    entity_id: tenantRecordId,
    document_type: "parking_contract",
    title: "Parking Space Rental Agreement (signed)",
    file_path: documentsPdfPath,
    file_name: "parking-rental-agreement.pdf",
    file_mime_type: "application/pdf",
    is_signed: true,
    signed_at: new Date().toISOString(),
    is_immutable: true,
    visibility: "tenant",
  });
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
  const { error: doneErr } = await supabase.from("parking_agreements").update({
    status: "completed",
    pdf_path: pdfPath,
    linked_tenant_id: tenantRecordId,
  }).eq("id", id);
  if (doneErr) throw new Error(doneErr.message);

  // 10. Audit + notification + landlord copy (remote-signed only)
  await logAudit(supabase, { action: "parking_agreement.completed", entityType: "parking_agreement", entityId: id, metadata: { tenantId: tenantRecordId } });

  if (a.landlord_signed_via !== "countersign" && a.landlord_email) {
    await sendEmail({
      to: a.landlord_email,
      subject: "Parking Space Rental Agreement fully executed",
      html: `<p>Hi ${ld.name ?? "there"},</p><p>The Parking Space Rental Agreement with ${td.name ?? a.tenant_email} has been fully executed. You can download your copy from the signing link we sent you.</p>`,
    });
  }
  if (a.created_by) {
    await createNotification(supabase, {
      recipientUserId: a.created_by,
      type: "agreement_completed",
      title: "Parking agreement fully signed",
      body: `The Parking Space Rental Agreement for ${td.name ?? a.tenant_email} has been fully executed.`,
      link: `/admin/contracts/parking/${id}`,
      entityType: "parking_agreement",
      entityId: id,
    });
  }

  revalidatePath(`/admin/contracts/parking/${id}`);
  revalidatePath("/admin/contracts");
}
