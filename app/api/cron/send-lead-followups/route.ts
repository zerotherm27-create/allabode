import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { cronAuthorized, logCronRun } from "@/lib/cron";
import { sendQueued } from "@/lib/nurture/send";
import { maxAttempts, runCap } from "@/lib/nurture/schedule";

export const runtime = "nodejs";
export const maxDuration = 60;

const RULE = "send_lead_followups";

/**
 * Daily sender for lead follow-up emails. Vercel Cron calls it with GET and
 * `Authorization: Bearer $CRON_SECRET`. Sends nothing unless NURTURE_ENABLED
 * is "true"; NURTURE_DRY_RUN="true" returns the plan without sending.
 */
async function handle(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ ok: false, error: "Service role key is not configured." }, { status: 503 });
  }

  const service = createServiceClient();
  const { data: rule } = await service
    .from("automation_rules")
    .select("is_active,action_config")
    .eq("code", RULE)
    .maybeSingle();
  const config = (rule as { is_active?: boolean; action_config?: unknown } | null) ?? null;
  if (config && config.is_active === false) {
    return NextResponse.json({ ok: true, mode: "rule_inactive", considered: 0 });
  }

  const summary = await sendQueued(service, {
    limit: runCap(config?.action_config),
    maxAttempts: maxAttempts(config?.action_config),
  });

  const hadErrors = summary.errors.length > 0;
  await logCronRun(service, RULE, {
    processed: summary.considered,
    taken: summary.mode === "dry_run" ? summary.plan.length : summary.sent,
    errors: hadErrors ? summary.errors.slice(0, 20) : undefined,
    status: !hadErrors ? "success" : summary.sent > 0 || summary.skipped > 0 ? "partial" : "failed",
  });

  return NextResponse.json({
    ok: true,
    mode: summary.mode,
    considered: summary.considered,
    sent: summary.sent,
    skipped: summary.skipped,
    failed: summary.failed,
    retrying: summary.retrying,
    errors: summary.errors.length,
    ...(summary.mode === "dry_run" ? { plan: summary.plan, skips: summary.skips } : {}),
  });
}

export const GET = handle;
export const POST = handle;
