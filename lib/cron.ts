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

/**
 * Pure decision: is this request allowed? A missing secret denies in production
 * (so a forgotten env var never leaves a new endpoint open) and allows in dev.
 */
export function isCronAuthorized(
  headerValue: string | null,
  secret: string | undefined,
  isProduction: boolean,
): boolean {
  if (!secret) return !isProduction;
  if (!headerValue) return false;
  const expected = `Bearer ${secret}`;
  if (headerValue.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= headerValue.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** For NEW cron routes (GET or POST). Unlike verifyCronSecret, denies when CRON_SECRET is unset in production. */
export function cronAuthorized(req: Request): boolean {
  return isCronAuthorized(
    req.headers.get("authorization"),
    process.env.CRON_SECRET,
    process.env.NODE_ENV === "production",
  );
}

/** Log a cron run result to automation_run_log + update last_run_at. */
export async function logCronRun(
  supabase: SupabaseClient,
  ruleCode: string,
  result: { processed: number; taken: number; errors?: unknown; status: "success" | "partial" | "failed" }
) {
  const { data: rule } = await supabase
    .from("automation_rules").select("id").eq("code", ruleCode).maybeSingle();
  if (!rule) {
    console.warn(`[cron] no automation_rules row for code "${ruleCode}"; run not logged`);
    return;
  }

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
