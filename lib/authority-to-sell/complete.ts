import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthRedirectUrl } from "@/lib/url";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { AGREEMENTS_BUCKET, DOCUMENTS_BUCKET } from "@/lib/storage";
import { renderAuthorityToSellPdf, type AuthorityToSellPdfInput } from "@/lib/pdf/authority-to-sell";
import { ownerIdTypeLabel } from "@/lib/pm/agreement-labels";
import { COMPANY_SIGNATORY, loadCompanySignatoryIdImage } from "@/lib/pm/company-signatory";

export function authorityToSellReferenceCode(id: string) {
  return `ATS-${id.slice(0, 8).toUpperCase()}`;
}

export function manilaTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

/**
 * Renders the signed PDF, upserts the owner, provisions a portal login and
 * attaches the documents. Idempotent: returns early once completed. Takes the
 * client as a parameter so the staff session (countersign) and finalize retry
 * can both call it.
 */
export async function completeAuthorityToSell(id: string, supabase: SupabaseClient): Promise<void> {
  const { data: a, error } = await supabase.from("authority_to_sell_agreements").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!a) throw new Error("Authority to Sell not found.");
  if (a.status === "completed") return;

  let ownerIdImageDataUri: string | null = null;
  let ownerIdFileBuffer: Buffer | null = null;
  let ownerIdMime = "image/jpeg";
  // Defence in depth: the RPC already binds the path, but never read a file
  // outside this record's own folder.
  if (a.owner_id_document_path?.startsWith(`authority-to-sell/${a.id}/`) && !a.owner_id_document_path.includes("..")) {
    const { data: idFile } = await supabase.storage.from(AGREEMENTS_BUCKET).download(a.owner_id_document_path);
    if (idFile) {
      ownerIdFileBuffer = Buffer.from(await idFile.arrayBuffer());
      const ext = a.owner_id_document_path.split(".").pop()?.toLowerCase();
      ownerIdMime = idFile.type || (ext === "png" ? "image/png" : "image/jpeg");
      ownerIdImageDataUri = `data:${ownerIdMime};base64,${ownerIdFileBuffer.toString("base64")}`;
    }
  }

  const { data: signatoryRow } = await supabase.from("users").select("email").eq("id", a.signatory_user_id ?? "").maybeSingle();
  const brokerIdImage = await loadCompanySignatoryIdImage(supabase);

  const pdfInput: AuthorityToSellPdfInput = {
    id: a.id,
    referenceCode: authorityToSellReferenceCode(a.id),
    executionDate: a.execution_date,
    ownerDetails: a.owner_details ?? {},
    propertyDetails: a.property_details ?? {},
    saleTerms: a.sale_terms ?? {},
    ownerIdTypeLabel: ownerIdTypeLabel(a.owner_id_type),
    ownerIdNumber: a.owner_id_number ?? "",
    ownerIdIssuedDate: a.owner_id_issued_date,
    ownerIdImageDataUri,
    brokerIdTypeLabel: COMPANY_SIGNATORY.idTypeLabel,
    brokerIdNumber: COMPANY_SIGNATORY.idNumber,
    brokerIdIssuedDate: COMPANY_SIGNATORY.idIssuedDate,
    brokerIdImageDataUri: brokerIdImage.dataUri,
    ownerTypedName: a.owner_typed_name ?? "",
    ownerSignatureDataUri: a.owner_signature_data ?? "",
    ownerSignedAtManila: manilaTime(a.owner_signed_at),
    ownerSignedIp: a.owner_signed_ip ?? "unknown",
    brokerSignatureDataUri: a.broker_signature_data ?? "",
    brokerSignedAtManila: manilaTime(a.broker_signed_at),
    brokerSignedIp: a.broker_signed_ip ?? "unknown",
    brokerSignerEmail: signatoryRow?.email ?? "",
  };

  const pdfBuffer = await renderAuthorityToSellPdf(pdfInput);
  const pdfPath = `authority-to-sell/${a.id}/authority-to-sell-${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage.from(AGREEMENTS_BUCKET).upload(pdfPath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) throw new Error(`PDF upload failed: ${upErr.message}`);

  // The portal download route signs URLs against the `documents` bucket only.
  const documentsPdfPath = `authority-to-sell/${a.id}/authority-to-sell-signed.pdf`;
  await supabase.storage.from(DOCUMENTS_BUCKET).upload(documentsPdfPath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  let documentsIdPath: string | null = null;
  if (ownerIdFileBuffer) {
    const ext = ownerIdMime === "image/png" ? "png" : "jpg";
    documentsIdPath = `authority-to-sell/${a.id}/owner-id.${ext}`;
    await supabase.storage.from(DOCUMENTS_BUCKET).upload(documentsIdPath, ownerIdFileBuffer, {
      contentType: ownerIdMime,
      upsert: true,
    });
  }

  // Upsert owner by email
  const od = (a.owner_details ?? {}) as { name?: string; address?: string; contact?: string };
  const { data: existingOwner } = await supabase.from("owners").select("id,auth_user_id").eq("email", a.owner_email).maybeSingle();

  let ownerId: string;
  if (existingOwner) {
    ownerId = existingOwner.id;
    await supabase.from("owners").update({
      name: od.name ?? a.owner_name_hint ?? "Owner",
      phone: od.contact ?? null,
      address: od.address ?? null,
    }).eq("id", ownerId);
  } else {
    const { data: newOwner, error: ownerErr } = await supabase.from("owners").insert({
      name: od.name ?? a.owner_name_hint ?? "Owner",
      email: a.owner_email,
      phone: od.contact ?? null,
      address: od.address ?? null,
    }).select("id,auth_user_id").single();
    if (ownerErr) throw new Error(ownerErr.message);
    ownerId = newOwner.id;
  }

  // Provision portal account if the owner has none yet
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
              <p>Your Authority to Sell is fully signed. We've created your owner portal account so you can view your signed copy online.</p>
              <p><a href="${linkData.properties.action_link}">Set your password and log in</a></p>
            `,
          });
        }
        await logAudit(supabase, { action: "owner.portal_account_provisioned", entityType: "owner", entityId: ownerId });
      }
    } catch (err) {
      console.warn("[authority-to-sell] owner account provisioning failed:", err);
    }
  }

  if (existingOwner?.auth_user_id) {
    await sendEmail({
      to: a.owner_email,
      subject: "Your Authority to Sell is fully signed",
      html: `<p>Hi ${od.name ?? "there"},</p><p>Your Authority to Sell has been fully executed. You can view it in your owner dashboard.</p>`,
    });
  }

  await supabase.from("documents").insert({
    entity_type: "owner",
    entity_id: ownerId,
    document_type: "authority_to_sell",
    title: "Authority to Sell (signed)",
    file_path: documentsPdfPath,
    file_name: "authority-to-sell.pdf",
    file_mime_type: "application/pdf",
    is_signed: true,
    signed_at: new Date().toISOString(),
    is_immutable: true,
    visibility: "owner",
  });

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

  await supabase.from("authority_to_sell_agreements").update({
    status: "completed",
    pdf_path: pdfPath,
    linked_owner_id: ownerId,
  }).eq("id", id);

  await logAudit(supabase, { action: "authority_to_sell.completed", entityType: "authority_to_sell", entityId: id, metadata: { ownerId } });

  if (a.created_by) {
    await createNotification(supabase, {
      recipientUserId: a.created_by,
      type: "authority_to_sell_completed",
      title: "Authority to Sell fully signed",
      body: `The Authority to Sell for ${od.name ?? a.owner_email} has been fully executed.`,
      link: `/admin/contracts/authority-to-sell/${id}`,
      entityType: "authority_to_sell",
      entityId: id,
    });
  }

  revalidatePath(`/admin/contracts/authority-to-sell/${id}`);
  revalidatePath("/admin/contracts");
}
