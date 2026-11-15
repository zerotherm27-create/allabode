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

/** Layered limits, all on the same RPC (different keys), cheapest-to-hit first. */
export const CHAT_LIMITS = [
  { prefix: "burst", limit: 5, windowMinutes: 1, message: "You're sending messages too quickly — please wait a few seconds." },
  { prefix: "ip", limit: CHAT_RATE_LIMIT_PER_WINDOW, windowMinutes: CHAT_RATE_LIMIT_WINDOW_MINUTES, message: "You're sending messages too quickly — please wait a bit and try again." },
  { prefix: "day", limit: 100, windowMinutes: 1440, message: "Daily chat limit reached. Please use the inquiry form or contact us directly." },
] as const;
/** Site-wide ceiling so a distributed abuser can't run up the OpenAI bill. */
export const CHAT_GLOBAL_DAILY_LIMIT = 3000;

export type ChatLimitResult = { allowed: true } | { allowed: false; message: string };

export async function checkChatLimits(supabase: SupabaseClient, key: string): Promise<ChatLimitResult> {
  for (const l of CHAT_LIMITS) {
    const ok = await rpcCheck(supabase, `${l.prefix}:${key}`, l.limit, l.windowMinutes);
    if (!ok) return { allowed: false, message: l.message };
  }
  const globalOk = await rpcCheck(supabase, "global:chat", CHAT_GLOBAL_DAILY_LIMIT, 1440);
  if (!globalOk) {
    return { allowed: false, message: "The assistant is busy right now. Please use the inquiry form or contact us directly." };
  }
  return { allowed: true };
}

async function rpcCheck(supabase: SupabaseClient, key: string, limit: number, windowMinutes: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("chat_rate_limit_check", {
    p_key: key,
    p_limit: limit,
    p_window_minutes: windowMinutes,
  });
  if (error) return true; // fail open — a broken rate limiter shouldn't take down the chatbot
  return data === true;
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
