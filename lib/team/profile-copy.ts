// Pure, import-free (unit tested directly via tests/helpers/load-ts.mjs).
//
// Copy for the public specialist microsite (components/team/microsite/*).
// Everything personal is assembled only from fields the specialist filled in;
// everything else is default or firm-level copy, adapted from the owner's
// mockup and worded to match the service pages under
// app/(marketing)/property-solutions/* so no claim goes further than the site
// already does. Specialists are "accredited real estate salespersons": no
// broker name, licence number, figures, awards or testimonials here.

export const COMPANY_NAME = "All Abode Property Solutions";

type IntroFields = {
  name: string;
  areas: string[];
  specialties: string[];
  languages: string[];
  yearsExperience: number | null;
};

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** "a", "a and b", "a, b, and c". */
export function joinList(items: string[]): string {
  const xs = items.map((s) => s.trim()).filter(Boolean);
  if (xs.length <= 1) return xs[0] ?? "";
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

/**
 * Fallback bio for a specialist who has not written one: one or two plain
 * sentences built only from their own fields, skipping whatever is missing.
 * With nothing but a name it still reads as a complete sentence.
 */
export function composeIntro(f: IntroFields): string {
  const name = f.name.trim();
  const first = firstNameOf(name);
  const areas = joinList(f.areas);
  const specialties = joinList(f.specialties);

  let lead = `${name} is a property specialist with ${COMPANY_NAME}`;
  if (areas && specialties) lead += `, working across ${areas} and helping clients with ${specialties}`;
  else if (areas) lead += `, working across ${areas}`;
  else if (specialties) lead += `, helping clients with ${specialties}`;
  lead += ".";

  const years = f.yearsExperience != null && f.yearsExperience > 0 ? f.yearsExperience : null;
  const languages = joinList(f.languages);
  let second = "";
  if (years && languages) {
    second = `${first} has ${years} ${years === 1 ? "year" : "years"} of experience in real estate and works in ${languages}.`;
  } else if (years) {
    second = `${first} has ${years} ${years === 1 ? "year" : "years"} of experience in real estate.`;
  } else if (languages) {
    second = `${first} works in ${languages}.`;
  }
  return second ? `${lead} ${second}` : lead;
}


/** I-statement facts for the About section, built only from filled-in fields; "" when there are none. */
export function aboutFacts(f: Omit<IntroFields, "name">): string {
  const areas = joinList(f.areas);
  const specialties = joinList(f.specialties);
  const languages = joinList(f.languages);
  const years = f.yearsExperience != null && f.yearsExperience > 0 ? f.yearsExperience : null;
  const parts: string[] = [];
  if (areas && specialties) parts.push(`I work across ${areas}, helping clients with ${specialties}.`);
  else if (areas) parts.push(`I work across ${areas}.`);
  else if (specialties) parts.push(`I help clients with ${specialties}.`);
  if (years && languages) {
    parts.push(`I have ${years} ${years === 1 ? "year" : "years"} of experience in real estate and work in ${languages}.`);
  } else if (years) {
    parts.push(`I have ${years} ${years === 1 ? "year" : "years"} of experience in real estate.`);
  } else if (languages) {
    parts.push(`I work in ${languages}.`);
  }
  return parts.join(" ");
}

/* ---- Microsite default copy (adapted from the owner's mockup) ----------- */

export const HERO_COPY = {
  eyebrow: "Real estate professional",
  /** Shown under the name when the specialist has not written a tagline. */
  defaultTagline: "Your partner in finding the right space",
  paragraph:
    "Helping individuals, families, and investors make confident real estate decisions through trusted advisory and personalized service.",
} as const;

export const ABOUT_COPY = {
  eyebrow: "About me",
  heading: "Real estate guidance with a personal touch",
  goal: "My goal is to make real estate simple, transparent, and stress-free, so you can focus on what matters most.",
  cta: "Get to know me",
} as const;

/** Default first paragraph of "About me" for a specialist without a bio. */
export function aboutIntro(name: string): string {
  return `I'm ${name.trim()}, an accredited real estate salesperson with All Abode PH. I work with clients who value clear information, honest advice, and a smooth, professional experience, whether you're buying, selling, leasing, or investing.`;
}

/**
 * The About section's paragraphs: the specialist's own bio split on blank
 * lines, or (without one) the default intro, a sentence of their own facts
 * when they have any, and the goal line.
 */
export function aboutParagraphs(f: IntroFields & { bio: string | null }): string[] {
  const bio = f.bio?.trim();
  if (bio) return bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const facts = aboutFacts(f);
  return [facts ? `${aboutIntro(f.name)} ${facts}` : aboutIntro(f.name), ABOUT_COPY.goal];
}

/** The navy values panel beside "About me". Icons are Material Symbols names from components/icon.tsx. */
export const ABOUT_VALUES = [
  { icon: "apartment", title: "Client-focused", body: "Personalized support from start to finish" },
  { icon: "verified_user", title: "Professional", body: "Backed by a licensed brokerage and valuation firm" },
  { icon: "trending_up", title: "Result-driven", body: "Helping you achieve your real estate goals" },
] as const;

/** "Part of a trusted firm" strip. Paths are on the main site (prefixed with the apex origin by the component). */
export const FIRM_COPY = {
  eyebrow: "Part of a trusted firm",
  heading: "Backed by All Abode PH",
  body: "All transactions and documentation are coursed through All Abode Brokerage and Valuation OPC, a licensed and registered firm.",
  services: [
    { icon: "home", title: "Brokerage", body: "Buy and sell with confidence", path: "/property-solutions/brokerage" },
    {
      icon: "key",
      title: "Property management",
      body: "Professional care for your property",
      path: "/property-solutions/property-management",
    },
    { icon: "real_estate_agent", title: "Leasing", body: "Find the right tenants", path: "/property-solutions/leasing" },
    {
      icon: "request_quote",
      title: "Appraisal and documentation services",
      body: "Valuations by licensed appraisers and paperwork support",
      path: "/valuation",
    },
  ],
} as const;

export const LISTINGS_COPY = {
  eyebrow: "Featured listings",
  heading: "Selected properties",
  sub: "A curated selection of properties for living and investment.",
  emptyHeading: "No active listings right now",
  emptyBody:
    "New properties come in all the time. Tell me what you're looking for, whether a place to rent, a home to buy, or a space for your business, and I'll send you matching options.",
} as const;

/** How many listings show before "View all properties". */
export const FEATURED_LISTING_COUNT = 3;

export const CTA_COPY = {
  eyebrow: "Let's find your next move",
  heading: "Ready to explore your options?",
  body: "Whether you're looking for a new home, an investment property, or need an appraisal, I'm here to help.",
  cta: "Get in touch",
} as const;

export const CONTACT_COPY = {
  heading: "Contact me",
  sub: "Let's talk about your real estate goals.",
} as const;
