/**
 * schema.org ProfilePage + Person for a specialist's public page. Pure and
 * import-free (unit tested). Only public data goes in: no email, no phone and
 * no licence details, whatever the specialist has published elsewhere.
 */
export type ProfileSchemaInput = {
  /** Origin of the canonical site, e.g. "https://allabodeph.com" (no trailing slash). */
  base: string;
  slug: string;
  name: string;
  description: string;
  photoUrl: string | null;
  areas: string[];
  specialties: string[];
  languages: string[];
  /** Public profile links the specialist chose to publish (Facebook, LinkedIn). */
  sameAs: (string | null | undefined)[];
  companyName: string;
};

export function specialistProfileSchema(input: ProfileSchemaInput): Record<string, unknown> {
  const url = `${input.base}/team/${input.slug}`;
  const sameAs = input.sameAs.filter((u): u is string => typeof u === "string" && /^https:\/\//i.test(u));
  const person: Record<string, unknown> = {
    "@type": "Person",
    "@id": `${url}#person`,
    name: input.name,
    jobTitle: "Property specialist",
    description: input.description,
    url,
    worksFor: { "@type": "Organization", name: input.companyName, url: input.base },
    ...(input.photoUrl ? { image: input.photoUrl } : {}),
    ...(input.areas.length ? { areaServed: input.areas } : {}),
    ...(input.specialties.length ? { knowsAbout: input.specialties } : {}),
    ...(input.languages.length ? { knowsLanguage: input.languages } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    name: `${input.name} | Property specialist`,
    mainEntity: person,
  };
}
