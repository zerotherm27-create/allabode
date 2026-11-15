"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type RuleToggleResult = { ok: true } | { ok: false; message: string };

/** Activate or pause one automation rule. Staff only; the write is checked, never silent. */
export async function setAutomationRule(code: string, active: boolean): Promise<RuleToggleResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) return { ok: false, message: "Staff access required." };

  const { data, error } = await supabase
    .from("automation_rules")
    .update({ is_active: active })
    .eq("code", code)
    .select("code");
  if (error) return { ok: false, message: `Could not save: ${error.message}` };
  if (!data?.length) return { ok: false, message: "That automation was not found." };

  await logAudit(supabase, {
    action: active ? "automation.activate" : "automation.pause",
    entityType: "automation_rule",
    actorId: user.id,
    metadata: { code },
  });
  revalidatePath("/admin/automation");
  return { ok: true };
}
