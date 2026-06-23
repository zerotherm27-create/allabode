import type { PaymentProvider } from "./types";
import { MayaProvider } from "./maya";
import { XenditProvider } from "./xendit";

export function getProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "maya";
  if (name === "xendit") {
    const key = process.env.XENDIT_SECRET_KEY;
    if (!key) throw new Error("XENDIT_SECRET_KEY is not set");
    return new XenditProvider(key, process.env.XENDIT_WEBHOOK_TOKEN ?? "");
  }
  // default: maya
  const key = process.env.MAYA_SECRET_KEY;
  if (!key) throw new Error("MAYA_SECRET_KEY is not set");
  return new MayaProvider(key);
}

export { type PaymentProvider, type CheckoutResult } from "./types";
