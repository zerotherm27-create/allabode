// Server-only: the public unsubscribe (link in every follow-up email). No
// login. Calls the unsubscribe_lead(uuid) RPC through the service client; the
// result says only "done", "invalid" or "error", never anything about the lead.
import { createServiceClient } from "@/lib/supabase/server";
import { parseToken } from "@/lib/nurture/message";

export type UnsubscribeResult = "done" | "invalid" | "error";

export async function unsubscribeByToken(raw: unknown): Promise<UnsubscribeResult> {
  const token = parseToken(raw);
  if (!token) return "invalid";
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return "error";
  try {
    const { data, error } = await createServiceClient().rpc("unsubscribe_lead", { p_token: token });
    if (error) {
      console.warn("[nurture:unsubscribe] rpc failed:", error.code ?? "unknown");
      return "error";
    }
    return data === true ? "done" : "invalid";
  } catch {
    return "error";
  }
}
