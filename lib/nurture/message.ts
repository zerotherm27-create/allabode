// Import-free on purpose (loaded directly by unit tests).
//
// Builds the outgoing follow-up message (addresses, unsubscribe headers,
// tags) from already-rendered content. The shape matches EmailMessage in
// lib/email.ts so lib/nurture/send.ts can hand it straight to Resend.

export const NURTURE_FROM_ADDRESS = "hello@mail.allabodeph.com";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A well-formed UUID (lowercased) or null. The unsubscribe token is a uuid. */
export function parseToken(v: unknown): string | null {
  return typeof v === "string" && UUID.test(v.trim()) ? v.trim().toLowerCase() : null;
}

function origin(siteUrl: string): string {
  return String(siteUrl ?? "").trim().replace(/\/+$/, "");
}

/** pageUrl = the human confirm page (in the body); oneClickUrl = RFC 8058 POST target (in the header). */
export function unsubscribeUrls(siteUrl: string, token: string): { pageUrl: string; oneClickUrl: string } | null {
  const t = parseToken(token);
  const o = origin(siteUrl);
  if (!t || !/^https?:\/\/[^\s/]+/.test(o)) return null;
  return { pageUrl: `${o}/unsubscribe/${t}`, oneClickUrl: `${o}/api/unsubscribe/${t}` };
}

/** List-Unsubscribe + one-click headers (RFC 2369 / RFC 8058). */
export function listUnsubscribeHeaders(oneClickUrl: string, mailto?: string | null): Record<string, string> {
  const parts = [`<${oneClickUrl}>`];
  if (mailto) parts.push(`<mailto:${mailto}?subject=unsubscribe>`);
  return {
    "List-Unsubscribe": parts.join(", "),
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Resend tag values allow only ASCII letters, numbers, underscores and dashes. */
export function tagValue(s: string): string {
  return String(s ?? "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256) || "none";
}

export type OutgoingMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo?: string;
  headers?: Record<string, string>;
  tags: { name: string; value: string }[];
};

export type BuildInput = {
  audience: "lead" | "specialist";
  /** Already formatted, e.g. formatFromAddress(name, NURTURE_FROM_ADDRESS). */
  from: string;
  leadEmail: string;
  specialistEmail: string;
  rendered: { subject: string; html: string; text: string };
  templateKey: string;
  oneClickUrl?: string | null;
};

/**
 * Lead email: to the lead, reply-to the specialist, with unsubscribe headers.
 * Specialist reminder: to the specialist, no reply-to, no unsubscribe headers
 * (an internal notice, not marketing).
 */
export function buildFollowupMessage(input: BuildInput): OutgoingMessage {
  const tags = [
    { name: "category", value: "lead_followup" },
    { name: "template", value: tagValue(input.templateKey) },
    { name: "audience", value: input.audience },
  ];
  if (input.audience === "specialist") {
    return { to: input.specialistEmail.trim(), from: input.from, ...input.rendered, tags };
  }
  return {
    to: input.leadEmail.trim(),
    from: input.from,
    replyTo: input.specialistEmail.trim(),
    ...input.rendered,
    ...(input.oneClickUrl ? { headers: listUnsubscribeHeaders(input.oneClickUrl) } : {}),
    tags,
  };
}

/** j***@example.com, for logs. */
export function maskEmail(e: string): string {
  const [user, domain] = String(e ?? "").split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}

/** Trims a provider error for the last_error column (max 500). */
export function clip(s: string, n = 500): string {
  const v = String(s ?? "");
  return v.length > n ? v.slice(0, n) : v;
}
