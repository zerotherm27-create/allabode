import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { linkAndGetPortalRole } from "@/lib/auth/role";
import { resolvePostAuthRedirect } from "@/lib/auth/destination";

/**
 * Handles Supabase auth callbacks (email confirmation, OAuth, magic links).
 * Exchanges the PKCE code for a session, then immediately calls
 * link_portal_account so the user lands on their dashboard rather than the
 * "Account pending" screen.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  if (code || tokenHash) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash!,
          type: (type ?? "signup") as EmailOtpType,
        });

    if (!error) {
      // Use linkAndGetPortalRole so owner/tenant are checked before staff —
      // the link_portal_account RPC checks public.users first and would send
      // owners/tenants with a staff UUID straight to /admin.
      const { role, redirect: dest } = await linkAndGetPortalRole();
      const destination = resolvePostAuthRedirect(role, next, dest);
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/portal/login?error=link_expired`);
}
