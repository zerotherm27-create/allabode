import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCronSecret, logCronRun } from "@/lib/cron";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const deny = verifyCronSecret(req);
  if (deny) return deny;

  const supabase = await createClient();
  const now   = new Date();
  const prev  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start = prev.toISOString().slice(0, 10);
  const end   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

  const { data: owners } = await supabase.from("owners").select("id");
  let taken = 0; const errors: string[] = [];

  for (const owner of (owners ?? []) as { id: string }[]) {
    // Skip if SOA for this period already exists
    const { count } = await supabase.from("statements_of_account")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", owner.id)
      .eq("period_start", start)
      .eq("statement_type", "owner");
    if (count && count > 0) continue;

    const { error } = await supabase.from("statements_of_account").insert({
      owner_id:       owner.id,
      statement_type: "owner",
      period_start:   start,
      period_end:     end,
      opening_balance:   0,
      closing_balance:   0,
      net_remittance:    0,
      gross_income:      0,
      total_deductions:  0,
      status:         "draft",
    });
    if (error) { errors.push(`owner ${owner.id}: ${error.message}`); continue; }
    taken++;
  }

  const status = errors.length === 0 ? "success" : taken > 0 ? "partial" : "failed";
  await logCronRun(supabase, "generate_owner_soa", { processed: owners?.length ?? 0, taken, errors: errors.length ? errors : undefined, status });
  return NextResponse.json({ created: taken, errors });
}
