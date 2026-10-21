import { createClient } from "@supabase/supabase-js";
import { isValidSpecialistSlug, specialistPhotoUrl } from "@/lib/team/queries";
import { safeStoredContact, storedHideCallLink, type PublicContact } from "@/lib/team/public-contact";

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
  "id,slug,display_name,tagline,bio,areas,specialties,languages,years_experience,photo_path";

/** Added by 20261023100000_specialist_public_contact.sql; read in a separate, tolerant query. */
const CONTACT_COLS = "public_phone,public_viber,public_facebook_url,public_linkedin_url,public_email";

const NO_CONTACT: PublicContact = {
  public_phone: null,
  public_viber: null,
  public_facebook_url: null,
  public_linkedin_url: null,
  public_email: null,
};

/** Added by 20261023120000_specialist_hide_call_link.sql; its own tolerant query so a missing column never drops the contact details. */
const HIDE_CALL_COL = "hide_call_link";

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
  /** The specialist's own published contact details (each null = use the company value).
   *  Only loaded by getPublicSpecialist(); always all-null in the directory list. */
  contact: PublicContact;
  /** True when the specialist opted out of any call link on their page (false before the migration). */
  hideCallLink: boolean;
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
    contact: NO_CONTACT,
    hideCallLink: false,
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
    const specialist = mapRow(data as Row);
    specialist.contact = await getPublicContact(slug);
    specialist.hideCallLink = await getHideCallLink(slug);
    return specialist;
  } catch {
    return null;
  }
}

/**
 * The published contact details for one slug. Separate from the main query so
 * a missing column (migration not run yet) or any other failure only drops
 * these details (all null = company details) instead of the whole page.
 * Stored values are re-validated before they can become links.
 */
async function getPublicContact(slug: string): Promise<PublicContact> {
  if (!db) return NO_CONTACT;
  try {
    const { data, error } = await db
      .from("public_specialists")
      .select(CONTACT_COLS)
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return NO_CONTACT;
    return safeStoredContact(data as Partial<PublicContact>);
  } catch {
    return NO_CONTACT;
  }
}

/** The "no call link" opt-out for one slug. Tolerant: any failure (e.g. column missing) = false. */
async function getHideCallLink(slug: string): Promise<boolean> {
  if (!db) return false;
  try {
    const { data, error } = await db
      .from("public_specialists")
      .select(HIDE_CALL_COL)
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return false;
    return storedHideCallLink((data as { hide_call_link?: unknown }).hide_call_link);
  } catch {
    return false;
  }
}
