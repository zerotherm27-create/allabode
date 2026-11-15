import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCronSecret, logCronRun, ruleEnabled } from "@/lib/cron";
import { createNotification } from "@/lib/notify";

export const runtime = "nodejs";
export const maxDuration = 60;

const REMINDER_DAYS = [90, 60, 30];

type Lease = { id: string; end_date: string; tenant_id: string };

async function handle(req: NextRequest) {
  const deny = verifyCronSecret(req);
  if (deny) return deny;

  const supabase = createServiceClient();
  if (!(await ruleEnabled(supabase, "check_lease_expiry"))) {
    return NextResponse.json({ skipped: "Automation is off. Activate it in Admin → Automation." });
  }
  const today = new Date();
  let taken = 0; const errors: string[] = [];

  const { data: leases } = await supabase.from("leases")
    .select("id,end_date,tenant_id")
    .in("status", ["active", "renewal_pending"])
    .not("end_date", "is", null);

  for (const lease of (leases ?? []) as Lease[]) {
    const daysLeft = Math.ceil((new Date(lease.end_date).getTime() - today.getTime()) / 86400000);

    if (!REMINDER_DAYS.includes(daysLeft)) continue;

    const { data: tenantRow } = await supabase.from("tenants")
      .select("portal_user_id").eq("id", lease.tenant_id).maybeSingle();
    const userId = (tenantRow as { portal_user_id?: string } | null)?.portal_user_id;
    if (!userId) continue;

    try {
      await createNotification(supabase, {
        recipientUserId: userId,
        type:  "lease_expiring",
        title: `Your lease expires in ${daysLeft} days`,
        body:  `Your lease ends on ${lease.end_date}. Please contact All Abode to discuss renewal.`,
        link:  "/dashboard/tenant#lease",
        entityType: "lease",
        entityId:   lease.id,
      });
      taken++;
    } catch (e) {
      errors.push(`lease ${lease.id}: ${e}`);
    }
  }

  const status = errors.length === 0 ? "success" : taken > 0 ? "partial" : "failed";
  await logCronRun(supabase, "check_lease_expiry", { processed: leases?.length ?? 0, taken, errors, status });
  return NextResponse.json({ taken, errors });
}

// Vercel Cron calls with GET; POST stays for manual triggers.
export const GET = handle;
export const POST = handle;
