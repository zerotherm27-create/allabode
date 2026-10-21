// Import-free on purpose (loaded directly by unit tests).
//
// Validation for a property specialist's own version of a customer follow-up
// email (specialist_template_overrides). Stricter than the owner's editor
// (lib/admin/follow-up-templates.ts): unknown merge fields and broken
// placeholders are REJECTED rather than warned about, HTML is refused, and the
// limits are tighter. The unsubscribe link, the reason line and the company
// details are not part of what is validated here: the renderer always adds
// them after the body, so an override can never remove or change them.

export const OVERRIDE_SUBJECT_MAX = 150;
export const OVERRIDE_BODY_MAX = 3000;

export type OverrideInput = { subject: string; body: string };
export type OverrideErrors = Partial<Record<keyof OverrideInput, string>>;
export type OverrideResult =
  | { ok: true; value: OverrideInput }
  | { ok: false; errors: OverrideErrors };

const FIELD = /\{\{\s*([a-zA-Z0-9_]*)\s*\}\}/g;
const STRAY = /\{\{|\}\}/;
// Something that a mail client could read as a tag: "<b>", "</p>", "<!--", "<a href".
const HTML_TAG = /<[/!?]?[a-zA-Z!]/;

function fieldsIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(FIELD)) {
    const k = m[1].toLowerCase();
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

function unknownIn(text: string, allowed: readonly string[]): string[] {
  const ok = new Set(allowed);
  return fieldsIn(text).filter((k) => !ok.has(k));
}

function malformed(text: string): boolean {
  return STRAY.test(text.replace(FIELD, ""));
}

function hasControlChar(v: string, allowNewline: boolean): boolean {
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (allowNewline && (c === 9 || c === 10)) continue;
    if (c < 32 || c === 127 || c === 0x2028 || c === 0x2029) return true;
  }
  return false;
}

function listFields(names: string[]): string {
  return names.map((n) => `{{${n || " "}}}`).join(", ");
}

/** Validates a specialist's subject + body. `allowedFields` is MERGE_FIELDS from lib/nurture/render.ts. */
export function parseOverrideInput(raw: unknown, allowedFields: readonly string[]): OverrideResult {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: OverrideErrors = {};

  const rawSubject = typeof o.subject === "string" ? o.subject : "";
  const subject = rawSubject.trim();
  if (/[\r\n]/.test(rawSubject)) errors.subject = "The subject must be a single line.";
  else if (!subject) errors.subject = "Write a subject line.";
  else if (subject.length > OVERRIDE_SUBJECT_MAX) {
    errors.subject = `Keep the subject to ${OVERRIDE_SUBJECT_MAX} characters or fewer (it is ${subject.length}).`;
  } else if (hasControlChar(subject, false)) errors.subject = "The subject contains characters that can't be used.";
  else if (HTML_TAG.test(subject)) errors.subject = "Use plain text only. HTML tags aren't allowed.";
  else if (malformed(subject)) errors.subject = "Some curly braces aren't a complete {{field}}. Fix or remove them.";
  else {
    const bad = unknownIn(subject, allowedFields);
    if (bad.length) errors.subject = `Unknown merge field${bad.length === 1 ? "" : "s"}: ${listFields(bad)}.`;
  }

  const body = (typeof o.body === "string" ? o.body : "").replace(/\r\n?/g, "\n").trim();
  if (!body) errors.body = "Write the email message.";
  else if (body.length > OVERRIDE_BODY_MAX) {
    errors.body = `Keep the message to ${OVERRIDE_BODY_MAX.toLocaleString("en-US")} characters or fewer (it is ${body.length.toLocaleString("en-US")}).`;
  } else if (hasControlChar(body, true)) errors.body = "The message contains characters that can't be used.";
  else if (HTML_TAG.test(body)) errors.body = "Use plain text only. HTML tags aren't allowed.";
  else if (malformed(body)) errors.body = "Some curly braces aren't a complete {{field}}. Fix or remove them.";
  else {
    const bad = unknownIn(body, allowedFields);
    if (bad.length) errors.body = `Unknown merge field${bad.length === 1 ? "" : "s"}: ${listFields(bad)}.`;
  }

  if (errors.subject || errors.body) return { ok: false, errors };
  return { ok: true, value: { subject, body } };
}

/** True when the overrides table isn't there yet (its migration hasn't been run). */
export function isOverrideTableMissing(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  return /specialist_template_overrides/i.test(err.message ?? "") && /does not exist|could not find|schema cache/i.test(err.message ?? "");
}

/**
 * Picks what to render: the specialist's own version when it is present and
 * still valid, otherwise the owner's template. Only customer templates can use
 * an override.
 */
export function pickTemplateSource(
  owner: { subject: string; body: string; audience: string | null },
  override: { subject: string | null; body: string | null } | null | undefined,
  allowedFields: readonly string[],
): { subject: string; body: string; fromOverride: boolean } {
  if (owner.audience === "lead" && override && typeof override.subject === "string" && typeof override.body === "string") {
    const parsed = parseOverrideInput(override, allowedFields);
    if (parsed.ok) return { ...parsed.value, fromOverride: true };
  }
  return { subject: owner.subject, body: owner.body, fromOverride: false };
}
