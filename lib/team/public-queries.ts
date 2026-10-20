import { createClient } from "@supabase/supabase-js";
import { isValidSpecialistSlug, specialistPhotoUrl } from "@/lib/team/queries";

/**
 * Public, read-only access to approved property specialists via the
 * `public_specialists` view (no email/phone/auth id). Plain anon client like
 * lib/listings.ts. Fail-soft by design: until the specialists migration has
 * been applied the view does not exist, so every helper swallows errors and
 * returns [] / null rather than throwing.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db = url && key ? createClient(url, key) : null;

const COLS =
  "id,slug,display_name,tagline,bio,areas,specialties,languages,years_experience,photo_path,license_mode,license_no";

type Row = {
  id: string;
  slug: string;
  display_name: string;
  tagline: string | null;
  bio: string | null;
  areas: string[] | null;
  specialties: string[] | null;
  languages: string[] | null;
  years_experience: number | null;
  photo_path: string | null;
  license_mode: "own" | "accredited";
  license_no: string | null;
};

export type PublicSpecialist = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  bio: string | null;
  areas: string[];
  specialties: string[];
  languages: string[];
  yearsExperience: number | null;
  photoUrl: string | null;
  licenseMode: "own" | "accredited";
  licenseNo: string | null;
};

function mapRow(r: Row): PublicSpecialist {
  return {
    id: r.id,
    slug: r.slug,
    name: r.display_name,
    tagline: r.tagline?.trim() || null,
    bio: r.bio?.trim() || null,
    areas: r.areas ?? [],
    specialties: r.specialties ?? [],
    languages: r.languages ?? [],
    yearsExperience: r.years_experience,
    photoUrl: specialistPhotoUrl(r.photo_path),
    licenseMode: r.license_mode,
    licenseNo: r.license_no,
  };
}

/** All approved specialists with a subdomain. Never throws; [] on any failure. */
export async function getPublicSpecialists(): Promise<PublicSpecialist[]> {
  if (!db) return [];
  try {
    const { data, error } = await db.from("public_specialists").select(COLS);
    if (error || !Array.isArray(data)) return [];
    return (data as Row[]).filter((r) => isValidSpecialistSlug(r.slug)).map(mapRow);
  } catch {
    return [];
  }
}

/** One approved specialist by slug. Null for a malformed slug (no query is made), unknown, unapproved, or any failure. */
export async function getPublicSpecialist(slug: string): Promise<PublicSpecialist | null> {
  if (!db || !isValidSpecialistSlug(slug)) return null;
  try {
    const { data, error } = await db
      .from("public_specialists")
      .select(COLS)
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data as Row);
  } catch {
    return null;
  }
}
