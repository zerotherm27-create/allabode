export interface CheckoutResult {
  checkoutId: string;
  checkoutUrl: string;
}

export interface PaymentProvider {
  createCheckout(opts: {
    amount: number;
    currency: string;
    description: string;
    referenceId: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutResult>;

  verifyWebhookSignature(rawBody: string, headers: Record<string, string | null>): boolean;
  parseWebhookPayment(body: unknown): { referenceId: string; status: "succeeded" | "failed" | "cancelled" };
}
