"use server";

import { unsubscribeByToken, type UnsubscribeResult } from "@/lib/nurture/unsubscribe";

export type UnsubscribeState = { result: UnsubscribeResult | null };

/** useActionState-shaped: the token comes from a hidden field. */
export async function confirmUnsubscribe(_prev: UnsubscribeState, formData: FormData): Promise<UnsubscribeState> {
  return { result: await unsubscribeByToken(formData.get("token")) };
}
