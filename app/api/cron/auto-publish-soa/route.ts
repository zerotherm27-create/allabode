import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCronSecret, logCronRun } from "@/lib/cron";
import { runSoaPublishPipeline } from "@/lib/finance/soa-pipeline";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const deny = verifyCronSecret(req);
  if (deny) return deny;

  const supabase = createServiceClient();

  // Check if auto-send is enabled in automation_rules
  const { data: rule } = await supabase
    .from("automation_rules")
    .select("enabled")
    .eq("rule_key", "auto_publish_owner_soa")
    .maybeSingle();

  if (!rule?.enabled) {
    return NextResponse.json({ skipped: "Auto-send is disabled. Enable it in Admin → Automation to auto-publish approved SOAs." });
  }

  // Find approved owner SOAs from last month that haven't been touched today
  // (generated + AI-approved on the 1st; updated_at < today ensures 24h window)
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStart = prevMonth.toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const { data: ready } = await supabase
    .from("statements_of_account")
    .select("id")
    .eq("status", "approved")
    .eq("statement_type", "owner")
    .eq("period_start", prevMonthStart)
    .eq("payout_status", "pending")
    .lt("updated_at", today);

  const soaIds = ((ready ?? []) as { id: string }[]).map((r) => r.id);

  let published = 0;
  const errors: string[] = [];

  for (const soaId of soaIds) {
    const result = await runSoaPublishPipeline(supabase, soaId);
    if (result.ok) {
      published++;
      revalidatePath(`/admin/statements/${soaId}`);
      revalidatePath("/admin/statements");
      revalidatePath("/dashboard/owner");
    } else {
      errors.push(`${soaId}: ${result.error}`);
    }
  }

  const status = errors.length === 0 ? "success" : published > 0 ? "partial" : "failed";
  await logCronRun(supabase, "auto_publish_soa", {
    processed: soaIds.length,
    taken: published,
    errors: errors.length ? errors : undefined,
    status,
  });

  return NextResponse.json({ published, total: soaIds.length, errors });
}
