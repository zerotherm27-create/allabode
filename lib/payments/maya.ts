import type { PaymentProvider, CheckoutResult } from "./types";
import { timingSafeEqual } from "crypto";

export class MayaProvider implements PaymentProvider {
  private readonly secretKey: string;
  private readonly baseUrl = "https://pg.paymaya.com";

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  private auth(): string {
    return "Basic " + Buffer.from(this.secretKey + ":").toString("base64");
  }

  async createCheckout(opts: {
    amount: number; currency: string; description: string;
    referenceId: string; returnUrl: string; cancelUrl: string;
  }): Promise<CheckoutResult> {
    const res = await fetch(`${this.baseUrl}/checkout/v1/checkouts`, {
      method: "POST",
      headers: { Authorization: this.auth(), "Content-Type": "application/json" },
      body: JSON.stringify({
        totalAmount:    { value: opts.amount, currency: opts.currency },
        requestReferenceNumber: opts.referenceId,
        metadata:       { description: opts.description },
        redirectUrl:    { success: opts.returnUrl, failure: opts.cancelUrl, cancel: opts.cancelUrl },
      }),
    });
    if (!res.ok) throw new Error(`Maya error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { checkoutId: string; redirectUrl: string };
    return { checkoutId: data.checkoutId, checkoutUrl: data.redirectUrl };
  }

  verifyWebhookSignature(_rawBody: string, headers: Record<string, string | null>): boolean {
    // Maya has no signature scheme — webhook auth is HTTP Basic Auth, configured by
    // embedding credentials in the callback URL registered in the Maya dashboard
    // (https://user:pass@yourdomain.com/api/payments/webhook/maya). Fails open (same
    // posture as XenditProvider's optional webhook token) until both env vars are set,
    // so this doesn't block webhooks before the dashboard side is configured.
    const username = process.env.MAYA_WEBHOOK_USERNAME;
    const password = process.env.MAYA_WEBHOOK_PASSWORD;
    if (!username || !password) return true;

    const expected = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
    const actual = headers["authorization"] ?? "";
    try {
      return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  parseWebhookPayment(body: unknown) {
    const b = body as { id: string; status: string };
    const status: "succeeded" | "failed" | "cancelled" =
      b.status === "PAYMENT_SUCCESS" ? "succeeded" :
      b.status === "PAYMENT_FAILED"  ? "failed" : "cancelled";
    return { referenceId: b.id, status };
  }
}
