// Import-free on purpose (loaded directly by unit tests).
//
// Pure validation for the admin follow-up email template editor and send log.

export const AUDIENCES = ["lead", "specialist"] as const;
export type TemplateAudience = (typeof AUDIENCES)[number];
export const AUDIENCE_LABEL: Record<TemplateAudience, string> = {
  lead: "Customer",
  specialist: "Specialist (internal)",
};

export const KEY_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
export const NAME_MAX = 120;
export const SUBJECT_MAX = 200;
export const BODY_MAX = 20000;
export const DELAY_MAX = 365;
export const POSITION_MIN = -1000;
export const POSITION_MAX = 10000;

export const SEND_STATUSES = ["queued", "sent", "skipped", "failed"] as const;
export type SendStatus = (typeof SEND_STATUSES)[number];
export const LOG_PAGE_SIZE = 25;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

const FIELD = /\{\{\s*([a-zA-Z0-9_]*)\s*\}\}/g;
// Anything that looks like an attempt at a placeholder but is malformed.
const STRAY = /\{\{|\}\}/;

/** Distinct merge-field names used in a piece of text, lowercased, in order of first use. */
export function extractFields(text: string): string[] {
  const out: string[] = [];
  for (const m of String(text ?? "").matchAll(FIELD)) {
    const k = m[1].toLowerCase();
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

/** Fields used that the renderer does not support (they would render as empty). */
export function unknownFields(text: string, allowed: readonly string[]): string[] {
  const ok = new Set(allowed);
  return extractFields(text).filter((k) => !ok.has(k));
}

/** True when braces are used in a way that is not a clean {{field}} placeholder. */
export function hasMalformedPlaceholder(text: string): boolean {
  return STRAY.test(String(text ?? "").replace(FIELD, ""));
}

function hasControlChar(v: string, allowNewline: boolean): boolean {
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (allowNewline && (c === 9 || c === 10 || c === 13)) continue;
    if (c < 32 || c === 127 || c === 0x2028 || c === 0x2029) return true;
  }
  return false;
}

export type TemplateInput = {
  template_key: string;
  name: string;
  subject: string;
  body: string;
  delay_days: number;
  position: number;
  audience: TemplateAudience;
  is_active: boolean;
};

export type TemplateErrors = Partial<Record<keyof TemplateInput, string>>;

function wholeNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isInteger(raw) ? raw : null;
  if (typeof raw !== "string" || !/^-?\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

/**
 * Validates the editor form. Unknown merge fields never block saving; they come
 * back as warnings (they render as empty text).
 */
export function parseTemplateInput(
  raw: Record<string, unknown>,
  allowedFields: readonly string[],
  opts: { requireKey?: boolean } = {},
): { ok: true; value: TemplateInput; warnings: string[] } | { ok: false; errors: TemplateErrors } {
  const errors: TemplateErrors = {};
  const str = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "");

  const template_key = str("template_key").trim().toLowerCase();
  if (opts.requireKey !== false && !KEY_RE.test(template_key)) {
    errors.template_key = "Use lowercase letters, numbers, hyphens and underscores (up to 64), starting with a letter or number.";
  }

  const name = str("name").trim();
  if (!name) errors.name = "Give the email a name.";
  else if (name.length > NAME_MAX) errors.name = `Keep the name to ${NAME_MAX} characters or fewer (it is ${name.length}).`;
  else if (hasControlChar(name, false)) errors.name = "The name contains characters that can't be used.";

  const subject = str("subject").replace(/\r\n?/g, "\n").trim();
  if (!subject) errors.subject = "Write a subject line.";
  else if (subject.length > SUBJECT_MAX) errors.subject = `Keep the subject to ${SUBJECT_MAX} characters or fewer (it is ${subject.length}).`;
  else if (hasControlChar(subject, false)) errors.subject = "The subject must be a single line without special characters.";

  const body = str("body").replace(/\r\n?/g, "\n").trim();
  if (!body) errors.body = "Write the email body.";
  else if (body.length > BODY_MAX) errors.body = `Keep the body to ${BODY_MAX.toLocaleString("en-US")} characters or fewer (it is ${body.length.toLocaleString("en-US")}).`;
  else if (hasControlChar(body, true)) errors.body = "The body contains characters that can't be used.";

  const delay = wholeNumber(raw.delay_days);
  if (delay === null || delay < 0 || delay > DELAY_MAX) errors.delay_days = `Enter a whole number of days from 0 to ${DELAY_MAX}.`;

  const position = wholeNumber(raw.position === "" || raw.position == null ? 0 : raw.position);
  if (position === null || position < POSITION_MIN || position > POSITION_MAX) {
    errors.position = `Enter a whole number from ${POSITION_MIN} to ${POSITION_MAX}.`;
  }

  const audience = str("audience");
  if (!(AUDIENCES as readonly string[]).includes(audience)) errors.audience = "Choose who receives this email.";

  const active = raw.is_active;
  const is_active = active === true || active === "true" || active === "on" || active === "1";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const warnings: string[] = [];
  const unknownSubject = unknownFields(subject, allowedFields);
  const unknownBody = unknownFields(body, allowedFields);
  const unknown = [...new Set([...unknownSubject, ...unknownBody])];
  if (unknown.length > 0) {
    warnings.push(
      `Unknown merge field${unknown.length === 1 ? "" : "s"}: ${unknown.map((u) => `{{${u}}}`).join(", ")}. ${unknown.length === 1 ? "It" : "They"} will be left blank in sent emails.`,
    );
  }
  if (hasMalformedPlaceholder(subject) || hasMalformedPlaceholder(body)) {
    warnings.push("Some curly braces are not a complete {{field}} placeholder and will be sent as written.");
  }

  return {
    ok: true,
    warnings,
    value: {
      template_key,
      name,
      subject,
      body,
      delay_days: delay as number,
      position: position as number,
      audience: audience as TemplateAudience,
      is_active,
    },
  };
}

export type LogFilters = {
  status: SendStatus | null;
  specialistId: string | null;
  page: number;
};

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

/** Reads the send-log query string defensively; bad values fall back to "no filter" / page 1. */
export function parseLogFilters(sp: Record<string, string | string[] | undefined>): LogFilters {
  const status = first(sp.status);
  const specialist = first(sp.specialist);
  const pageN = Number(first(sp.page));
  return {
    status: (SEND_STATUSES as readonly string[]).includes(status) ? (status as SendStatus) : null,
    specialistId: isUuid(specialist) ? specialist : null,
    page: Number.isInteger(pageN) && pageN >= 1 && pageN <= 10000 ? pageN : 1,
  };
}

/** Zero-based inclusive range for a Supabase .range() call. */
export function pageRange(page: number, size = LOG_PAGE_SIZE): { from: number; to: number } {
  const p = Math.max(1, Math.trunc(page) || 1);
  return { from: (p - 1) * size, to: p * size - 1 };
}

export function totalPages(total: number, size = LOG_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / size));
}

/** Folds a list of statuses into per-status counts (unknown statuses are ignored). */
export function summariseStatuses(rows: readonly { status: string }[]): Record<SendStatus, number> {
  const out: Record<SendStatus, number> = { queued: 0, sent: 0, skipped: 0, failed: 0 };
  for (const r of rows) if (r.status in out) out[r.status as SendStatus]++;
  return out;
}

const SKIP_LABELS: Record<string, string> = {
  no_specialist: "No specialist assigned",
  no_consent: "No follow-up consent",
  unsubscribed: "Lead unsubscribed",
  suppressed: "Address is on the do-not-email list",
  stage_changed: "Lead moved on from New",
  specialist_inactive: "Specialist not active",
  followups_off: "Specialist switched follow-ups off",
  template_inactive: "Template deactivated",
  template_off: "Specialist switched this email off",
  invalid_email: "Invalid email address",
  too_late: "Missed its sending window",
  lead_missing: "Enquiry no longer exists",
};

/** Human wording for a skip_reason code; unknown codes are shown as written, tidied. */
export function describeSkipReason(code: string | null | undefined): string {
  if (!code) return "";
  return SKIP_LABELS[code] ?? code.replace(/_/g, " ");
}

/** On/off text for the log header. Never returns the raw env values. */
export function describeNurtureFlags(mode: "disabled" | "dry_run" | "live"): {
  enabled: "on" | "off";
  dryRun: "on" | "off";
  summary: string;
} {
  return {
    enabled: mode === "live" ? "on" : "off",
    dryRun: mode === "dry_run" ? "on" : "off",
    summary:
      mode === "live"
        ? "Live: follow-up emails are being sent."
        : mode === "dry_run"
          ? "Dry run: nothing is sent and no rows change; the plan is only logged."
          : "Off: nothing is sent and queued follow-ups wait.",
  };
}
