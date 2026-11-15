import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for admin server actions.
 * Bypasses RLS — only use in server-side admin code, never in portal flows.
 * Requires SUPABASE_SERVICE_ROLE_KEY (server-only, never NEXT_PUBLIC_).
 *
 * Accepts either key format Supabase issues:
 *  - a secret key (`sb_secret_...`), which is not a JWT: it goes in the apikey
 *    header only (supabase-js does that itself) and must not be sent as a
 *    Bearer token;
 *  - a legacy service_role JWT (`eyJ...`), checked for the right role and sent
 *    as the Bearer token as before. Supabase is retiring these.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error(`SUPABASE_SERVICE_ROLE_KEY is not configured (url=${!!url} key=${!!key}) — add it to Vercel env vars for Production`);

  const options = { auth: { persistSession: false, autoRefreshToken: false } };

  if (key.startsWith("sb_secret_")) {
    return createClient(url, key, options);
  }
  if (key.startsWith("sb_publishable_")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY holds a publishable key — use the secret key (sb_secret_...) from Supabase dashboard → Project Settings → API Keys");
  }

  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
    if (payload.role !== "service_role") {
      throw new Error(`Wrong Supabase key: expected service_role but got role="${payload.role}" — copy the service_role key from Supabase dashboard → Project Settings → API`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Wrong Supabase key")) throw e;
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is malformed — it should be a secret key starting with sb_secret_ (or a legacy JWT starting with eyJ)");
  }
  return createClient(url, key, {
    ...options,
    global: { headers: { Authorization: `Bearer ${key}` } },
  });
}
