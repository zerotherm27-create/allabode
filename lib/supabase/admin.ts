import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for admin server actions.
 * Bypasses RLS — only use in server-side admin code, never in portal flows.
 * Requires SUPABASE_SERVICE_ROLE_KEY (server-only, never NEXT_PUBLIC_).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key, { auth: { persistSession: false } });
}
