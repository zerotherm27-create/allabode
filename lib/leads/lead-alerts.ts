// Import-free on purpose (loaded directly by unit tests). Pure helpers that decide
// WHO is alerted about a new lead and WHAT the alert says.
//
// Routing rule:
//   - assigned to a specialist -> that specialist + all staff (+ company inbox email)
//   - no specialist (in-house) -> all staff only (+ company inbox email)
//   Specialists never receive another specialist's or an in-house lead.

export type LeadAlertInput = {
  type: string;
  name?: string | null;
  phone?: string | null;
  message?: string | null;
  listing?: string | null;
  specialistName?: string | null;
};

export type LeadRecipient = {
  userId: string;
  audience: "staff" | "specialist";
  link: string;
};

const CHAT_PREFIX = "[Via website chat]";

export function isChatLead(message: string | null | undefined): boolean {
  return typeof message === "string" && message.trimStart().startsWith(CHAT_PREFIX);
}

/** The message text without the chat marker prefix. */
export function cleanLeadMessage(message: string | null | undefined): string {
  if (typeof message !== "string") return "";
  const t = message.trimStart();
  return (t.startsWith(CHAT_PREFIX) ? t.slice(CHAT_PREFIX.length) : t).trim();
}

const TYPE_LABEL: Record<string, string> = {
  inquiry: "inquiry",
  viewing: "viewing request",
  contact: "contact message",
  "list-property": "list-your-property request",
  appraisal: "appraisal request",
  "property-management": "property management lead",
};

/** Staff-side page where the lead can be worked. */
export function staffLinkForType(type: string): string {
  if (type === "appraisal") return "/admin/appraisals";
  if (type === "property-management") return "/admin/leads";
  return "/admin/inquiries";
}

export const SPECIALIST_LEADS_LINK = "/dashboard/specialist/leads";

function oneLine(v: string, max: number): string {
  const t = v.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Title + short body used for the bell, the push, and the email subject. */
export function buildLeadAlert(input: LeadAlertInput): { title: string; body: string } {
  const label = TYPE_LABEL[input.type] ?? "lead";
  const via = isChatLead(input.message) ? " via website chat" : "";
  const who = oneLine(input.name ?? "", 60) || "A visitor";
  const title = input.listing
    ? `New ${label}${via}: ${oneLine(input.listing, 60)}`
    : `New ${label}${via}`;
  const bits = [who, input.phone ? oneLine(input.phone, 30) : ""].filter(Boolean).join(" · ");
  const note = oneLine(cleanLeadMessage(input.message), 100);
  const assigned = input.specialistName ? ` (assigned to ${oneLine(input.specialistName, 40)})` : "";
  return { title, body: `${bits}${note ? ` — ${note}` : ""}${assigned}` };
}

/**
 * Who gets the in-app + push alert. `staffUserIds` are all admin/staff auth ids;
 * `specialistUserId` is the assigned specialist's auth id, or null for in-house leads.
 */
export function resolveLeadRecipients(opts: {
  type: string;
  staffUserIds: string[];
  specialistUserId: string | null;
}): LeadRecipient[] {
  const seen = new Set<string>();
  const out: LeadRecipient[] = [];
  const link = staffLinkForType(opts.type);
  for (const id of opts.staffUserIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ userId: id, audience: "staff", link });
  }
  if (opts.specialistUserId && !seen.has(opts.specialistUserId)) {
    out.push({ userId: opts.specialistUserId, audience: "specialist", link: SPECIALIST_LEADS_LINK });
  }
  return out;
}
