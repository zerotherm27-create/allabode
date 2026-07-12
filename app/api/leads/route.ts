import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { LEAD_TYPES, isTrustedOrigin, validateAndBuildRow, type LeadType } from "@/lib/leads/validate";
import { checkAndIncrement, rateLimitKeyFromRequest } from "@/lib/leads/rate-limit";
import { verifyTurnstile } from "@/lib/leads/turnstile";
import { LEAD_HONEYPOT_FIELD, LEAD_MIN_SUBMIT_MS } from "@/lib/leads/constants";

/**
 * Lead intake endpoint. Accepts inquiry / viewing / appraisal /
 * property-management / contact / list-property submissions and persists each
 * to its table (inquiries, appraisal_requests, property_management_leads).
 *
 * When Supabase env vars are absent the route validates and logs only, so the
 * UI flow works end-to-end in local/preview without a database.
 */

const MAX_BODY_BYTES = 15_000;

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const type = body.type as LeadType;
  if (!LEAD_TYPES.includes(type)) {
    return NextResponse.json({ error: "Unknown lead type." }, { status: 400 });
  }

  // Bot traps: fail silently so an automated client can't tell which check tripped.
  const tripped =
    Boolean(body[LEAD_HONEYPOT_FIELD]) ||
    (typeof body.elapsedMs === "number" && body.elapsedMs < LEAD_MIN_SUBMIT_MS);
  if (tripped) {
    console.info("[lead:blocked]", type);
    return NextResponse.json({ ok: true, persisted: false });
  }

  if (!isSupabaseConfigured()) {
    console.info("[lead:unpersisted]", type, { name: body.name, email: body.email });
    return NextResponse.json({ ok: true, persisted: false });
  }

  const supabase = await createClient();
  const rateLimitKey = rateLimitKeyFromRequest(request);
  const allowed = await checkAndIncrement(supabase, rateLimitKey);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const turnstileOk = await verifyTurnstile(body.turnstileToken, ip);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 403 });
  }

  const result = validateAndBuildRow(type, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { error } = await supabase.from(result.table).insert(result.row);
  if (error) {
    console.error("[lead:error]", type, error.message);
    return NextResponse.json(
      { error: "We couldn't submit your request. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, persisted: true });
}
