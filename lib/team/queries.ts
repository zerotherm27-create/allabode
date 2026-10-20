/**
 * Pure helpers for showing a property specialist on public pages. Kept
 * import-free so they can be unit-tested directly.
 */

const PORTRAIT_PATH = /^[0-9a-f-]{36}\/portrait\.jpg$/;

/**
 * Public URL of a specialist's portrait. The `specialist-photos` bucket is
 * public-read, so no signing is needed. Only the exact `{uuid}/portrait.jpg`
 * key the app writes is accepted; anything else (or a missing base URL)
 * returns null so callers fall back to initials.
 */
export function specialistPhotoUrl(path: string | null | undefined): string | null {
  if (!path || !PORTRAIT_PATH.test(path)) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/specialist-photos/${path}`;
}

/** Up to two uppercase initials from a display name ("Maria Santos" -> "MS"). */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return "";
  const first = Array.from(words[0].replace(/^[^\p{L}\p{N}]+/u, ""))[0] ?? "";
  if (words.length === 1) return first.toUpperCase();
  const last = Array.from(words[words.length - 1].replace(/^[^\p{L}\p{N}]+/u, ""))[0] ?? "";
  return (first + last).toUpperCase();
}

/** Shape every approved specialist's subdomain/slug takes (matches the DB check). */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/** True when a route param could be an approved specialist slug; lets pages 404 without a query. */
export function isValidSpecialistSlug(slug: unknown): slug is string {
  return typeof slug === "string" && SLUG_PATTERN.test(slug);
}

/** Meta description from a specialist's tagline/bio: whitespace collapsed, cut at a word boundary near `max` chars. */
export function metaDescription(
  tagline: string | null | undefined,
  bio: string | null | undefined,
  fallback: string,
  max = 155,
): string {
  const source = ((tagline ?? "").trim() || (bio ?? "").trim()).replace(/\s+/g, " ");
  if (!source) return fallback;
  if (source.length <= max) return source;
  const cut = source.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!-]+$/, "")}…`;
}
