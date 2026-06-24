import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MayaProvider } from "@/lib/payments/maya";
import { XenditProvider } from "@/lib/payments/xendit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json() as { soa_id?: string };
  const { soa_id } = body;
  if (!soa_id) return NextResponse.json({ error: "soa_id required" }, { status: 400 });

  const { data: soa } = await supabase.from("statements_of_account").select("*").eq("id", soa_id).maybeSingle();
  if (!soa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payout = Number(soa.closing_balance ?? soa.net_remittance ?? 0);
  if (payout >= 0) return NextResponse.json({ error: "Payout is not negative — no payment required" }, { status: 400 });

  const { data: owner } = await supabase.from("owners").select("id,email,name").eq("id", soa.owner_id).maybeSingle();
  if (!owner) return NextResponse.json({ error: "Owner not found" }, { status: 404 });

  const ownerEmail = (owner as { email?: string | null }).email ?? "";
  if (!ownerEmail || ownerEmail.toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const amount = Math.abs(payout);
  const description = `SOA balance — ${soa.period_start} to ${soa.period_end}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const { data: intent, error: intentErr } = await supabase.from("payment_intents").insert({
    amount,
    currency:     "PHP",
    status:       "pending",
    description,
    owner_id:     soa.owner_id,
    statement_id: soa_id,
    provider:     process.env.PAYMENT_PROVIDER ?? "maya",
    metadata:     { soa_id },
  }).select("id").single();

  if (intentErr || !intent) {
    return NextResponse.json({ error: intentErr?.message ?? "Failed to create intent" }, { status: 500 });
  }

  const returnUrl = `${siteUrl}/dashboard/owner/invoices/${soa_id}/pay/return?intent=${intent.id}`;
  const cancelUrl = `${siteUrl}/dashboard/owner`;

  let checkoutUrl: string;
  const provider = process.env.PAYMENT_PROVIDER ?? "maya";

  try {
    if (provider === "xendit") {
      const secretKey = process.env.XENDIT_SECRET_KEY ?? "";
      const adapter = new XenditProvider(secretKey);
      const result = await adapter.createCheckout({
        amount,
        currency:    "PHP",
        description,
        referenceId: intent.id,
        returnUrl,
        cancelUrl,
      });
      checkoutUrl = result.checkoutUrl;
    } else {
      const secretKey = process.env.MAYA_SECRET_KEY ?? "";
      const adapter = new MayaProvider(secretKey);
      const result = await adapter.createCheckout({
        amount,
        currency:    "PHP",
        description,
        referenceId: intent.id,
        returnUrl,
        cancelUrl,
      });
      checkoutUrl = result.checkoutUrl;
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Provider error" }, { status: 502 });
  }

  await supabase.from("payment_intents").update({ provider_ref: checkoutUrl }).eq("id", intent.id);
  return NextResponse.json({ checkoutUrl, intentId: intent.id });
}
