// Import-free on purpose (loaded directly by unit tests).
//
// Renders an owner-written follow-up template. Templates are PLAIN TEXT with
// {{merge_field}} placeholders (no HTML authoring): blank lines separate
// paragraphs, single newlines become line breaks, and bare http(s) URLs typed
// in the template become links unless opts.linkBodyUrls is false, as it is for
// a property specialist's own version (merge values are never auto-linked;
// only the server-built URL fields are). Every literal character AND every merge value is HTML-escaped, so
// neither the template nor a visitor-supplied value (a lead's name) can inject
// markup. Unknown fields render empty. The result has an HTML body and a
// plain-text twin, each ending with the same footer.

export const MERGE_FIELDS = [
  "lead_first_name",
  "lead_name",
  "lead_email",
  "lead_phone",
  "lead_url",
  "specialist_name",
  "specialist_first_name",
  "specialist_phone",
  "specialist_email",
  "specialist_page_url",
  "listing_title",
  "listing_url",
  "personal_note",
  "site_url",
  "company_name",
] as const;

export type MergeField = (typeof MERGE_FIELDS)[number];
export type TemplateVars = Partial<Record<string, string | null | undefined>>;

export type TemplateSource = { subject: string; body: string };

export type FooterInfo = {
  companyName: string;
  legalName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  siteUrl?: string | null;
  /** Lead emails carry an unsubscribe link; internal reminders do not. */
  unsubscribeUrl?: string | null;
  /** Why the recipient is getting this email (one sentence). */
  reason?: string | null;
};

export type RenderedEmail = { subject: string; html: string; text: string };

const FIELD = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const MAX_VALUE = 2000;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function value(vars: TemplateVars, key: string): string {
  const v = Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : undefined;
  if (typeof v !== "string") return "";
  return v.replace(/\r\n?/g, "\n").slice(0, MAX_VALUE);
}

/** Substitutes fields as plain text (no escaping). Unknown fields render empty. */
export function fillText(template: string, vars: TemplateVars): string {
  return String(template ?? "").replace(/\r\n?/g, "\n").replace(FIELD, (_m, key: string) => value(vars, key.toLowerCase()));
}

/** Subject line: filled, then flattened to one line (a value can never add a header line). */
export function renderSubject(subject: string, vars: TemplateVars): string {
  return fillText(subject, vars)
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

const URL_RE = /https?:\/\/[^\s<>"']+/g;
const TRAILING = /[.,;:!?)\]]+$/;

/** Escaped text -> escaped text with http(s) URLs wrapped in links. Input must already be escaped. */
function linkify(escaped: string): string {
  return escaped.replace(URL_RE, (match) => {
    // An escaped quote / bracket ends the URL (it was a delimiter in the source).
    const cut = match.search(/&(?:quot|#39|lt|gt);/);
    const raw = cut >= 0 ? match.slice(0, cut) : match;
    const rest = cut >= 0 ? match.slice(cut) : "";
    const trail = raw.match(TRAILING)?.[0] ?? "";
    const url = trail ? raw.slice(0, -trail.length) : raw;
    if (!url || /^https?:\/\/$/.test(url)) return match;
    return `<a href="${url}" style="color:#0d518c">${url}</a>${trail}${rest}`;
  });
}

/**
 * URL fields the server builds itself (never visitor input). Only these become
 * links, and only when the whole value is one http(s) URL; every other merge
 * value (a lead's name, a personal note) is plain escaped text, never linked.
 */
const LINK_FIELDS = new Set(["lead_url", "specialist_page_url", "listing_url", "site_url"]);
const WHOLE_URL = /^https?:\/\/[^\s<>"']+$/;

function valueHtml(key: string, v: string): string {
  const escaped = escapeHtml(v);
  if (LINK_FIELDS.has(key) && WHOLE_URL.test(v)) {
    return `<a href="${escaped}" style="color:#0d518c">${escaped}</a>`;
  }
  return escaped;
}

/** Escapes the template and every value in one pass, so nothing is escaped twice or missed. */
function fillHtml(template: string, vars: TemplateVars, linkBody = true): string {
  const src = String(template ?? "").replace(/\r\n?/g, "\n");
  const lit = (s: string) => (linkBody ? linkify(escapeHtml(s)) : escapeHtml(s));
  let out = "";
  let last = 0;
  for (const m of src.matchAll(FIELD)) {
    out += lit(src.slice(last, m.index));
    out += valueHtml(m[1].toLowerCase(), value(vars, m[1].toLowerCase()));
    last = (m.index ?? 0) + m[0].length;
  }
  out += lit(src.slice(last));
  return out;
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n[ \t]*\n+/)
    .map((p) => p.replace(/^\n+|\n+$/g, ""))
    .filter((p) => p.trim().length > 0);
}

function footerLines(f: FooterInfo): { reason: string; company: string[]; unsubscribe: string | null } {
  const company = [f.legalName && f.legalName !== f.companyName ? `${f.companyName} (${f.legalName})` : f.companyName];
  if (f.address) company.push(f.address);
  const contact = [f.phone, f.email].filter((x): x is string => !!x && x.trim().length > 0);
  if (contact.length) company.push(contact.join(" · "));
  if (f.siteUrl) company.push(f.siteUrl);
  return {
    reason: f.reason?.trim() || "",
    company: company.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean),
    unsubscribe: f.unsubscribeUrl?.trim() || null,
  };
}

export type RenderOptions = {
  /**
   * Turn bare http(s) URLs typed in the body into links (default true, for the
   * owner's templates). A property specialist's own version renders with this
   * off, so URLs they type stay plain text; the server-built URL merge fields
   * are still linked.
   */
  linkBodyUrls?: boolean;
};

export function renderTemplate(
  template: TemplateSource,
  vars: TemplateVars,
  footer: FooterInfo,
  opts: RenderOptions = {},
): RenderedEmail {
  const subject = renderSubject(template.subject, vars);
  const f = footerLines(footer);

  // ---- plain text ----
  const textBody = paragraphs(fillText(template.body, vars))
    .map((p) => p.split("\n").map((l) => l.trimEnd()).join("\n"))
    .join("\n\n");
  const textFooter = [
    "--",
    ...(f.reason ? [f.reason] : []),
    ...(f.unsubscribe ? [`Unsubscribe: ${f.unsubscribe}`] : []),
    ...f.company,
  ].join("\n");
  const text = `${textBody}\n\n${textFooter}\n`;

  // ---- html ----
  const htmlParas = paragraphs(fillHtml(template.body, vars, opts.linkBodyUrls !== false))
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  const unsub = f.unsubscribe
    ? `<p style="margin:0 0 8px"><a href="${escapeHtml(f.unsubscribe)}" style="color:#5b6676">Unsubscribe from these emails</a></p>`
    : "";
  const reason = f.reason ? `<p style="margin:0 0 8px">${escapeHtml(f.reason)}</p>` : "";
  const company = f.company.length
    ? `<p style="margin:0">${f.company.map(escapeHtml).join("<br>")}</p>`
    : "";
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a2433;max-width:600px">` +
    htmlParas +
    `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e3e6ea;font-size:12px;line-height:1.5;color:#5b6676">` +
    reason +
    unsub +
    company +
    `</div></div>`;

  return { subject, html, text };
}

/** First word of a name, for {{lead_first_name}} / {{specialist_first_name}}. */
export function firstName(name: string | null | undefined): string {
  return String(name ?? "").trim().split(/\s+/)[0] ?? "";
}
