"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getPublicSiteUrl } from "@/lib/url";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { signedUrl, AGREEMENTS_BUCKET } from "@/lib/storage";
import { completeAuthorityToSell } from "@/lib/authority-to-sell/complete";

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

const TABLE = "authority_to_sell_agreements";
const ENTITY = "authority_to_sell";

export async function createAuthorityToSell(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const ownerEmail = s(fd, "owner_email");
  const ownerNameHint = s(fd, "owner_name_hint");
  if (!ownerEmail) throw new Error("Owner email is required.");

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ owner_email: ownerEmail, owner_name_hint: ownerNameHint, created_by: user?.id ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const id = data.id as string;
  await logAudit(supabase, { action: "authority_to_sell.created", entityType: ENTITY, entityId: id, actorId: user?.id });
  await sendAuthorityToSellLink(id);

  revalidatePath("/admin/contracts");
  redirect(`/admin/contracts/authority-to-sell/${id}`);
}

export async function sendAuthorityToSellLink(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ats, error } = await supabase
    .from(TABLE)
    .select("access_token,owner_email,owner_name_hint,status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!ats) throw new Error("Authority to Sell not found.");

  const link = `${getPublicSiteUrl()}/sign/authority-to-sell/${ats.access_token}`;

  await supabase.from(TABLE).update({ status: "sent" }).eq("id", id).eq("status", "draft");

  await sendEmail({
    to: ats.owner_email,
    subject: "Your All Abode Authority to Sell is ready to sign",
    html: `
      <p>Hi ${ats.owner_name_hint ?? "there"},</p>
      <p>All Abode Property Solutions has prepared an Authority to Sell for your review and electronic signature.</p>
      <p><a href="${link}">Review and sign your Authority to Sell</a></p>
      <p>You'll need your property details (title or tax declaration number, location, area), your asking price, and a valid ID (passport preferred) on hand to complete the form.</p>
    `,
  });

  await logAudit(supabase, { action: "authority_to_sell.sent", entityType: ENTITY, entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/authority-to-sell/${id}`);
}

export async function voidAuthorityToSell(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ats } = await supabase.from(TABLE).select("status").eq("id", id).maybeSingle();
  if (!ats) throw new Error("Authority to Sell not found.");
  if (ats.status === "voided") return;

  const { error } = await supabase.from(TABLE).update({ status: "voided" }).eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "authority_to_sell.voided", entityType: ENTITY, entityId: id, actorId: user?.id });
  revalidatePath(`/admin/contracts/authority-to-sell/${id}`);
  revalidatePath("/admin/contracts");
}

// Blocked once completed — a fully executed contract is voided instead so the
// signed record is preserved.
export async function deleteAuthorityToSell(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ats } = await supabase
    .from(TABLE)
    .select("status,pdf_path,owner_id_document_path")
    .eq("id", id)
    .maybeSingle();
  if (!ats) throw new Error("Authority to Sell not found.");
  if (ats.status === "completed") {
    throw new Error("A fully executed Authority to Sell can't be deleted — void it instead to preserve the signed record.");
  }

  const paths = [ats.pdf_path, ats.owner_id_document_path].filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from(AGREEMENTS_BUCKET).remove(paths);

  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "authority_to_sell.deleted", entityType: ENTITY, entityId: id, actorId: user?.id });
  revalidatePath("/admin/contracts");
  redirect("/admin/contracts");
}

// Designated signatory (users.is_signatory) signs for the broker -> completion.
export async function countersignAuthorityToSell(id: string, signatureDataUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: staffRow } = await supabase.from("users").select("is_signatory").eq("id", user.id).maybeSingle();
  if (!staffRow?.is_signatory) {
    throw new Error("Only a designated signatory account can countersign this Authority to Sell.");
  }

  const { data: ats } = await supabase.from(TABLE).select("status").eq("id", id).maybeSingle();
  if (!ats) throw new Error("Authority to Sell not found.");
  if (ats.status !== "owner_signed") {
    throw new Error("This Authority to Sell is not ready to be countersigned yet.");
  }

  const ip = await clientIp();
  const { error } = await supabase.from(TABLE).update({
    broker_signature_data: signatureDataUrl,
    broker_signed_at: new Date().toISOString(),
    broker_signed_ip: ip,
    signatory_user_id: user.id,
  }).eq("id", id).eq("status", "owner_signed");
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "authority_to_sell.countersigned", entityType: ENTITY, entityId: id, actorId: user.id });

  await completeAuthorityToSell(id, supabase);
  revalidatePath(`/admin/contracts/authority-to-sell/${id}`);
}

// Retry for when completion failed after the broker signed.
export async function finalizeAuthorityToSell(id: string) {
  const supabase = await createClient();
  const { data: ats } = await supabase.from(TABLE).select("status,broker_signature_data").eq("id", id).maybeSingle();
  if (!ats) throw new Error("Authority to Sell not found.");
  if (ats.status !== "owner_signed" || !ats.broker_signature_data) {
    throw new Error("Nothing to finalize — the broker has not countersigned yet.");
  }
  await completeAuthorityToSell(id, supabase);
  revalidatePath(`/admin/contracts/authority-to-sell/${id}`);
}

export async function getAuthorityToSellPdfSignedUrl(id: string) {
  const supabase = await createClient();
  const { data: ats } = await supabase.from(TABLE).select("pdf_path,status").eq("id", id).maybeSingle();
  if (!ats?.pdf_path || ats.status !== "completed") return null;
  return signedUrl(supabase, AGREEMENTS_BUCKET, ats.pdf_path, 120);
}
