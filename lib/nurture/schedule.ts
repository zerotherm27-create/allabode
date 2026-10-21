// Import-free on purpose (loaded directly by unit tests).
//
// Pure scheduling and stop rules for follow-up emails. The same checks run
// when a lead is enrolled and again right before each send, so a lead that
// progressed, unsubscribed or lost its specialist in between gets nothing.

const DAY_MS = 86_400_000;

/** Leads in these stages get no more lead-facing follow-ups (mirrors the DB trigger). */
export const STOP_STAGES = ["Viewing", "Negotiating", "Closed", "Lost"] as const;

/** A queued email this many days past due is skipped instead of sent late. */
export const MAX_LATE_DAYS = 5;
export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_RUN_CAP = 50;
export const MAX_RUN_CAP = 200;

export type Audience = "lead" | "specialist";

export type SkipReason =
  | "no_specialist"
  | "no_consent"
  | "unsubscribed"
  | "suppressed"
  | "stage_changed"
  | "specialist_inactive"
  | "followups_off"
  | "template_inactive"
  | "template_off"
  | "invalid_email"
  | "too_late"
  | "spam"
  | "lead_missing";

export type LeadFacts = {
  specialist_id: string | null;
  lead_stage: string | null;
  consent_followup: boolean | null;
  unsubscribed_at: string | null;
  email: string | null;
  /** Staff status on the inquiry; "Spam" stops the sequence. */
  status?: string | null;
};

export type EligibilityInput = {
  lead: LeadFacts | null;
  /** Lead's address is on the global do-not-email list. */
  suppressed: boolean;
  specialist: { status: string | null; email: string | null } | null;
  /** specialist_email_settings row, or null when the specialist never saved one (defaults: on). */
  settings: { followups_enabled: boolean | null } | null;
  template: { is_active: boolean | null; audience: string | null };
  /** specialist_template_prefs row, or null (default: on). */
  pref: { enabled: boolean | null } | null;
  /** When the email was due (send-time check only). */
  dueAt?: string | null;
  now?: Date;
};

export type Eligibility = { ok: true } | { ok: false; reason: SkipReason };

const EMAIL = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;.]+$/;
export function isSendableEmail(s: unknown): s is string {
  return typeof s === "string" && s.length <= 254 && EMAIL.test(s.trim());
}

export function normalizeAudience(a: unknown): Audience {
  return a === "specialist" ? "specialist" : "lead";
}

/** due_at = base + delay_days whole days (UTC), as an ISO string. */
export function computeDueAt(base: Date | string, delayDays: number): string {
  const t = new Date(base).getTime();
  const days = Number.isFinite(delayDays) ? Math.max(0, Math.min(365, Math.floor(delayDays))) : 0;
  const start = Number.isFinite(t) ? t : Date.now();
  return new Date(start + days * DAY_MS).toISOString();
}

export function isDue(dueAt: string, now: Date = new Date()): boolean {
  const t = new Date(dueAt).getTime();
  return Number.isFinite(t) && t <= now.getTime();
}

/** True when the email is so overdue (e.g. the sender was off for a week) that it should not go out. */
export function isTooLate(dueAt: string, now: Date = new Date(), maxLateDays = MAX_LATE_DAYS): boolean {
  const t = new Date(dueAt).getTime();
  return Number.isFinite(t) && now.getTime() - t > maxLateDays * DAY_MS;
}

/** Can this lead be enrolled at all? Enrolment happens only from /api/leads after its checks. */
export function canEnrol(lead: LeadFacts | null): Eligibility {
  if (!lead) return { ok: false, reason: "lead_missing" };
  if (!lead.specialist_id) return { ok: false, reason: "no_specialist" };
  if (lead.consent_followup !== true) return { ok: false, reason: "no_consent" };
  if (lead.unsubscribed_at) return { ok: false, reason: "unsubscribed" };
  if (lead.status === "Spam") return { ok: false, reason: "spam" };
  return { ok: true };
}

/**
 * Every stop rule, in a fixed order. Lead-facing emails stop on a stop stage;
 * the internal specialist reminder goes only while the lead is still "New".
 */
export function checkEligibility(input: EligibilityInput): Eligibility {
  const base = canEnrol(input.lead);
  if (!base.ok) return base;
  const lead = input.lead as LeadFacts;
  const audience = normalizeAudience(input.template.audience);

  if (audience === "lead") {
    if (input.suppressed) return { ok: false, reason: "suppressed" };
    if ((STOP_STAGES as readonly string[]).includes(lead.lead_stage ?? "")) return { ok: false, reason: "stage_changed" };
  } else if ((lead.lead_stage ?? "New") !== "New") {
    return { ok: false, reason: "stage_changed" };
  }

  if (!input.specialist || input.specialist.status !== "approved") return { ok: false, reason: "specialist_inactive" };
  if (input.settings && input.settings.followups_enabled === false) return { ok: false, reason: "followups_off" };
  if (input.template.is_active !== true) return { ok: false, reason: "template_inactive" };
  if (input.pref && input.pref.enabled === false) return { ok: false, reason: "template_off" };

  const to = audience === "lead" ? lead.email : input.specialist.email;
  if (!isSendableEmail(to)) return { ok: false, reason: "invalid_email" };
  // The reply-to on a lead email is the specialist; it must be a real address too.
  if (audience === "lead" && !isSendableEmail(input.specialist.email)) return { ok: false, reason: "invalid_email" };

  if (input.dueAt && isTooLate(input.dueAt, input.now ?? new Date())) return { ok: false, reason: "too_late" };
  return { ok: true };
}

export type EnrolTemplate = { id: string; delay_days: number; is_active: boolean | null };
export type EnrolRow = { inquiry_id: string; template_id: string; specialist_id: string; due_at: string; status: "queued" };

/** One queued row per active template, due `delay_days` after the lead arrived. */
export function planEnrolment(
  lead: { id: string; specialist_id: string; created_at: string | null },
  templates: EnrolTemplate[],
  now: Date = new Date(),
): EnrolRow[] {
  const base = lead.created_at && Number.isFinite(new Date(lead.created_at).getTime()) ? lead.created_at : now.toISOString();
  return templates
    .filter((t) => t.is_active === true)
    .map((t) => ({
      inquiry_id: lead.id,
      template_id: t.id,
      specialist_id: lead.specialist_id,
      due_at: computeDueAt(base, t.delay_days),
      status: "queued" as const,
    }));
}

/** One person (same address) is enrolled at most once per this many days. */
export const ENROL_WINDOW_DAYS = 30;

export type PriorSend = { template_id: string; status: string; created_at: string };

/**
 * Per-person dedup across inquiries. `prior` = send rows of OTHER inquiries
 * with the same lower(trim(email)). Nothing is enrolled when that address was
 * enrolled within the window; otherwise a template already queued or sent to
 * the address is dropped, so nobody gets the same email twice.
 */
export function dedupeEnrolment<T extends { template_id: string }>(
  rows: T[],
  prior: PriorSend[],
  now: Date = new Date(),
  windowDays = ENROL_WINDOW_DAYS,
): T[] {
  const cutoff = now.getTime() - windowDays * DAY_MS;
  const recent = prior.some((p) => {
    const t = new Date(p.created_at).getTime();
    return !Number.isFinite(t) || t >= cutoff;
  });
  if (recent) return [];
  const taken = new Set(prior.filter((p) => p.status === "queued" || p.status === "sent").map((p) => p.template_id));
  return rows.filter((r) => !taken.has(r.template_id));
}

/**
 * A queued row that was already claimed (attempts > 0) and has no recorded
 * failure may have been accepted by Resend before the run died: never resend it.
 */
export const CLAIM_MARKER = "claimed";
export function isUncertainDelivery(row: { attempts: number | null; last_error: string | null }): boolean {
  return (row.attempts ?? 0) > 0 && (row.last_error == null || row.last_error === CLAIM_MARKER);
}

/** Escapes % _ \ for an exact, case-insensitive PostgREST ilike match. */
export function ilikeExact(s: string): string {
  return String(s ?? "").replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** After a failed attempt (attempts already counted): retry while under the cap, else give up. */
export function afterFailure(attempts: number, maxAttempts = DEFAULT_MAX_ATTEMPTS): "queued" | "failed" {
  return attempts >= Math.max(1, maxAttempts) ? "failed" : "queued";
}

export type NurtureMode = "disabled" | "dry_run" | "live";

/**
 * NURTURE_DRY_RUN=true wins (nothing is sent or changed, the plan is
 * returned); otherwise sending needs NURTURE_ENABLED=true exactly.
 */
export function nurtureMode(env: { NURTURE_ENABLED?: string; NURTURE_DRY_RUN?: string }): NurtureMode {
  if ((env.NURTURE_DRY_RUN ?? "").trim() === "true") return "dry_run";
  if ((env.NURTURE_ENABLED ?? "").trim() === "true") return "live";
  return "disabled";
}

/** Per-run cap from the automation rule config, clamped. */
export function runCap(config: unknown, fallback = DEFAULT_RUN_CAP): number {
  const raw = (config as { per_run_cap?: unknown } | null)?.per_run_cap;
  const n = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : fallback;
  return Math.max(1, Math.min(MAX_RUN_CAP, n));
}

export function maxAttempts(config: unknown, fallback = DEFAULT_MAX_ATTEMPTS): number {
  const raw = (config as { max_attempts?: unknown } | null)?.max_attempts;
  const n = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : fallback;
  return Math.max(1, Math.min(10, n));
}
