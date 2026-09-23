import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isGoogleAnalyticsConfigured } from "@/lib/google-analytics/client";
import { shapeGoogleAnalyticsSummary } from "@/lib/google-analytics/shape";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // Staff-only, same gate as /api/admin/analytics.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!isGoogleAnalyticsConfigured()) {
    return NextResponse.json({ error: "Google Analytics not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "7d";

  try {
    const summary = await shapeGoogleAnalyticsSummary(range);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GA4 query failed:", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
