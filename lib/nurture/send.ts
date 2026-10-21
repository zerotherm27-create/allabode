// Server-only: the one send path for follow-up emails, shared by the daily
// cron (/api/cron/send-lead-followups) and the immediate day-0 send after
// enrolment (lib/nurture/enrol.ts). Uses the service-role client.
//
// Every stop rule is re-checked against fresh rows right before each send,
// so a lead that progressed, unsubscribed, was suppressed, lost its
// specialist, or whose template / preference was switched off gets nothing.
//
// Flags (lib/nurture/schedule.ts nurtureMode):
//   NURTURE_DRY_RUN=true  -> nothing is sent and NO row is changed; the plan of
//                            what would go out is logged and returned.
//   NURTURE_ENABLED=true  -> live sending.
//   otherwise             -> disabled: rows stay queued, nothing is read.
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmailResult } from "@/lib/email";
import { formatFromAddress } from "@/lib/email-address";
import { getSettings, s } from "@/lib/settings";
import { site } from "@/lib/site";
import { getPublicSiteUrl } from "@/lib/url";
import { firstName, renderTemplate, type TemplateVars } from "@/lib/nurture/render";
import {
  afterFailure,
  checkEligibility,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_RUN_CAP,
  normalizeAudience,
  nurtureMode,
  type NurtureMode,
} from "@/lib/nurture/schedule";
import {
  buildFollowupMessage,
  clip,
  maskEmail,
  NURTURE_FROM_ADDRESS,
  unsubscribeUrls,
} from "@/lib/nurture/message";

/** How long a claimed row is hidden from other runs while it is being sent. */
const CLAIM_LEASE_MS = 15 * 60_000;

type SendRow = {
  id: string;
  inquiry_id: string;
  template_id: string;
  due_at: string;
  attempts: number;
};

type TemplateRow = {
  id: string;
  template_key: string;
  subject: string;
  body: string;
  is_active: boolean | null;
  audience: string | null;
};

type LeadRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  lead_stage: string | null;
  consent_followup: boolean | null;
  unsubscribed_at: string | null;
  unsub_token: string | null;
  specialist_id: string | null;
  listing_id: string | null;
};

type SpecialistRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  subdomain: string | null;
  is_visible: boolean | null;
};

type SettingsRow = { followups_enabled: boolean | null; personal_note: string | null };
type PrefRow = { enabled: boolean | null };

export type PlannedEmail = {
  sendId: string;
  templateKey: string;
  audience: "lead" | "specialist";
  to: string; // masked
  subject: string;
  dueAt: string;
};

export type SendSummary = {
  mode: NurtureMode;
  considered: number;
  sent: number;
  skipped: number;
  failed: number;
  retrying: number;
  errors: string[];
  /** Dry run: what would go out. */
  plan: PlannedEmail[];
  skips: { sendId: string; reason: string }[];
};

export type SendOptions = {
  limit?: number;
  /** Only these send rows (the day-0 send right after enrolment). */
  ids?: string[];
  maxAttempts?: number;
  now?: Date;
  env?: { NURTURE_ENABLED?: string; NURTURE_DRY_RUN?: string };
};

function emptySummary(mode: NurtureMode): SendSummary {
  return { mode, considered: 0, sent: 0, skipped: 0, failed: 0, retrying: 0, errors: [], plan: [], skips: [] };
}

/** Sends (or, in dry-run, plans) due queued follow-ups. Never throws. */
export async function sendQueued(service: SupabaseClient, opts: SendOptions = {}): Promise<SendSummary> {
  const env = opts.env ?? { NURTURE_ENABLED: process.env.NURTURE_ENABLED, NURTURE_DRY_RUN: process.env.NURTURE_DRY_RUN };
  const mode = nurtureMode(env);
  const summary = emptySummary(mode);
  if (mode === "disabled") return summary;

  const now = opts.now ?? new Date();
  const limit = Math.max(1, Math.min(200, opts.limit ?? DEFAULT_RUN_CAP));
  const max = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  try {
    let q = service
      .from("lead_email_sends")
      .select("id,inquiry_id,template_id,due_at,attempts")
      .eq("status", "queued")
      .lte("due_at", now.toISOString())
      .order("due_at", { ascending: true })
      .limit(limit);
    if (opts.ids) {
      if (opts.ids.length === 0) return summary;
      q = q.in("id", opts.ids);
    }
    const { data: rows, error } = await q;
    if (error) {
      summary.errors.push(`load queue: ${error.message}`);
      return summary;
    }
    const due = (rows ?? []) as SendRow[];
    if (due.length === 0) return summary;

    const templateIds = [...new Set(due.map((r) => r.template_id))];
    const { data: tpls, error: tErr } = await service
      .from("email_templates")
      .select("id,template_key,subject,body,is_active,audience")
      .in("id", templateIds);
    if (tErr) {
      summary.errors.push(`load templates: ${tErr.message}`);
      return summary;
    }
    const templates = new Map(((tpls ?? []) as TemplateRow[]).map((t) => [t.id, t]));

    const settings = await getSettings();
    const siteUrl = getPublicSiteUrl();
    const company = {
      companyName: site.name,
      legalName: site.legalName,
      address: s(settings, "contact_location").trim() || site.location,
      phone: s(settings, "contact_phone").trim() || site.phone,
      email: s(settings, "contact_email").trim() || site.email,
      siteUrl,
    };

    for (const row of due) {
      summary.considered++;
      try {
        await processRow(service, row, templates.get(row.template_id) ?? null, { mode, now, max, siteUrl, company }, summary);
      } catch (err) {
        summary.errors.push(`${row.id}: ${err instanceof Error ? err.message : "unexpected error"}`);
      }
    }
  } catch (err) {
    summary.errors.push(err instanceof Error ? err.message : "unexpected error");
  }
  return summary;
}

type Ctx = {
  mode: NurtureMode;
  now: Date;
  max: number;
  siteUrl: string;
  company: { companyName: string; legalName: string; address: string; phone: string; email: string; siteUrl: string };
};

async function processRow(
  service: SupabaseClient,
  row: SendRow,
  template: TemplateRow | null,
  ctx: Ctx,
  summary: SendSummary,
) {
  if (!template) {
    // Templates are never deleted once used (FK restrict), so this is a read problem: leave queued.
    summary.errors.push(`${row.id}: template not found`);
    return;
  }

  const { data: leadData, error: leadErr } = await service
    .from("inquiries")
    .select("id,name,email,phone,lead_stage,consent_followup,unsubscribed_at,unsub_token,specialist_id,listing_id")
    .eq("id", row.inquiry_id)
    .maybeSingle();
  if (leadErr) throw new Error(`load lead: ${leadErr.message}`);
  const lead = leadData as LeadRow | null;

  let specialist: SpecialistRow | null = null;
  let settingsRow: SettingsRow | null = null;
  let pref: PrefRow | null = null;
  let suppressed = false;
  let listing: { title: string | null; slug: string | null; live: boolean } | null = null;

  if (lead?.specialist_id) {
    const sid = lead.specialist_id;
    const emailLower = (lead.email ?? "").trim().toLowerCase();
    const [sp, st, pr, sup, li] = await Promise.all([
      service.from("specialists").select("id,display_name,email,phone,status,subdomain,is_visible").eq("id", sid).maybeSingle(),
      service.from("specialist_email_settings").select("followups_enabled,personal_note").eq("specialist_id", sid).maybeSingle(),
      service.from("specialist_template_prefs").select("enabled").eq("specialist_id", sid).eq("template_id", template.id).maybeSingle(),
      emailLower
        ? service.from("email_suppressions").select("email_lower").eq("email_lower", emailLower).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      lead.listing_id
        ? service.from("listings").select("title,slug,status,approval_status").eq("id", lead.listing_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    const failed = [sp, st, pr, sup].find((r) => r.error);
    if (failed?.error) throw new Error(`load context: ${failed.error.message}`);
    specialist = sp.data as SpecialistRow | null;
    settingsRow = st.data as SettingsRow | null;
    pref = pr.data as PrefRow | null;
    suppressed = !!sup.data;
    const l = li.data as { title: string | null; slug: string | null; status: string | null; approval_status: string | null } | null;
    if (l) {
      listing = {
        title: l.title,
        slug: l.slug,
        live: l.approval_status === "approved" && l.status !== "Draft" && l.status !== "Archived",
      };
    }
  }

  const audience = normalizeAudience(template.audience);
  const verdict = checkEligibility({
    lead,
    suppressed,
    specialist: specialist ? { status: specialist.status, email: specialist.email } : null,
    settings: settingsRow,
    template,
    pref,
    dueAt: row.due_at,
    now: ctx.now,
  });

  if (!verdict.ok) {
    summary.skips.push({ sendId: row.id, reason: verdict.reason });
    if (ctx.mode === "live") {
      const { error } = await service
        .from("lead_email_sends")
        .update({ status: "skipped", skip_reason: verdict.reason, specialist_id: lead?.specialist_id ?? null })
        .eq("id", row.id)
        .eq("status", "queued");
      if (error) throw new Error(`record skip: ${error.message}`);
    }
    summary.skipped++;
    return;
  }

  // Eligible: lead and specialist are present (checkEligibility guarantees it).
  const l = lead as LeadRow;
  const sp = specialist as SpecialistRow;
  const urls = audience === "lead" ? unsubscribeUrls(ctx.siteUrl, l.unsub_token ?? "") : null;
  if (audience === "lead" && !urls) {
    // Never send a lead email without a working unsubscribe link; leave it queued.
    summary.errors.push(`${row.id}: cannot build the unsubscribe link (check NEXT_PUBLIC_SITE_URL)`);
    return;
  }

  const vars: TemplateVars = {
    lead_first_name: firstName(l.name),
    lead_name: l.name?.trim() ?? "",
    lead_email: l.email?.trim() ?? "",
    lead_phone: l.phone?.trim() ?? "",
    lead_url: `${ctx.siteUrl}/dashboard/specialist/leads/${l.id}`,
    specialist_name: sp.display_name?.trim() ?? "",
    specialist_first_name: firstName(sp.display_name),
    specialist_phone: sp.phone?.trim() ?? "",
    specialist_email: sp.email?.trim() ?? "",
    specialist_page_url: sp.subdomain && sp.is_visible !== false ? `${ctx.siteUrl}/team/${sp.subdomain}` : "",
    listing_title: listing?.title?.trim() ?? "",
    listing_url: listing?.live && listing.slug ? `${ctx.siteUrl}/listings/${listing.slug}` : "",
    personal_note: settingsRow?.personal_note?.trim() ?? "",
    site_url: ctx.siteUrl,
    company_name: site.name,
  };

  const specialistName = sp.display_name?.trim() || "your property specialist";
  const rendered = renderTemplate(template, vars, {
    ...ctx.company,
    unsubscribeUrl: urls?.pageUrl ?? null,
    reason:
      audience === "lead"
        ? `You are receiving this because you contacted ${specialistName} through ${site.name} and agreed to follow-up emails about your inquiry.`
        : `Internal reminder from ${site.name} about a lead assigned to you.`,
  });

  const message = buildFollowupMessage({
    audience,
    from: formatFromAddress(audience === "lead" ? sp.display_name ?? "" : "", NURTURE_FROM_ADDRESS),
    leadEmail: l.email ?? "",
    specialistEmail: sp.email ?? "",
    rendered,
    templateKey: template.template_key,
    oneClickUrl: urls?.oneClickUrl ?? null,
  });

  if (ctx.mode === "dry_run") {
    const planned: PlannedEmail = {
      sendId: row.id,
      templateKey: template.template_key,
      audience,
      to: maskEmail(message.to),
      subject: message.subject,
      dueAt: row.due_at,
    };
    summary.plan.push(planned);
    console.info("[nurture:dry-run] would send", planned);
    return;
  }

  // Claim: bump attempts and push due_at out so an overlapping run can't pick it up.
  const attempts = (row.attempts ?? 0) + 1;
  const { data: claimed, error: claimErr } = await service
    .from("lead_email_sends")
    .update({ attempts, due_at: new Date(ctx.now.getTime() + CLAIM_LEASE_MS).toISOString() })
    .eq("id", row.id)
    .eq("status", "queued")
    .eq("attempts", row.attempts ?? 0)
    .select("id");
  if (claimErr) throw new Error(`claim: ${claimErr.message}`);
  if (!claimed || claimed.length === 0) return; // another run has it, or it was skipped meanwhile

  const result = await sendEmailResult(message);
  if (result.ok) {
    const { error } = await service
      .from("lead_email_sends")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_message_id: result.id ? clip(result.id, 200) : null,
        last_error: null,
        specialist_id: sp.id,
      })
      .eq("id", row.id);
    if (error) summary.errors.push(`${row.id}: sent but not recorded: ${error.message}`);
    summary.sent++;
    return;
  }

  const next = afterFailure(attempts, ctx.max);
  const { error } = await service
    .from("lead_email_sends")
    .update({
      status: next,
      last_error: clip(result.reason),
      // Back to its real due time so the next run retries it (and the lateness rule still applies).
      due_at: row.due_at,
    })
    .eq("id", row.id)
    .eq("status", "queued"); // a stop rule may have skipped it while we were sending
  if (error) summary.errors.push(`${row.id}: failure not recorded: ${error.message}`);
  if (next === "failed") summary.failed++;
  else summary.retrying++;
}
