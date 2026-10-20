// Pure, import-free (unit tested directly via tests/helpers/load-ts.mjs).
//
// Copy for the public specialist portfolio. Everything personal is assembled
// only from fields the specialist filled in; everything else is firm-level
// (All Abode's standard way of working), worded to match the service pages
// under app/(marketing)/property-solutions/* so no claim goes further than
// the site already does.

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

/**
 * "How we'll work together": All Abode's standard process, true for every
 * specialist. Paraphrases the brokerage and leasing process steps on the
 * service pages (requirement review, viewings, offers/terms and documents,
 * turnover and post-transaction follow-up, optional property management).
 */
export const PROCESS_STEPS = [
  {
    title: "Consultation",
    body: "We start with what you need: your budget, preferred location, timeline, and the type of property, or the details of the property you want to rent out or sell.",
  },
  {
    title: "Shortlist and viewings",
    body: "You get options matched to your brief, and we schedule and coordinate the viewings, so your time goes to properties that fit.",
  },
  {
    title: "Negotiation and documentation",
    body: "We help coordinate offers, terms, and payment arrangements, then the lease or transaction documents and the requirements that come with them.",
  },
  {
    title: "Turnover and after-care",
    body: "We coordinate the final steps and turnover. Owners can keep going with All Abode property management after move-in if they prefer.",
  },
] as const;

/**
 * "Why clients choose All Abode": firm-level facts only, each stated on the
 * site already (home page, brokerage, documentation-assistance, property
 * management and valuation pages). No broker name, licence number, figures,
 * awards or testimonials.
 */
export const FIRM_POINTS = [
  {
    icon: "verified_user",
    title: "Licensed practice",
    body: "Brokerage work is carried out under a licensed real estate practice.",
  },
  {
    icon: "description",
    title: "Documentation assistance",
    body: "Help coordinating title transfer, tax payments, notarial requirements, and property paperwork.",
  },
  {
    icon: "home_work",
    title: "Property management in-house",
    body: "Rent collection, maintenance, and owner coordination for owners who want ongoing care.",
  },
  {
    icon: "request_quote",
    title: "Valuation and appraisal",
    body: "Formal appraisal reports prepared by duly licensed real estate appraisers.",
  },
] as const;
