import { NextResponse, after } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { LEAD_TYPES, isTrustedOrigin, validateAndBuildRow, type LeadType } from "@/lib/leads/validate";
import { checkAndIncrement, rateLimitKeyFromRequest } from "@/lib/leads/rate-limit";
import { verifyTurnstile } from "@/lib/leads/turnstile";
import { LEAD_HONEYPOT_FIELD, LEAD_MIN_SUBMIT_MS } from "@/lib/leads/constants";
import {
  buildSpecialistLeadEmail,
  parseSpecialistSlug,
  tagSpecialistInquiry,
  type VerifiedSpecialist,
} from "@/lib/leads/specialist-lead";
import { getPublicSpecialist } from "@/lib/team/public-queries";
import { getSpecialistLeadEmail } from "@/lib/team/lead-recipient";
import { sendEmail } from "@/lib/email";
import { getSettings, s } from "@/lib/settings";
import { site } from "@/lib/site";
import { getPublicSiteUrl } from "@/lib/url";

/**
 * Lead intake endpoint. Accepts inquiry / viewing / appraisal /
 * property-management / contact / list-property submissions and persists each
 * to its table (inquiries, appraisal_requests, property_management_leads).
 *
 * When Supabase env vars are absent the route validates and logs only, so the
 * UI flow works end-to-end in local/preview without a database.
 *
 * An `inquiry` carrying a `specialist` slug (the microsite contact form) is
 * tagged with that specialist only after the slug is verified against the
 * public_specialists view; an unknown slug is ignored (plain inquiry). After
 * the insert, a best-effort notification goes to the specialist and the
 * company inbox via after(), so email can never delay or fail the response.
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

  let row = result.row;
  let specialist: VerifiedSpecialist | null = null;
  const specialistSlug = type === "inquiry" ? parseSpecialistSlug(body.specialist) : null;
  if (specialistSlug) {
    const found = await getPublicSpecialist(specialistSlug);
    if (found) {
      specialist = { slug: found.slug, name: found.name };
      row = tagSpecialistInquiry(row, specialist);
    }
  }

  const { error } = await supabase.from(result.table).insert(row);
  if (error) {
    console.error("[lead:error]", type, error.message);
    return NextResponse.json(
      { error: "We couldn't submit your request. Please try again." },
      { status: 500 }
    );
  }

  if (specialist) {
    const notified = specialist;
    const lead = row;
    after(() => notifySpecialistLead(notified, lead));
  }

  return NextResponse.json({ ok: true, persisted: true });
}

/** Emails the specialist (looked up server-side) and the company inbox. Never throws. */
async function notifySpecialistLead(specialist: VerifiedSpecialist, row: Record<string, unknown>) {
  try {
    const [specialistEmail, settings] = await Promise.all([
      getSpecialistLeadEmail(specialist.slug),
      getSettings(),
    ]);
    const companyEmail = s(settings, "contact_email").trim() || site.email;
    const recipients = [...new Set([specialistEmail, companyEmail].filter((e): e is string => !!e).map((e) => e.toLowerCase()))];
    let adminUrl: string | null = null;
    try {
      adminUrl = new URL("/admin/inquiries", getPublicSiteUrl()).toString();
    } catch {
      adminUrl = null;
    }
    const { subject, html } = buildSpecialistLeadEmail({
      specialistName: specialist.name,
      name: String(row.name ?? ""),
      email: String(row.email ?? ""),
      phone: typeof row.phone === "string" ? row.phone : null,
      message: typeof row.message === "string" ? row.message : null,
      adminUrl,
    });
    await Promise.all(recipients.map((to) => sendEmail({ to, subject, html })));
  } catch {
    console.warn("[lead:notify] specialist notification failed");
  }
}
