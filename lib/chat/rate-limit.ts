import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const CHAT_RATE_LIMIT_PER_WINDOW = 20;
export const CHAT_RATE_LIMIT_WINDOW_MINUTES = 15;

/**
 * IP-based limiting is an acknowledged MVP gap (shared NAT/VPNs share a
 * bucket) — the pragmatic stopgap for a public, AI-cost-bearing endpoint
 * with no auth. Revisit only if actually abused.
 */
export function rateLimitKeyFromRequest(req: Request): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

/** Atomic check-and-increment via a SECURITY DEFINER RPC — safe to call from an unauthenticated route. */
export async function checkAndIncrement(supabase: SupabaseClient, key: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("chat_rate_limit_check", {
    p_key: key,
    p_limit: CHAT_RATE_LIMIT_PER_WINDOW,
    p_window_minutes: CHAT_RATE_LIMIT_WINDOW_MINUTES,
  });
  if (error) return true; // fail open — a broken rate limiter shouldn't take down the chatbot
  return data === true;
}
