import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ANALYTICS_COOKIE, analyticsCookieOptions } from "@/lib/analytics/session-cookie";
import { parseUserAgent } from "@/lib/analytics/ua";
import { geoFromHeaders } from "@/lib/analytics/geo";

/** Fired on mount + every route change by the client tracker. Mints a
 *  session on first visit, records a pageview, bumps the sliding cookie.
 *  Fully fault-tolerant — analytics must never break a real page load. */
export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return new NextResponse(null, { status: 204 });
    }

    const headerList = await headers();
    const ua = headerList.get("user-agent");
    const { isBot, deviceType, os, browser } = parseUserAgent(ua);
    if (isBot) return new NextResponse(null, { status: 204 });

    let body: { path?: string; referrer?: string; utmSource?: string };
    try {
      body = await request.json();
    } catch {
      return new NextResponse(null, { status: 204 });
    }
    const path = typeof body.path === "string" ? body.path.slice(0, 500) : "/";
    const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 500) || null : null;
    const utmSource = typeof body.utmSource === "string" ? body.utmSource.slice(0, 100) || null : null;

    const cookieStore = await cookies();
    const supabase = createServiceClient();
    const existingId = cookieStore.get(ANALYTICS_COOKIE)?.value ?? null;

    let sessionId = existingId;
    if (existingId) {
      const { data: existing } = await supabase
        .from("site_sessions")
        .select("id")
        .eq("id", existingId)
        .maybeSingle();
      if (!existing) sessionId = null;
    }

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      const { country, region, city } = geoFromHeaders(headerList);
      await supabase.from("site_sessions").insert({
        id: sessionId,
        landing_path: path,
        device_type: deviceType,
        os,
        browser,
        country,
        region,
        city,
        referrer,
        utm_source: utmSource,
      });
    } else {
      const { data: row } = await supabase
        .from("site_sessions")
        .select("created_at,page_count")
        .eq("id", sessionId)
        .maybeSingle();
      const now = new Date();
      const createdAt = row?.created_at ? new Date(row.created_at as string) : now;
      await supabase
        .from("site_sessions")
        .update({
          last_seen_at: now.toISOString(),
          duration_seconds: Math.max(0, Math.round((now.getTime() - createdAt.getTime()) / 1000)),
          page_count: ((row?.page_count as number) ?? 0) + 1,
        })
        .eq("id", sessionId);
    }

    await supabase.from("site_pageviews").insert({ session_id: sessionId, path });

    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(ANALYTICS_COOKIE, sessionId, analyticsCookieOptions());
    return response;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
