import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCronSecret, logCronRun } from "@/lib/cron";
import { OPEN_STATUSES } from "@/lib/tickets";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const deny = verifyCronSecret(req);
  if (deny) return deny;

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: breached } = await supabase.from("tickets")
    .select("id")
    .in("status", OPEN_STATUSES.filter((s) => s !== "escalated"))
    .lt("sla_due_at", now)
    .not("sla_due_at", "is", null);

  let taken = 0; const errors: string[] = [];

  for (const t of (breached ?? []) as { id: string }[]) {
    const { error } = await supabase.from("tickets")
      .update({ status: "escalated" })
      .eq("id", t.id);
    if (error) { errors.push(`ticket ${t.id}: ${error.message}`); }
    else taken++;
  }

  const status = errors.length === 0 ? "success" : taken > 0 ? "partial" : "failed";
  await logCronRun(supabase, "check_ticket_slas", { processed: breached?.length ?? 0, taken, errors, status });
  return NextResponse.json({ escalated: taken, errors });
}
