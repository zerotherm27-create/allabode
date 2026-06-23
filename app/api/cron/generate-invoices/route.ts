import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCronSecret, logCronRun } from "@/lib/cron";

export const runtime = "nodejs";
export const maxDuration = 60;

type Lease = {
  id: string; rent_amount: number; billing_cycle: string;
  tenant_id: string; unit_id: string; property_id: string; owner_id: string | null;
};

export async function POST(req: NextRequest) {
  const deny = verifyCronSecret(req);
  if (deny) return deny;

  const supabase = await createClient();
  const today = new Date();
  const billingStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const billingEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const dueDate      = new Date(today.getFullYear(), today.getMonth() + 1, 5).toISOString().slice(0, 10);

  const { data: leases } = await supabase
    .from("leases")
    .select("id,rent_amount,billing_cycle,tenant_id,unit_id,property_id,owner_id")
    .in("status", ["active", "renewal_pending"]);

  let created = 0; let skipped = 0; const errors: string[] = [];

  for (const lease of (leases ?? []) as Lease[]) {
    // Check if invoice for this billing period already exists
    const { count } = await supabase.from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("lease_id", lease.id)
      .eq("billing_period_start", billingStart);
    if (count && count > 0) { skipped++; continue; }

    const { data: num } = await supabase.rpc("generate_invoice_number");
    if (!num) { errors.push(`lease ${lease.id}: no invoice number`); continue; }

    const amount = Number(lease.rent_amount);
    const { error } = await supabase.from("invoices").insert({
      invoice_number:       num,
      lease_id:             lease.id,
      tenant_id:            lease.tenant_id,
      unit_id:              lease.unit_id,
      property_id:          lease.property_id,
      owner_id:             lease.owner_id,
      billing_period_start: billingStart,
      billing_period_end:   billingEnd,
      due_date:             dueDate,
      subtotal:             amount,
      total_amount:         amount,
    });
    if (error) { errors.push(`lease ${lease.id}: ${error.message}`); continue; }

    created++;
  }

  const status = errors.length === 0 ? "success" : created > 0 ? "partial" : "failed";
  await logCronRun(supabase, "generate_invoices", { processed: (leases?.length ?? 0), taken: created, errors, status });

  return NextResponse.json({ created, skipped, errors });
}
