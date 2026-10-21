/**
 * Pure, import-free validation for the contact details a property specialist
 * may publish on their microsite (mobile, Viber, Facebook, LinkedIn, public
 * email). Each helper returns a normalised string, null for blank, or an
 * error message. Kept dependency-free so tests can load it directly.
 */

export const PUBLIC_CONTACT_LIMITS = { phone: 200, url: 300, email: 200 } as const;

export type PublicContactInput = {
  phone: string;
  viber: string;
  facebook: string;
  linkedin: string;
  email: string;
};

export type PublicContact = {
  public_phone: string | null;
  public_viber: string | null;
  public_facebook_url: string | null;
  public_linkedin_url: string | null;
  public_email: string | null;
};

type Result = { ok: true; value: string | null } | { ok: false; error: string };

const ok = (value: string | null): Result => ({ ok: true, value });
const bad = (error: string): Result => ({ ok: false, error });

/** Control characters (CR/LF included) and Unicode line/paragraph separators. */
const CONTROL = /[\u0000-\u001f\u007f\u2028\u2029]/;

/**
 * A phone number as "+<digits>" (7 to 15 digits, E.164-sized). Philippine
 * forms are normalised to +63: "0917 123 4567" -> "+639171234567",
 * "639171234567" and "+63 917..." stay +63. Spaces, dots, dashes and
 * brackets are ignored; any other character is refused.
 */
export function normalizePhone(raw: unknown, label = "Mobile number"): Result {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return ok(null);
  if (s.length > PUBLIC_CONTACT_LIMITS.phone || CONTROL.test(s)) return bad(`${label} isn't valid.`);
  if (!/^\+?[\d\s().-]+$/.test(s)) {
    return bad(`${label} can only contain digits, spaces, dashes and a leading +.`);
  }
  const plus = s.startsWith("+");
  let digits = s.replace(/\D/g, "");
  if (!plus) {
    // "00" is the international prefix; a single leading 0 is the PH trunk prefix.
    if (digits.startsWith("00")) digits = digits.slice(2);
    else if (digits.startsWith("0")) digits = `63${digits.slice(1)}`;
    else if (digits.startsWith("9") && digits.length === 10) digits = `63${digits}`;
  }
  if (digits.length < 7 || digits.length > 15) {
    return bad(`${label} should have 7 to 15 digits, for example 0917 123 4567.`);
  }
  return ok(`+${digits}`);
}

/** tel: link for a normalised number. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** Viber chat deep link for a normalised number (the + is encoded as %2B). */
export function viberHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `viber://chat?number=%2B${digits}`;
}

/** Readable form of a normalised +63 mobile: "+63 917 123 4567". Others are returned as is. */
export function formatPhone(phone: string): string {
  const m = /^\+63(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return m ? `+63 ${m[1]} ${m[2]} ${m[3]}` : phone;
}

function normalizeUrl(raw: unknown, label: string, hostOk: (host: string) => boolean, example: string): Result {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return ok(null);
  if (s.length > PUBLIC_CONTACT_LIMITS.url || CONTROL.test(s) || /\s/.test(s)) {
    return bad(`${label} isn't a valid link.`);
  }
  // Any explicit scheme other than https (javascript:, data:, http:, ...) is refused.
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(s);
  let candidate = s;
  if (scheme) {
    if (scheme[1].toLowerCase() !== "https") return bad(`${label} must start with https://.`);
  } else {
    candidate = `https://${s.replace(/^\/+/, "")}`;
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return bad(`${label} isn't a valid link.`);
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    return bad(`${label} isn't a valid link.`);
  }
  if (!hostOk(url.hostname.toLowerCase())) return bad(`${label} should be a link like ${example}.`);
  const out = url.toString();
  if (out.length > PUBLIC_CONTACT_LIMITS.url) return bad(`${label} is too long.`);
  return ok(out);
}

const FACEBOOK_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "www.fb.com"]);

/** https link on facebook.com / m.facebook.com / fb.com; https:// is added when missing. */
export function normalizeFacebookUrl(raw: unknown): Result {
  return normalizeUrl(raw, "Facebook link", (h) => FACEBOOK_HOSTS.has(h), "https://facebook.com/yourpage");
}

/** https link on linkedin.com (any subdomain such as www. or ph.); https:// is added when missing. */
export function normalizeLinkedInUrl(raw: unknown): Result {
  return normalizeUrl(
    raw,
    "LinkedIn link",
    (h) => h === "linkedin.com" || h.endsWith(".linkedin.com"),
    "https://www.linkedin.com/in/yourname",
  );
}

/** Same loose single-address rule as lib/email-address.ts isLikelyEmail (inlined: this file stays import-free). */
function isLikelyEmail(s: string): boolean {
  if (s.length > 254) return false;
  return /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;.]+$/.test(s);
}

export function normalizePublicEmail(raw: unknown): Result {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return ok(null);
  if (s.length > PUBLIC_CONTACT_LIMITS.email || CONTROL.test(s) || !isLikelyEmail(s) || /^mailto:/i.test(s)) {
    return bad("Enter a valid public email, for example name@example.com.");
  }
  return ok(s.toLowerCase());
}

/** Validates all five fields. On success, the DB row values (null for blank). */
export function parsePublicContact(
  input: PublicContactInput,
): { ok: true; value: PublicContact } | { ok: false; error: string } {
  const phone = normalizePhone(input.phone, "Mobile number");
  if (!phone.ok) return phone;
  const viber = normalizePhone(input.viber, "Viber number");
  if (!viber.ok) return viber;
  const facebook = normalizeFacebookUrl(input.facebook);
  if (!facebook.ok) return facebook;
  const linkedin = normalizeLinkedInUrl(input.linkedin);
  if (!linkedin.ok) return linkedin;
  const email = normalizePublicEmail(input.email);
  if (!email.ok) return email;
  return {
    ok: true,
    value: {
      public_phone: phone.value,
      public_viber: viber.value,
      public_facebook_url: facebook.value,
      public_linkedin_url: linkedin.value,
      public_email: email.value,
    },
  };
}

/**
 * Re-checks a stored value before it is rendered as a link (defence in depth
 * against rows written outside the app). Null when it no longer passes.
 */
export function safeStoredContact(row: Partial<Record<keyof PublicContact, string | null | undefined>>): PublicContact {
  const take = (r: Result) => (r.ok ? r.value : null);
  return {
    public_phone: take(normalizePhone(row.public_phone ?? "")),
    public_viber: take(normalizePhone(row.public_viber ?? "")),
    public_facebook_url: take(normalizeFacebookUrl(row.public_facebook_url ?? "")),
    public_linkedin_url: take(normalizeLinkedInUrl(row.public_linkedin_url ?? "")),
    public_email: take(normalizePublicEmail(row.public_email ?? "")),
  };
}
