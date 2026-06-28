import { NextResponse, type NextRequest } from "next/server";
import { MayaProvider } from "@/lib/payments/maya";
import { handleWebhook } from "@/app/api/payments/webhook/handle-webhook";

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
