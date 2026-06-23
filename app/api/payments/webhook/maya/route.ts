import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MayaProvider } from "@/lib/payments/maya";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secretKey = process.env.MAYA_SECRET_KEY;
  if (!secretKey) return new NextResponse("Not configured", { status: 503 });

  const rawBody = await req.text();
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return new NextResponse("Bad JSON", { status: 400 }); }

  const provider = new MayaProvider(secretKey);
  const { referenceId, status } = provider.parseWebhookPayment(body);

  return handleWebhook(rawBody, referenceId, status, "maya");
}

async function handleWebhook(
  rawBody: string,
  referenceId: string,
  status: "succeeded" | "failed" | "cancelled",
  providerName: string
) {
  const supabase = await createClient();

  const { data: intent } = await supabase.from("payment_intents")
    .select("id,invoice_id,tenant_id,amount")
    .eq("provider_reference", referenceId)
    .maybeSingle();

  if (!intent) return new NextResponse("Not found", { status: 404 });

  const pi = intent as { id: string; invoice_id: string | null; tenant_id: string; amount: number };

  await supabase.from("payment_intents").update({
    status,
    webhook_received_at: new Date().toISOString(),
    raw_webhook_json:    JSON.parse(rawBody),
  }).eq("id", pi.id);

  if (status === "succeeded" && pi.invoice_id) {
    const { data: inv } = await supabase.from("invoices")
      .select("total_amount,amount_paid").eq("id", pi.invoice_id).maybeSingle();

    if (inv) {
      const totalAmount = Number((inv as { total_amount: number }).total_amount);
      const amountPaid  = Number((inv as { amount_paid: number }).amount_paid) + Number(pi.amount);
      const newStatus   = amountPaid >= totalAmount ? "paid" :
                         amountPaid > 0 ? "partially_paid" : "issued";

      await supabase.from("invoices").update({
        amount_paid:  amountPaid,
        status:       newStatus,
      }).eq("id", pi.invoice_id);

      await supabase.from("payments").insert({
        lease_id:    (await supabase.from("invoices").select("lease_id").eq("id", pi.invoice_id).maybeSingle()).data?.lease_id ?? null,
        tenant_id:   pi.tenant_id,
        amount:      pi.amount,
        method:      providerName,
        status:      "completed",
        notes:       `Online payment via ${providerName} — ref: ${referenceId}`,
      });
    }
  }

  return NextResponse.json({ received: true });
}

export { handleWebhook };
