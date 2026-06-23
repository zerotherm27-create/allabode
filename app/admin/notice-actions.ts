"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

export async function createNotice(fd: FormData) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  const supabase = createAdminClient();

  const title       = s(fd, "title");
  const body        = s(fd, "body");
  const notice_type = s(fd, "notice_type") ?? "info";
  const audience    = s(fd, "audience") ?? "all";
  const property_id = s(fd, "property_id");
  const publish_now = fd.get("publish_now") === "on";
  const expires_str = s(fd, "expires_at");

  if (!title || !body) throw new Error("Title and body are required");

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

  await logAudit(supabase, { action: "notice.created", entityType: "notice", entityId: data.id });
  redirect("/admin/notices");
}

export async function publishNotice(noticeId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("notices")
    .update({ published_at: new Date().toISOString() })
    .eq("id", noticeId)
    .is("published_at", null);
  if (error) throw new Error(error.message);
  await logAudit(supabase, { action: "notice.published", entityType: "notice", entityId: noticeId });
  revalidatePath("/admin/notices");
}

export async function expireNotice(noticeId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("notices")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", noticeId);
  if (error) throw new Error(error.message);
  await logAudit(supabase, { action: "notice.expired", entityType: "notice", entityId: noticeId });
  revalidatePath("/admin/notices");
}
