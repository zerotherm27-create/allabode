// Import-free on purpose (loaded directly by unit tests). Pure helpers for
// inquiries sent from a property specialist's microsite contact form.

// Same pattern as SLUG_PATTERN in lib/team/queries.ts (a test keeps them in sync).
const SLUG = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/** The `specialist` field of a lead body when it is a well-formed slug, else null (no lookup is made). */
export function parseSpecialistSlug(v: unknown): string | null {
  return typeof v === "string" && SLUG.test(v) ? v : null;
}

export type VerifiedSpecialist = { slug: string; name: string };

/**
 * The inquiry row tagged with the SERVER-VERIFIED specialist (from the public
 * view, never the request): `details` gains source + slug + name. A null
 * specialist returns the row unchanged.
 */
export function tagSpecialistInquiry(
  row: Record<string, unknown>,
  specialist: VerifiedSpecialist | null,
): Record<string, unknown> {
  if (!specialist) return row;
  const existing =
    row.details && typeof row.details === "object" && !Array.isArray(row.details)
      ? (row.details as Record<string, unknown>)
      : {};
  // A specialist-page message is not about a listing: drop a null `listing` key.
  const { listing, ...rest } = existing;
  return {
    ...row,
    details: {
      ...rest,
      ...(listing != null ? { listing } : {}),
      source: "specialist-page",
      specialistSlug: specialist.slug,
      specialistName: specialist.name,
    },
  };
}

/** "Source: specialist page — Name" for the admin inquiries list, or null when the row isn't one. */
export function specialistSourceLabel(details: unknown): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const d = details as Record<string, unknown>;
  if (d.source !== "specialist-page") return null;
  const name = typeof d.specialistName === "string" ? d.specialistName.trim() : "";
  return name ? `Source: specialist page — ${name}` : "Source: specialist page";
}

/** Escapes the five HTML-significant characters. */
export function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escaped text with line breaks kept (CRLF/CR/LF → <br>). */
function escapeMultiline(v: unknown): string {
  return escapeHtml(v).replace(/\r\n|\r|\n/g, "<br>");
}

export type SpecialistLeadEmailInput = {
  specialistName: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  /** Absolute http(s) URL of the admin inquiries page; omitted from the email when absent or malformed. */
  adminUrl?: string | null;
  /** Who the copy is for: the company inbox is the main recipient, the specialist gets a copy. */
  audience?: "company" | "specialist";
};

/** Subject + HTML body of the notification sent to the specialist and the company inbox. */
export function buildSpecialistLeadEmail(input: SpecialistLeadEmailInput): { subject: string; html: string } {
  const specialist = input.specialistName.replace(/[\r\n]+/g, " ").trim() || "a specialist";
  const forCompany = input.audience === "company";
  const subject = forCompany
    ? `New inquiry assigned to ${specialist}`
    : `New message for ${specialist} from the website`;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#5b6676;vertical-align:top;white-space:nowrap">${label}</td>` +
    `<td style="padding:6px 0;color:#1a2433">${value}</td></tr>`;
  const adminUrl =
    typeof input.adminUrl === "string" && /^https?:\/\/[^\s"'<>]+$/i.test(input.adminUrl) ? input.adminUrl : null;
  const html = [
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a2433">`,
    forCompany
      ? `<p>A visitor sent a message that was assigned to <strong>${escapeHtml(specialist)}</strong>. They have been copied.</p>`
      : `<p>A visitor sent <strong>${escapeHtml(specialist)}</strong> a message from their specialist page.</p>`,
    `<table style="border-collapse:collapse">`,
    row("Name", escapeHtml(input.name)),
    row("Email", escapeHtml(input.email)),
    row("Contact number", escapeHtml(input.phone || "—")),
    `</table>`,
    `<p style="margin-top:16px;color:#5b6676">Message</p>`,
    `<p style="margin-top:4px">${input.message ? escapeMultiline(input.message) : "—"}</p>`,
    adminUrl ? `<p style="margin-top:24px"><a href="${escapeHtml(adminUrl)}">View it in Admin → Inquiries</a></p>` : "",
    `<p style="margin-top:24px;font-size:13px;color:#5b6676">All Abode Property Solutions</p>`,
    `</div>`,
  ].join("");
  return { subject, html };
}
