import type { PaymentProvider, CheckoutResult } from "./types";
import { createHmac, timingSafeEqual } from "crypto";

export class XenditProvider implements PaymentProvider {
  private readonly secretKey: string;
  private readonly webhookToken: string;
  private readonly baseUrl = "https://api.xendit.co";

  constructor(secretKey: string, webhookToken = "") {
    this.secretKey = secretKey;
    this.webhookToken = webhookToken;
  }

  private auth(): string {
    return "Basic " + Buffer.from(this.secretKey + ":").toString("base64");
  }

  async createCheckout(opts: {
    amount: number; currency: string; description: string;
    referenceId: string; returnUrl: string; cancelUrl: string;
  }): Promise<CheckoutResult> {
    const res = await fetch(`${this.baseUrl}/v2/invoices`, {
      method: "POST",
      headers: { Authorization: this.auth(), "Content-Type": "application/json" },
      body: JSON.stringify({
        external_id:    opts.referenceId,
        amount:         opts.amount,
        currency:       opts.currency,
        description:    opts.description,
        success_redirect_url: opts.returnUrl,
        failure_redirect_url: opts.cancelUrl,
      }),
    });
    if (!res.ok) throw new Error(`Xendit error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { id: string; invoice_url: string };
    return { checkoutId: data.id, checkoutUrl: data.invoice_url };
  }

  verifyWebhookSignature(rawBody: string, headers: Record<string, string | null>): boolean {
    if (!this.webhookToken) return true;
    const token = headers["x-callback-token"] ?? "";
    const expected = createHmac("sha256", this.webhookToken).update(rawBody).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  parseWebhookPayment(body: unknown) {
    const b = body as { id: string; status: string };
    const status: "succeeded" | "failed" | "cancelled" =
      b.status === "PAID" || b.status === "SETTLED" ? "succeeded" :
      b.status === "EXPIRED" ? "cancelled" : "failed";
    return { referenceId: b.id, status };
  }
}
