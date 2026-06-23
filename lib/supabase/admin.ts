import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for admin server actions.
 * Bypasses RLS — only use in server-side admin code, never in portal flows.
 * Requires SUPABASE_SERVICE_ROLE_KEY (server-only, never NEXT_PUBLIC_).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — add it to .env.local");
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
    if (payload.role !== "service_role") {
      throw new Error(`Wrong Supabase key: expected service_role but got role="${payload.role}" — copy the service_role key from Supabase dashboard → Project Settings → API`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Wrong Supabase key")) throw e;
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is malformed — it should be a JWT starting with eyJ");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${key}` } },
  });
}
