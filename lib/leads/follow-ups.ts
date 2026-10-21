// Import-free on purpose (loaded directly by unit tests).
//
// Pure helpers for the specialist "Follow-up emails" settings page.

export const MAX_NOTE_LENGTH = 400;
export const TEST_EMAIL_LIMIT = 3;
export const TEST_EMAIL_WINDOW_MS = 60 * 60_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

function hasForbiddenChar(v: string): boolean {
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c === 9 || c === 10) continue; // tab, newline
    if (c < 32 || c === 127 || c === 0x2028 || c === 0x2029) return true;
  }
  return false;
}

/** Personal note: optional, max 400 chars, plain text (line breaks allowed, other control characters are not). */
export function parseNote(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, value: "" };
  if (typeof raw !== "string") return { ok: false, error: "That note isn't valid." };
  const value = raw.replace(/\r\n?/g, "\n").trim();
  if (hasForbiddenChar(value)) {
    return { ok: false, error: "The note contains characters that can't be used." };
  }
  if (value.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `Keep the note to ${MAX_NOTE_LENGTH} characters or fewer (it is ${value.length}).` };
  }
  return { ok: true, value };
}

/** Switch value from a form / action argument: true, false, or null when not a clear boolean. */
export function parseSwitch(raw: unknown): boolean | null {
  if (raw === true || raw === "true" || raw === "on" || raw === "1") return true;
  if (raw === false || raw === "false" || raw === "off" || raw === "0") return false;
  return null;
}

/** A template is on unless the specialist has a pref row that says otherwise. */
export function isTemplateOn(pref: { enabled: boolean | null } | null | undefined): boolean {
  return pref?.enabled !== false;
}

export function describeDelay(days: number): string {
  const d = Math.trunc(Number(days));
  if (!Number.isFinite(d) || d <= 0) return "Sent right away";
  if (d === 1) return "1 day after enquiry";
  return `${d} days after enquiry`;
}

/** Sample lead data used for previews and test emails. */
export const SAMPLE_LEAD = {
  lead_first_name: "Maria",
  lead_name: "Maria Santos",
  lead_email: "maria.santos@example.com",
  lead_phone: "+63 917 000 0000",
  listing_title: "2-bedroom condo in Makati",
} as const;

/**
 * Sliding-window limiter for test emails. `sent` holds the send times (ms) of
 * this specialist's recent test emails.
 */
export function checkTestRateLimit(
  sent: readonly number[],
  now: number,
  max = TEST_EMAIL_LIMIT,
  windowMs = TEST_EMAIL_WINDOW_MS,
): { allowed: boolean; recent: number[]; retryInMinutes: number } {
  const recent = sent.filter((t) => t > now - windowMs && t <= now).sort((a, b) => a - b);
  if (recent.length < max) return { allowed: true, recent, retryInMinutes: 0 };
  const frees = recent[recent.length - max] + windowMs - now;
  return { allowed: false, recent, retryInMinutes: Math.max(1, Math.ceil(frees / 60_000)) };
}

/** True when the error means the follow-up tables aren't there yet (migration not run). */
export function isFollowUpMigrationMissing(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "42P01" || err.code === "PGRST205" || err.code === "42703" || err.code === "PGRST204") return true;
  return /specialist_email_settings|specialist_template_prefs|email_templates/i.test(err.message ?? "");
}
