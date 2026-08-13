"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { DOCUMENTS_BUCKET } from "@/lib/storage";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

export async function createNotice(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const title       = s(fd, "title");
  const body        = s(fd, "body");
  const notice_type = s(fd, "notice_type") ?? "info";
  const audience    = s(fd, "audience") ?? "all";
  const property_id = s(fd, "property_id");
  const publish_now = fd.get("publish_now") === "on";
  const expires_str = s(fd, "expires_at");

  if (!title || !body) throw new Error("Title and body are required");

  const attachment = fd.get("attachment") as File | null;
  const hasAttachment = !!attachment && attachment.size > 0;
  if (hasAttachment) {
    if (attachment.type !== "application/pdf") throw new Error("Attachment must be a PDF file.");
    if (attachment.size > MAX_ATTACHMENT_BYTES) throw new Error("Attachment must be under 10 MB.");
  }

  const { data, error } = await supabase.from("notices").insert({
    title,
    body,
    notice_type,
    audience,
    property_id: property_id || null,
    published_at: publish_now ? new Date().toISOString() : null,
    expires_at:  expires_str ? new Date(expires_str).toISOString() : null,
    created_by:  user?.id ?? null,
  }).select("id").single();
  if (error) throw new Error(error.message);

  if (hasAttachment) {
    const path = `notice/${data.id}/${Date.now()}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, attachment, { contentType: attachment.type, upsert: false });
    if (uploadErr) throw new Error(`Notice created, but the attachment failed to upload: ${uploadErr.message}`);

    const { error: docErr } = await supabase.from("documents").insert({
      entity_type:    "notice",
      entity_id:      data.id,
      document_type:  "other",
      title:          attachment.name,
      file_path:      path,
      file_name:      attachment.name,
      file_mime_type: attachment.type,
      file_size:      attachment.size,
      visibility:     "staff",
      uploaded_by:    user?.id ?? null,
    });
    if (docErr) throw new Error(`Notice created, but the attachment failed to save: ${docErr.message}`);
  }

  await logAudit(supabase, { action: "notice.created", entityType: "notice", entityId: data.id });
  redirect("/admin/notices");
}

export async function publishNotice(noticeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notices")
    .update({ published_at: new Date().toISOString() })
    .eq("id", noticeId)
    .is("published_at", null);
  if (error) throw new Error(error.message);
  await logAudit(supabase, { action: "notice.published", entityType: "notice", entityId: noticeId });
  revalidatePath("/admin/notices");
}

export async function expireNotice(noticeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notices")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", noticeId);
  if (error) throw new Error(error.message);
  await logAudit(supabase, { action: "notice.expired", entityType: "notice", entityId: noticeId });
  revalidatePath("/admin/notices");
}
