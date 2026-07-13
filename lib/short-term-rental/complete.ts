import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthRedirectUrl } from "@/lib/url";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { AGREEMENTS_BUCKET, DOCUMENTS_BUCKET } from "@/lib/storage";
import { renderShortTermRentalPdf, type StrPdfInput } from "@/lib/pdf/short-term-rental";
import { ownerIdTypeLabel } from "@/lib/pm/agreement-labels";
import type {
  StrHomeownerDetails, StrTenantDetails, StrPropertyDetails,
  StrFeeItem, StrInventoryRow, StrBankDetails,
} from "@/lib/pm/short-term-rental-clauses";
import { DEFAULT_STR_BANK_DETAILS } from "@/lib/pm/short-term-rental-clauses";

export function strReferenceCode(id: string) {
  return `STR-${id.slice(0, 8).toUpperCase()}`;
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
 * Completion pipeline for a short term rental agreement whose homeowner
 * signature has just landed (remote link or staff countersign): render +
 * store the PDF, upsert the tenant, provision their portal login, attach
 * portal documents, and mark completed. No lease record is created (per the
 * flow's design, mirroring Parking — staff handle billing records manually).
 *
 * Takes the Supabase client as a parameter because the two callers run under
 * different trust models: the staff countersign action passes the normal
 * RLS-scoped staff client, while the remote homeowner path is anonymous
 * (token-authenticated by the RPC) and passes the service-role admin client.
 */
export async function completeStrAgreement(id: string, supabase: SupabaseClient): Promise<void> {
  const { data: a, error } = await supabase.from("short_term_rental_agreements").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!a) throw new Error("Agreement not found.");
  if (a.status === "completed") return; // idempotent — retry-safe
  if (!a.homeowner_signature_data || !a.tenant_signature_data) {
    throw new Error("Both signatures are required before the agreement can be finalized.");
  }

  const hd = (a.homeowner_details ?? {}) as StrHomeownerDetails;
  const td = (a.tenant_details ?? {}) as StrTenantDetails;

  // 1-2. ID images
  const tenantIdFile = await downloadAsDataUri(supabase, a.tenant_id_document_path);
  const homeownerIdFile = await downloadAsDataUri(supabase, a.homeowner_id_document_path);

  // 3. Render the PDF
  const pdfInput: StrPdfInput = {
    id: a.id,
    referenceCode: strReferenceCode(a.id),
    agreementDate: a.agreement_date,
    homeownerDetails: hd,
    tenantDetails: td,
    terms: {
      propertyDetails: (a.property_details ?? {}) as StrPropertyDetails,
      checkInDate: a.check_in_date,
      checkOutDate: a.check_out_date,
      occupants: (a.occupants ?? []) as string[],
      amenityLocation: a.amenity_location,
      amenitiesList: a.amenities_list,
      garbageDisposalLocation: a.garbage_disposal_location,
    },
    feeItems: (a.fee_items ?? []) as StrFeeItem[],
    securityDepositAmount: a.security_deposit_amount !== null ? Number(a.security_deposit_amount) : null,
    bankDetails: { ...DEFAULT_STR_BANK_DETAILS, ...((a.bank_details ?? {}) as Partial<StrBankDetails>) },
    inventory: (a.inventory ?? []) as StrInventoryRow[],
    tenantIdTypeLabel: ownerIdTypeLabel(a.tenant_id_type),
    tenantIdNumber: a.tenant_id_number ?? "",
    tenantIdIssuedDate: a.tenant_id_issued_date,
    tenantIdImageDataUri: tenantIdFile.dataUri,
    homeownerIdTypeLabel: a.homeowner_id_type ? ownerIdTypeLabel(a.homeowner_id_type) : null,
    homeownerIdNumber: a.homeowner_id_number,
    homeownerIdIssuedDate: a.homeowner_id_issued_date,
    homeownerIdImageDataUri: homeownerIdFile.dataUri,
    tenantTypedName: a.tenant_typed_name ?? "",
    tenantSignatureDataUri: a.tenant_signature_data ?? "",
    tenantSignedAtManila: manilaTime(a.tenant_signed_at),
    tenantSignedIp: a.tenant_signed_ip ?? "unknown",
    homeownerTypedName: a.homeowner_typed_name ?? "",
    homeownerSignatureDataUri: a.homeowner_signature_data ?? "",
    homeownerSignedAtManila: manilaTime(a.homeowner_signed_at),
    homeownerSignedIp: a.homeowner_signed_ip ?? "unknown",
    homeownerSignedVia: (a.homeowner_signed_via ?? "countersign") as "remote" | "countersign",
    countersignerEmail: null,
  };
  if (a.signatory_user_id) {
    const { data: signatoryRow } = await supabase.from("users").select("email").eq("id", a.signatory_user_id).maybeSingle();
    pdfInput.countersignerEmail = signatoryRow?.email ?? null;
  }
  const pdfBuffer = await renderShortTermRentalPdf(pdfInput);

  // 4. Store in the agreements bucket (staff-only)
  const pdfPath = `short-term-rental/${a.id}/short-term-rental-agreement-${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage.from(AGREEMENTS_BUCKET).upload(pdfPath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) throw new Error(`PDF upload failed: ${upErr.message}`);

  // 5. Cross-copy into the documents bucket — the portal download route only
  // signs URLs against `documents` (the agreements bucket is staff-only).
  const documentsPdfPath = `short-term-rental/${a.id}/short-term-rental-agreement-signed.pdf`;
  await supabase.storage.from(DOCUMENTS_BUCKET).upload(documentsPdfPath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  let documentsIdPath: string | null = null;
  if (tenantIdFile.buffer) {
    const ext = tenantIdFile.mime === "image/png" ? "png" : tenantIdFile.mime === "application/pdf" ? "pdf" : "jpg";
    documentsIdPath = `short-term-rental/${a.id}/tenant-id.${ext}`;
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
              <p>Your Short Term Rental Agreement is fully signed. We've created your tenant portal account so you can view your signed agreement and documents online.</p>
              <p><a href="${linkData.properties.action_link}">Set your password and log in</a></p>
            `,
          });
        }
        await logAudit(supabase, { action: "tenant.portal_account_provisioned", entityType: "tenant", entityId: tenantRecordId });
      }
    } catch (err) {
      console.warn("[short-term-rental] tenant account provisioning failed:", err);
    }
  } else {
    await sendEmail({
      to: a.tenant_email,
      subject: "Your Short Term Rental Agreement is fully signed",
      html: `<p>Hi ${td.name ?? "there"},</p><p>Your Short Term Rental Agreement has been fully executed. You can view it in your tenant portal.</p>`,
    });
  }

  // 8. Portal document rows
  await supabase.from("documents").insert({
    entity_type: "tenant",
    entity_id: tenantRecordId,
    document_type: "short_term_rental_contract",
    title: "Short Term Rental Agreement (signed)",
    file_path: documentsPdfPath,
    file_name: "short-term-rental-agreement.pdf",
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
  const { error: doneErr } = await supabase.from("short_term_rental_agreements").update({
    status: "completed",
    pdf_path: pdfPath,
    linked_tenant_id: tenantRecordId,
  }).eq("id", id);
  if (doneErr) throw new Error(doneErr.message);

  // 10. Audit + notification + homeowner copy (remote-signed only)
  await logAudit(supabase, { action: "short_term_rental_agreement.completed", entityType: "short_term_rental_agreement", entityId: id, metadata: { tenantId: tenantRecordId } });

  if (a.homeowner_signed_via !== "countersign" && a.homeowner_email) {
    await sendEmail({
      to: a.homeowner_email,
      subject: "Short Term Rental Agreement fully executed",
      html: `<p>Hi ${hd.name ?? "there"},</p><p>The Short Term Rental Agreement with ${td.name ?? a.tenant_email} has been fully executed. You can download your copy from the signing link we sent you.</p>`,
    });
  }
  if (a.created_by) {
    await createNotification(supabase, {
      recipientUserId: a.created_by,
      type: "agreement_completed",
      title: "Short term rental agreement fully signed",
      body: `The Short Term Rental Agreement for ${td.name ?? a.tenant_email} has been fully executed.`,
      link: `/admin/contracts/short-term-rental/${id}`,
      entityType: "short_term_rental_agreement",
      entityId: id,
    });
  }

  revalidatePath(`/admin/contracts/short-term-rental/${id}`);
  revalidatePath("/admin/contracts");
}
