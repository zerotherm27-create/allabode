import { resolveCallHref, viberHref, type PublicContact } from "@/lib/team/public-contact";

/**
 * The microsite's contact links, built once and shared by the closing
 * "Contact" section, the Signature layout's quick-contact bar and the phone
 * action bar. Mobile and email fall back per row to the company values; phone
 * and Viber are links ("Call me"), never printed digits; Viber, Facebook and
 * LinkedIn only exist when the specialist added them.
 */
export type ContactRowKey = "phone" | "viber" | "email" | "facebook" | "linkedin" | "web" | "location";

export type ContactRow = {
  key: ContactRowKey;
  label: string;
  /** Short label for the compact bars ("Call", "Viber", "Email"). */
  short: string;
  href: string | null;
  /** Web links open in a new tab; tel:, mailto: and viber:// do not. */
  external?: boolean;
  ariaLabel?: string;
};

export function buildContactRows(input: {
  name: string;
  contact: PublicContact;
  hideCallLink: boolean;
  companyPhone: string;
  companyEmail: string;
  location: string;
  domain: string;
  apexOrigin: string;
}): ContactRow[] {
  const { name, contact: own } = input;
  const rows: ContactRow[] = [];

  // "Don't show a call link" removes the row entirely (own and company number alike).
  const phoneHref = resolveCallHref({
    hide: input.hideCallLink,
    ownPhone: own.public_phone,
    companyPhone: input.companyPhone,
  });
  if (phoneHref) {
    rows.push({ key: "phone", label: "Call me", short: "Call", href: phoneHref, ariaLabel: `Call ${name}` });
  }
  if (own.public_viber) {
    rows.push({
      key: "viber",
      label: "Message me on Viber",
      short: "Viber",
      href: viberHref(own.public_viber),
      ariaLabel: `Message ${name} on Viber`,
    });
  }
  const email = own.public_email ?? (input.companyEmail || null);
  if (email) {
    rows.push({ key: "email", label: email, short: "Email", href: `mailto:${email}`, ariaLabel: `Email ${name}` });
  }
  if (own.public_facebook_url) {
    rows.push({
      key: "facebook",
      label: "Facebook",
      short: "Facebook",
      href: own.public_facebook_url,
      external: true,
      ariaLabel: `${name} on Facebook (opens in a new tab)`,
    });
  }
  if (own.public_linkedin_url) {
    rows.push({
      key: "linkedin",
      label: "LinkedIn",
      short: "LinkedIn",
      href: own.public_linkedin_url,
      external: true,
      ariaLabel: `${name} on LinkedIn (opens in a new tab)`,
    });
  }
  rows.push({ key: "web", label: input.domain, short: "Website", href: `${input.apexOrigin}/` });
  if (input.location) {
    rows.push({ key: "location", label: input.location, short: "Location", href: null });
  }
  return rows;
}

/** The direct ways to reach the specialist (call, Viber, email), for the compact bars. */
export function quickContactRows(rows: ContactRow[]): ContactRow[] {
  return rows.filter((r) => r.href && (r.key === "phone" || r.key === "viber" || r.key === "email"));
}
