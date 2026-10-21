// Pure, import-free (unit tested directly via tests/helpers/load-ts.mjs, which
// cannot resolve imports, so the few helpers below mirror profile-copy.ts and
// the limits mirror PROFILE_LIMITS in profile.ts).
//
// Ready-made starting text for a specialist's tagline and bio. Wording is
// first person or the specialist's name only (never gendered), uses only
// fields that have data, and never states a number the specialist did not give.

const TAGLINE_MAX = 140; // PROFILE_LIMITS.tagline
const BIO_MAX = 2000; // PROFILE_LIMITS.bio
const MAX_LIST_ITEMS = 4; // keep sentences readable
const DEFAULT_TAGLINE = "Your partner in finding the right space"; // HERO_COPY.defaultTagline

export type SuggestInput = {
  name?: string;
  areas?: string[];
  specialties?: string[];
  languages?: string[];
  years?: number | null;
};

function clean(items: string[] | undefined, max = MAX_LIST_ITEMS): string[] {
  return (items ?? []).map((s) => s.trim()).filter(Boolean).slice(0, max);
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}

function cap(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[,\s]+$/, "")}.`;
}

/** One short line for under the name. Falls back to the site default with no data. */
export function suggestTagline(f: Pick<SuggestInput, "areas" | "specialties">): string {
  const areas = clean(f.areas, 3);
  const specialties = clean(f.specialties, 2);
  let line = DEFAULT_TAGLINE;
  if (areas.length) line = `Property guidance across ${joinList(areas)}`;
  else if (specialties.length) line = `Helping clients with ${joinList(specialties)}`;
  return cap(line, TAGLINE_MAX);
}

/** Two short first-person paragraphs; every sentence needs its own data. */
export function suggestBio(f: SuggestInput): string {
  const name = (f.name ?? "").trim();
  const areas = joinList(clean(f.areas));
  const specialties = joinList(clean(f.specialties));
  const languages = joinList(clean(f.languages));
  const years = f.years != null && Number.isInteger(f.years) && f.years > 0 ? f.years : null;

  const intro = name
    ? `Hi, I'm ${firstNameOf(name)}, a property specialist with All Abode Property Solutions.`
    : "I'm a property specialist with All Abode Property Solutions.";
  const first: string[] = [intro];
  if (areas && specialties) first.push(`I work across ${areas}, helping clients with ${specialties}.`);
  else if (areas) first.push(`I work across ${areas}.`);
  else if (specialties) first.push(`I help clients with ${specialties}.`);
  if (years && languages) {
    first.push(`I have ${years} ${years === 1 ? "year" : "years"} of experience in real estate and work in ${languages}.`);
  } else if (years) {
    first.push(`I have ${years} ${years === 1 ? "year" : "years"} of experience in real estate.`);
  } else if (languages) {
    first.push(`I work in ${languages}.`);
  }

  const second =
    "I focus on clear information, honest advice, and a smooth experience from the first viewing to the final paperwork. Get in touch and tell me what you're looking for.";

  return cap(`${first.join(" ")}\n\n${second}`, BIO_MAX);
}

export type ChecklistInput = {
  photoPath?: string | null;
  tagline?: string | null;
  bio?: string | null;
  areas?: string[] | null;
  specialties?: string[] | null;
  languages?: string[] | null;
};

export type ChecklistItem = { key: string; label: string; done: boolean };

export function profileChecklist(p: ChecklistInput): {
  items: ChecklistItem[];
  done: number;
  total: number;
  complete: boolean;
} {
  const has = (s: string | null | undefined) => !!s && s.trim().length > 0;
  const some = (xs: string[] | null | undefined) => (xs ?? []).some((x) => x.trim().length > 0);
  const items: ChecklistItem[] = [
    { key: "photo", label: "Upload your portrait photo", done: has(p.photoPath) },
    { key: "tagline", label: "Write a tagline", done: has(p.tagline) },
    { key: "bio", label: "Write your About text", done: has(p.bio) },
    { key: "areas", label: "Add at least one area you cover", done: some(p.areas) },
    { key: "specialties", label: "Add at least one specialty", done: some(p.specialties) },
    { key: "languages", label: "Add at least one language", done: some(p.languages) },
  ];
  const done = items.filter((i) => i.done).length;
  return { items, done, total: items.length, complete: done === items.length };
}
