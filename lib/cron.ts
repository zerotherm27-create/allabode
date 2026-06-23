import type { SupabaseClient } from "@supabase/supabase-js";

/** Verify CRON_SECRET and return a 401 NextResponse if it fails. */
export function verifyCronSecret(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null; // dev mode — skip
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

/** Log a cron run result to automation_run_log + update last_run_at. */
export async function logCronRun(
  supabase: SupabaseClient,
  ruleCode: string,
  result: { processed: number; taken: number; errors?: unknown; status: "success" | "partial" | "failed" }
) {
  const { data: rule } = await supabase
    .from("automation_rules").select("id").eq("code", ruleCode).maybeSingle();
  if (!rule) return;

  const ruleId = (rule as { id: string }).id;
  await Promise.all([
    supabase.from("automation_run_log").insert({
      rule_id:             ruleId,
      entities_processed:  result.processed,
      actions_taken:       result.taken,
      errors:              result.errors ? JSON.stringify(result.errors) : null,
      status:              result.status,
    }),
    supabase.from("automation_rules")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", ruleId),
  ]);
}
