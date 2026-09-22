import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ANALYTICS_COOKIE, analyticsCookieOptions } from "@/lib/analytics/session-cookie";

/** Fired every ~15s while the tab is visible, plus once on pagehide, via
 *  navigator.sendBeacon. Only bumps last_seen_at/duration for a session that
 *  already exists — never mints a new one. Fault-tolerant: always 204s. */
export async function POST() {
  try {
    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return new NextResponse(null, { status: 204 });
    }

    const cookieStore = await cookies();
    const sessionId = cookieStore.get(ANALYTICS_COOKIE)?.value ?? null;
    if (!sessionId) return new NextResponse(null, { status: 204 });

    const supabase = createServiceClient();
    const { data: row } = await supabase
      .from("site_sessions")
      .select("created_at")
      .eq("id", sessionId)
      .maybeSingle();
    if (!row) return new NextResponse(null, { status: 204 });

    const now = new Date();
    const createdAt = new Date(row.created_at as string);
    await supabase
      .from("site_sessions")
      .update({
        last_seen_at: now.toISOString(),
        duration_seconds: Math.max(0, Math.round((now.getTime() - createdAt.getTime()) / 1000)),
      })
      .eq("id", sessionId);

    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(ANALYTICS_COOKIE, sessionId, analyticsCookieOptions());
    return response;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
