import { NextResponse } from "next/server";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { aggregateAnalytics, type PageviewRow, type SessionRow } from "@/lib/analytics/aggregate";

const RANGE_DAYS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  // Staff-only: site_sessions/site_pageviews carry no anon RLS policy, so
  // reads go through the service-role client, gated by this explicit check.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Analytics not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "7d";
  const days = RANGE_DAYS[range] ?? RANGE_DAYS["7d"];

  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  rangeStart.setUTCHours(0, 0, 0, 0);

  const admin = createServiceClient();
  const [sessionsRes, pageviewsRes] = await Promise.all([
    admin
      .from("site_sessions")
      .select(
        "id,created_at,last_seen_at,duration_seconds,landing_path,page_count,device_type,os,browser,country,region,city,referrer,utm_source"
      )
      .gte("created_at", rangeStart.toISOString()),
    admin
      .from("site_pageviews")
      .select("session_id,path,occurred_at")
      .gte("occurred_at", rangeStart.toISOString()),
  ]);

  if (sessionsRes.error || pageviewsRes.error) {
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const summary = aggregateAnalytics(
    (sessionsRes.data ?? []) as SessionRow[],
    (pageviewsRes.data ?? []) as PageviewRow[],
    rangeStart,
    rangeEnd
  );

  return NextResponse.json(summary);
}
