import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCronSecret, logCronRun } from "@/lib/cron";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAYS_AHEAD = 7;

type Plan = { id: string; title: string; property_id: string; unit_id: string | null; preferred_vendor_id: string | null };

export async function POST(req: NextRequest) {
  const deny = verifyCronSecret(req);
  if (deny) return deny;

  const supabase = await createClient();
  const today  = new Date();
  const cutoff = new Date(today.getTime() + DAYS_AHEAD * 86400000).toISOString().slice(0, 10);

  const { data: duePlans } = await supabase.from("maintenance_plans")
    .select("id,title,property_id,unit_id,preferred_vendor_id")
    .eq("is_active", true)
    .lte("next_due_at", cutoff)
    .not("next_due_at", "is", null);

  let taken = 0; let skipped = 0; const errors: string[] = [];

  for (const plan of (duePlans ?? []) as Plan[]) {
    const { count } = await supabase.from("work_orders")
      .select("id", { count: "exact", head: true })
      .eq("maintenance_plan_id", plan.id)
      .in("status", ["pending", "scheduled", "in_progress", "waiting_parts"]);

    if (count && count > 0) { skipped++; continue; }

    const { data: num } = await supabase.rpc("generate_work_order_number");
    if (!num) { errors.push(`plan ${plan.id}: no WO number`); continue; }

    const { error } = await supabase.from("work_orders").insert({
      work_order_number:   num,
      maintenance_plan_id: plan.id,
      property_id:         plan.property_id,
      unit_id:             plan.unit_id,
      vendor_id:           plan.preferred_vendor_id,
      title:               plan.title,
      priority:            "normal",
    });
    if (error) { errors.push(`plan ${plan.id}: ${error.message}`); continue; }
    taken++;
  }

  const status = errors.length === 0 ? "success" : taken > 0 ? "partial" : "failed";
  await logCronRun(supabase, "check_maintenance_due", { processed: duePlans?.length ?? 0, taken, errors: errors.length ? errors : undefined, status });
  return NextResponse.json({ created: taken, skipped, errors });
}
