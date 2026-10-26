import { NextResponse, after } from "next/server";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { LEAD_TYPES, isTrustedOrigin, validateAndBuildRow, type LeadType } from "@/lib/leads/validate";
import { checkAndIncrement, rateLimitKeyFromRequest } from "@/lib/leads/rate-limit";
import { verifyTurnstile } from "@/lib/leads/turnstile";
import { LEAD_HONEYPOT_FIELD, LEAD_MIN_SUBMIT_MS } from "@/lib/leads/constants";
import {
  buildSpecialistLeadEmail,
  tagSpecialistInquiry,
  type VerifiedSpecialist,
} from "@/lib/leads/specialist-lead";
import {
  isInputError,
  listingRpcArgs,
  parseFollowupConsent,
  planIntake,
  specialistRpcArgs,
} from "@/lib/leads/intake";
import { getPublicSpecialist } from "@/lib/team/public-queries";
import { getSpecialistLeadEmail } from "@/lib/team/lead-recipient";
import { sendEmail } from "@/lib/email";
import { enrolLead } from "@/lib/nurture/enrol";
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
  const honeypotTripped = Boolean(body[LEAD_HONEYPOT_FIELD]);
  const tooFast = typeof body.elapsedMs === "number" && body.elapsedMs < LEAD_MIN_SUBMIT_MS;
  if (honeypotTripped || tooFast) {
    // Which trap fired (never the values) so a wrongly blocked visitor can be diagnosed.
    console.info("[lead:blocked]", type, honeypotTripped ? "honeypot" : `too-fast(${body.elapsedMs}ms)`);
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
  const plan = type === "inquiry" || type === "viewing" ? planIntake(type, body) : { kind: "plain" as const };
  const consent = parseFollowupConsent(body);

  // Preferred path: the service-role-only database functions store consent and
  // assign the lead. Runs only after the origin / Turnstile / rate-limit /
  // validation checks above. NULL or any non-input failure falls through to the
  // plain insert below so a lead is never lost (it just gets no consent or owner).
  let stored = false;
  if (plan.kind !== "plain" && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const service = createServiceClient();
      const { data, error: rpcError } =
        plan.kind === "specialist"
          ? await service.rpc("create_specialist_inquiry", specialistRpcArgs(row, plan.slug, plan.listingId, consent))
          : await service.rpc("create_listing_inquiry", listingRpcArgs(row, plan.listingId, plan.type, consent));
      if (rpcError) {
        if (isInputError(rpcError)) {
          return NextResponse.json({ error: rpcError.message }, { status: 422 });
        }
        console.error("[lead:rpc-error]", type, rpcError.message);
      } else if (typeof data === "string" && data) {
        stored = true;
        // Follow-up emails: only leads stored by the intake functions, after the
        // checks above. enrolLead never throws and checks assignment + consent.
        const inquiryId = data;
        after(() => enrolLead(inquiryId));
        specialist =
          plan.kind === "specialist"
            ? await lookupVerified(plan.slug)
            : await lookupAssignedSpecialist(service, data);
        if (specialist) {
          row = tagSpecialistInquiry(row, specialist);
        }
      }
    } catch {
      console.error("[lead:rpc-error]", type, "unexpected failure");
    }
  }

  if (!stored) {
    // Fallback: anon insert. No consent flag or assignment (the database forces
    // consent false for this path); the specialist is still tagged in `details`.
    const slug = plan.kind === "specialist" ? plan.slug : null;
    if (slug) {
      specialist = await lookupVerified(slug);
      if (specialist) row = tagSpecialistInquiry(row, specialist);
    }
    const { error } = await supabase.from(result.table).insert(row);
    if (error) {
      console.error("[lead:error]", type, error.message);
      return NextResponse.json(
        { error: "We couldn't submit your request. Please try again." },
        { status: 500 }
      );
    }
  }

  if (specialist) {
    const notified = specialist;
    const lead = row;
    after(() => notifySpecialistLead(notified, lead));
  }

  return NextResponse.json({ ok: true, persisted: true });
}

async function lookupVerified(slug: string): Promise<VerifiedSpecialist | null> {
  const found = await getPublicSpecialist(slug);
  return found ? { slug: found.slug, name: found.name } : null;
}

/** The specialist a just-stored listing lead was assigned to (by the database), for the notification. */
async function lookupAssignedSpecialist(
  service: ReturnType<typeof createServiceClient>,
  inquiryId: string,
): Promise<VerifiedSpecialist | null> {
  try {
    const { data: lead } = await service.from("inquiries").select("specialist_id").eq("id", inquiryId).maybeSingle();
    const sid = (lead as { specialist_id: string | null } | null)?.specialist_id;
    if (!sid) return null;
    const { data: sp } = await service
      .from("specialists")
      .select("subdomain,display_name")
      .eq("id", sid)
      .eq("status", "approved")
      .maybeSingle();
    const r = sp as { subdomain: string | null; display_name: string | null } | null;
    return r?.subdomain && r.display_name ? { slug: r.subdomain, name: r.display_name } : null;
  } catch {
    return null;
  }
}

/** Emails the specialist (looked up server-side) and the company inbox. Never throws. */
async function notifySpecialistLead(specialist: VerifiedSpecialist, row: Record<string, unknown>) {
  try {
    const [specialistEmail, settings] = await Promise.all([
      getSpecialistLeadEmail(specialist.slug),
      getSettings(),
    ]);
    const companyEmail = s(settings, "contact_email").trim() || site.email;
    let adminUrl: string | null = null;
    try {
      adminUrl = new URL("/admin/inquiries", getPublicSiteUrl()).toString();
    } catch {
      adminUrl = null;
    }
    const base = {
      specialistName: specialist.name,
      name: String(row.name ?? ""),
      email: String(row.email ?? ""),
      phone: typeof row.phone === "string" ? row.phone : null,
      message: typeof row.message === "string" ? row.message : null,
      adminUrl,
    };
    // Company first (main recipient), then a copy to the specialist.
    const companyMail = buildSpecialistLeadEmail({ ...base, audience: "company" });
    await sendEmail({ to: companyEmail, subject: companyMail.subject, html: companyMail.html });
    if (specialistEmail && specialistEmail.toLowerCase() !== companyEmail.toLowerCase()) {
      const copy = buildSpecialistLeadEmail({ ...base, audience: "specialist" });
      await sendEmail({ to: specialistEmail, subject: copy.subject, html: copy.html });
    }
  } catch {
    console.warn("[lead:notify] specialist notification failed");
  }
}
