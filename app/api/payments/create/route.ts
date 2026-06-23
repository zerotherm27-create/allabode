import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProvider } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { invoiceId } = (await req.json()) as { invoiceId?: string };
  if (!invoiceId) return new NextResponse("invoiceId required", { status: 400 });

  // Fetch invoice + verify tenant ownership (RLS enforces this)
  const { data: inv } = await supabase.from("invoices")
    .select("id,lease_id,tenant_id,total_amount,amount_paid,status,invoice_number")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!inv) return new NextResponse("Invoice not found", { status: 404 });
  const invoice = inv as {
    id: string; lease_id: string; tenant_id: string;
    total_amount: number; amount_paid: number; status: string; invoice_number: string;
  };

  if (!["issued", "partially_paid", "overdue"].includes(invoice.status)) {
    return NextResponse.json({ error: "Invoice is not payable" }, { status: 400 });
  }

  const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);
  if (balance <= 0) return NextResponse.json({ error: "Invoice already fully paid" }, { status: 400 });

  const origin   = req.nextUrl.origin;
  const returnUrl = `${origin}/dashboard/tenant/invoices/${invoiceId}/return`;
  const cancelUrl = `${origin}/dashboard/tenant/invoices/${invoiceId}`;

  let provider;
  let checkoutId: string, checkoutUrl: string;

  try {
    provider = getProvider();
    const result = await provider.createCheckout({
      amount:      balance,
      currency:    "PHP",
      description: `${invoice.invoice_number} — All Abode Property Solutions`,
      referenceId: `${invoiceId}-${Date.now()}`,
      returnUrl,
      cancelUrl,
    });
    checkoutId  = result.checkoutId;
    checkoutUrl = result.checkoutUrl;
  } catch (e) {
    console.error("[payments/create] provider error:", e);
    return NextResponse.json({ error: "Payment provider unavailable" }, { status: 503 });
  }

  const providerName = process.env.PAYMENT_PROVIDER ?? "maya";

  const { error } = await supabase.from("payment_intents").insert({
    provider:           providerName,
    provider_reference: checkoutId,
    invoice_id:         invoiceId,
    lease_id:           invoice.lease_id,
    tenant_id:          invoice.tenant_id,
    amount:             balance,
    currency:           "PHP",
    checkout_url:       checkoutUrl,
    return_url:         returnUrl,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ checkoutUrl });
}
