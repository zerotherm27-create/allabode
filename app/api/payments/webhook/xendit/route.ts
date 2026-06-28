import { NextResponse, type NextRequest } from "next/server";
import { XenditProvider } from "@/lib/payments/xendit";
import { handleWebhook } from "@/app/api/payments/webhook/handle-webhook";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) return new NextResponse("Not configured", { status: 503 });

  const rawBody = await req.text();
  const headers: Record<string, string | null> = {
    "x-callback-token": req.headers.get("x-callback-token"),
  };

  const provider = new XenditProvider(secretKey, process.env.XENDIT_WEBHOOK_TOKEN ?? "");
  if (!provider.verifyWebhookSignature(rawBody, headers)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return new NextResponse("Bad JSON", { status: 400 }); }

  const { referenceId, status } = provider.parseWebhookPayment(body);
  return handleWebhook(rawBody, referenceId, status, "xendit");
}
