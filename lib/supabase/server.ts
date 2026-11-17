import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** True when Supabase env vars are present. Lets routes degrade gracefully. */
export function isSupabaseConfigured() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Server Supabase client bound to the request cookies (anon key + session).
 * Use in route handlers, server components, and server actions.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore when middleware
            // is responsible for refreshing the session.
          }
        },
      },
    }
  );
}

/**
 * Service-role Supabase client — bypasses RLS.
 * Use ONLY in cron/system routes where no user session is available.
 * Never use in user-facing server actions.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Cookieless anon client for public, token-gated flows (e-signature pages).
 * It never sends a user session, so a stale or rotated-key admin cookie in the
 * same browser can't make a valid signing link look expired. The token RPCs it
 * calls are SECURITY DEFINER and validate the token themselves.
 */
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
