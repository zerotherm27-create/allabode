"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { DOCUMENTS_BUCKET } from "@/lib/storage";

export type DocumentActionState = { error?: string };

export async function uploadDocument(
  entityType: string,
  entityId: string,
  _prev: DocumentActionState,
  fd: FormData
): Promise<DocumentActionState> {
  const file = fd.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Please select a file." };
  if (file.size > 20 * 1024 * 1024) return { error: "File must be under 20 MB." };

  const title       = (fd.get("title") as string | null)?.trim() || file.name;
  const doc_type    = (fd.get("document_type") as string | null) ?? "other";
  const visibility  = (fd.get("visibility") as string | null) ?? "staff";

  try {
    const supabase = createAdminClient();
    const ext      = file.name.split(".").pop() ?? "bin";
    const path     = `${entityType}/${entityId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadErr) return { error: uploadErr.message };

    const { error: dbErr } = await supabase.from("documents").insert({
      entity_type:    entityType,
      entity_id:      entityId,
      document_type:  doc_type,
      title,
      file_path:      path,
      file_name:      file.name,
      file_mime_type: file.type || null,
      file_size:      file.size,
      visibility,
    });
    if (dbErr) return { error: dbErr.message };

    await logAudit(supabase, { action: "document.uploaded", entityType, entityId });
    revalidatePath(`/admin/${entityType}s/${entityId}`);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }
}

export async function markSigned(documentId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("documents").update({
    is_signed: true,
    signed_at: new Date().toISOString(),
  }).eq("id", documentId).eq("is_immutable", false);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "document.signed", entityType: "document", entityId: documentId });
  revalidatePath("/admin");
}

export async function deleteDocument(documentId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("documents")
    .select("file_path,is_immutable").eq("id", documentId).maybeSingle();
  if (!data) throw new Error("Document not found");
  if ((data as { is_immutable?: boolean }).is_immutable) throw new Error("Cannot delete an immutable document");

  const filePath = (data as { file_path: string }).file_path;
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath]);
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "document.deleted", entityType: "document", entityId: documentId });
  revalidatePath("/admin");
}
