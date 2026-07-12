import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const LEAD_RATE_LIMIT_PER_WINDOW = 8;
export const LEAD_RATE_LIMIT_WINDOW_MINUTES = 30;

/**
 * IP-based limiting is an acknowledged MVP gap (shared NAT/VPNs share a
 * bucket) — the pragmatic stopgap for a public, unauthenticated endpoint.
 * Mirrors lib/chat/rate-limit.ts, kept as a separate table/RPC so lead-spam
 * telemetry doesn't mix with chat-cost telemetry.
 */
export function rateLimitKeyFromRequest(req: Request): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

/** Atomic check-and-increment via a SECURITY DEFINER RPC — safe to call from an unauthenticated route. */
export async function checkAndIncrement(supabase: SupabaseClient, key: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("lead_rate_limit_check", {
    p_key: key,
    p_limit: LEAD_RATE_LIMIT_PER_WINDOW,
    p_window_minutes: LEAD_RATE_LIMIT_WINDOW_MINUTES,
  });
  if (error) return true; // fail open — a broken rate limiter shouldn't block real leads
  return data === true;
}
