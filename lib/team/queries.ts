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
