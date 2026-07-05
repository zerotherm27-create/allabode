import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthRedirectUrl } from "@/lib/url";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { AGREEMENTS_BUCKET, DOCUMENTS_BUCKET } from "@/lib/storage";
import { renderTenancyPdf, type TenancyPdfInput } from "@/lib/pdf/tenancy";
import { ownerIdTypeLabel } from "@/lib/pm/agreement-labels";
import { normalizeOccupantIdUploads } from "@/lib/signing/form-helpers";
import type {
  TenancyLandlordDetails, TenancyTenantDetails, TenancyPropertyDetails,
  PaymentScheduleRow, InventoryRow, TenancyBankDetails,
} from "@/lib/pm/tenancy-clauses";
import { DEFAULT_BANK_DETAILS } from "@/lib/pm/tenancy-clauses";

export function tenancyReferenceCode(id: string) {
  return `TA-${id.slice(0, 8).toUpperCase()}`;
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
 * Completion pipeline for a tenancy agreement whose landlord signature has
 * just landed (remote link or staff countersign): render + store the PDF,
 * upsert the tenant, create the lease (when a unit is linked), provision the
 * tenant's portal login, attach portal documents, and mark completed.
 *
 * Takes the Supabase client as a parameter because the two callers run under
 * different trust models: the staff countersign action passes the normal
 * RLS-scoped staff client, while the remote landlord path is anonymous
 * (token-authenticated by the RPC) and passes the service-role admin client —
 * the same narrow admin-client exception the token PDF route already uses.
 */
export async function completeTenancyAgreement(id: string, supabase: SupabaseClient): Promise<void> {
  const { data: a, error } = await supabase.from("tenancy_agreements").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!a) throw new Error("Agreement not found.");
  if (a.status === "completed") return; // idempotent — retry-safe
  if (!a.landlord_signature_data || !a.tenant_signature_data) {
    throw new Error("Both signatures are required before the agreement can be finalized.");
  }

  const tenantId = await (async () => {
    // 1-2. ID images
    const tenantIdFile = await downloadAsDataUri(supabase, a.tenant_id_document_path);
    const landlordIdFile = await downloadAsDataUri(supabase, a.landlord_id_document_path);
    const occupantIdUploads = normalizeOccupantIdUploads(
      (a.tenant_details as { additionalOccupantIds?: unknown } | null)?.additionalOccupantIds
    );
    const occupantIdFiles = await Promise.all(
      occupantIdUploads.map(async (upload) => ({
        name: upload.occupantName,
        file: await downloadAsDataUri(supabase, upload.path),
      }))
    );
    const additionalOccupantIds = occupantIdFiles.map((o) => ({ name: o.name, idImageDataUri: o.file.dataUri }));

    // 3. Render the PDF
    // Party recital shows each party's actual captured ID (from the ID they
    // upload while signing) — landlord_details/tenant_details never carry an
    // idNumber field themselves; that only lives in the dedicated columns.
    const ld = { ...((a.landlord_details ?? {}) as TenancyLandlordDetails), idNumber: a.landlord_id_number ?? "" };
    const td = { ...((a.tenant_details ?? {}) as TenancyTenantDetails), idNumber: a.tenant_id_number ?? "" };
    const pdfInput: TenancyPdfInput = {
      id: a.id,
      referenceCode: tenancyReferenceCode(a.id),
      agreementDate: a.agreement_date,
      landlordDetails: ld,
      tenantDetails: td,
      terms: {
        propertyDetails: (a.property_details ?? {}) as TenancyPropertyDetails,
        leaseMonths: a.lease_months,
        leaseStartDate: a.lease_start_date,
        leaseEndDate: a.lease_end_date,
        rentAmount: a.rent_amount !== null ? Number(a.rent_amount) : null,
        rentAmountWords: a.rent_amount_words,
        advanceDepositAmount: a.advance_deposit_amount !== null ? Number(a.advance_deposit_amount) : null,
        advanceDepositWords: a.advance_deposit_words,
        depositAmount: a.deposit_amount !== null ? Number(a.deposit_amount) : null,
        depositAmountWords: a.deposit_amount_words,
        rentDueDay: a.rent_due_day,
        occupants: (a.occupants ?? []) as string[],
      },
      paymentSchedule: (a.payment_schedule ?? []) as PaymentScheduleRow[],
      bankDetails: { ...DEFAULT_BANK_DETAILS, ...((a.bank_details ?? {}) as Partial<TenancyBankDetails>) },
      inventory: (a.inventory ?? []) as InventoryRow[],
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
      witnessName: null,
      witnessSignatureDataUri: null,
    };
    if (a.signatory_user_id) {
      const { data: signatoryRow } = await supabase.from("users").select("name,email").eq("id", a.signatory_user_id).maybeSingle();
      pdfInput.countersignerEmail = signatoryRow?.email ?? null;
      // The countersigning staff member's own pen-stroke represents the
      // landlord's consent (delegated) *and* doubles as their witnessing —
      // only meaningful when they were physically present for it, i.e. the
      // countersign path (never the remote landlord-signs-own-link path).
      if (a.landlord_signed_via === "countersign") {
        pdfInput.witnessName = signatoryRow?.name ?? null;
        pdfInput.witnessSignatureDataUri = a.landlord_signature_data ?? null;
      }
    }
    const pdfBuffer = await renderTenancyPdf(pdfInput);

    // 4. Store in the agreements bucket (staff-only)
    const pdfPath = `tenancy/${a.id}/tenancy-agreement-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from(AGREEMENTS_BUCKET).upload(pdfPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (upErr) throw new Error(`PDF upload failed: ${upErr.message}`);

    // 5. Cross-copy into the documents bucket — the portal download route only
    // signs URLs against `documents` (the agreements bucket is staff-only).
    const documentsPdfPath = `tenancy/${a.id}/tenancy-agreement-signed.pdf`;
    await supabase.storage.from(DOCUMENTS_BUCKET).upload(documentsPdfPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });
    let documentsIdPath: string | null = null;
    if (tenantIdFile.buffer) {
      const ext = tenantIdFile.mime === "image/png" ? "png" : tenantIdFile.mime === "application/pdf" ? "pdf" : "jpg";
      documentsIdPath = `tenancy/${a.id}/tenant-id.${ext}`;
      await supabase.storage.from(DOCUMENTS_BUCKET).upload(documentsIdPath, tenantIdFile.buffer, {
        contentType: tenantIdFile.mime,
        upsert: true,
      });
    }
    const occupantDocumentsIds: { name: string; path: string }[] = [];
    for (const occupant of occupantIdFiles) {
      if (!occupant.file.buffer) continue;
      const ext = occupant.file.mime === "image/png" ? "png" : occupant.file.mime === "application/pdf" ? "pdf" : "jpg";
      const safeName = occupant.name.replace(/[^a-zA-Z0-9-_]+/g, "-").toLowerCase() || "occupant";
      const path = `tenancy/${a.id}/occupant-id-${safeName}-${Date.now()}.${ext}`;
      await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, occupant.file.buffer, {
        contentType: occupant.file.mime,
        upsert: true,
      });
      occupantDocumentsIds.push({ name: occupant.name, path });
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

    // 7. Create the lease when a unit was linked (otherwise staff create it
    // manually — the admin detail page shows a banner for that case).
    let leaseId: string | null = null;
    if (a.unit_id && a.lease_start_date && a.rent_amount !== null) {
      const { data: lease, error: leaseErr } = await supabase.from("leases").insert({
        unit_id: a.unit_id,
        tenant_id: tenantRecordId,
        start_date: a.lease_start_date,
        end_date: a.lease_end_date,
        rent_amount: a.rent_amount,
        billing_cycle: "monthly",
        deposit: a.deposit_amount,
        advance: a.rent_amount, // 1 month advance (clause 3.2)
        notice_period_days: 30, // Early Termination clause
        status: "active",
        contract_path: pdfPath,
      }).select("id").single();
      if (leaseErr) {
        console.warn("[tenancy] lease creation failed:", leaseErr.message);
      } else {
        leaseId = lease.id;
      }
    }

    // 8. Provision the tenant portal account if they don't have one
    let hasAuthAccount = !!existingTenant?.auth_user_id;
    if (!hasAuthAccount) {
      try {
        const admin = createAdminClient();
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: a.tenant_email,
          email_confirm: true,
        });
        if (!createErr && created.user) {
          await supabase.from("tenants").update({ auth_user_id: created.user.id }).eq("id", tenantRecordId);
          hasAuthAccount = true;

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
                <p>Your Tenancy Agreement is fully signed. We've created your tenant portal account so you can view your signed agreement, invoices, and requests online.</p>
                <p><a href="${linkData.properties.action_link}">Set your password and log in</a></p>
              `,
            });
          }
          await logAudit(supabase, { action: "tenant.portal_account_provisioned", entityType: "tenant", entityId: tenantRecordId });
        }
      } catch (err) {
        console.warn("[tenancy] tenant account provisioning failed:", err);
      }
    } else {
      await sendEmail({
        to: a.tenant_email,
        subject: "Your Tenancy Agreement is fully signed",
        html: `<p>Hi ${td.name ?? "there"},</p><p>Your Tenancy Agreement has been fully executed. You can view it in your tenant portal.</p>`,
      });
    }

    // 9. Portal document rows
    await supabase.from("documents").insert({
      entity_type: "tenant",
      entity_id: tenantRecordId,
      document_type: "lease_contract",
      title: "Tenancy Agreement (signed)",
      file_path: documentsPdfPath,
      file_name: "tenancy-agreement.pdf",
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
    for (const occupant of occupantDocumentsIds) {
      await supabase.from("documents").insert({
        entity_type: "tenant",
        entity_id: tenantRecordId,
        document_type: "id",
        title: `Government ID (${occupant.name})`,
        file_path: occupant.path,
        file_name: occupant.path.split("/").pop() ?? "id",
        is_signed: false,
        is_immutable: true,
        visibility: "staff",
      });
    }

    // 10. Flip to completed
    const { error: doneErr } = await supabase.from("tenancy_agreements").update({
      status: "completed",
      pdf_path: pdfPath,
      linked_tenant_id: tenantRecordId,
      linked_lease_id: leaseId,
    }).eq("id", id);
    if (doneErr) throw new Error(doneErr.message);

    return tenantRecordId;
  })();

  // 11. Audit + notification + landlord copy (remote-signed only — the
  // countersign path has no landlord email requirement)
  await logAudit(supabase, { action: "tenancy_agreement.completed", entityType: "tenancy_agreement", entityId: id, metadata: { tenantId } });

  const td = (a.tenant_details ?? {}) as TenancyTenantDetails;
  if (a.landlord_signed_via !== "countersign" && a.landlord_email) {
    await sendEmail({
      to: a.landlord_email,
      subject: "Tenancy Agreement fully executed",
      html: `<p>Hi ${(a.landlord_details as TenancyLandlordDetails | null)?.name ?? "there"},</p><p>The Tenancy Agreement with ${td.name ?? a.tenant_email} has been fully executed. You can download your copy from the signing link we sent you.</p>`,
    });
  }
  if (a.created_by) {
    await createNotification(supabase, {
      recipientUserId: a.created_by,
      type: "agreement_completed",
      title: "Tenancy agreement fully signed",
      body: `The Tenancy Agreement for ${td.name ?? a.tenant_email} has been fully executed.`,
      link: `/admin/contracts/tenancy/${id}`,
      entityType: "tenancy_agreement",
      entityId: id,
    });
  }

  revalidatePath(`/admin/contracts/tenancy/${id}`);
  revalidatePath("/admin/contracts");
}
