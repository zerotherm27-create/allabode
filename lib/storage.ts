import type { SupabaseClient } from "@supabase/supabase-js";

export const RECEIPTS_BUCKET = "receipts";
export const FINANCE_DOCS_BUCKET = "finance-docs";
export const DOCUMENTS_BUCKET = "documents";
export const AGREEMENTS_BUCKET = "agreements";
export const LISTING_IMAGES_BUCKET = "listing-images";

/** Short-lived signed URL for a private storage object (spec §17.2). */
export async function signedUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds = 120
): Promise<string | null> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  return data?.signedUrl ?? null;
}

/** Recovers the object path from a Supabase Storage URL for the given bucket —
 *  works whether the URL is a `.../object/public/<bucket>/<path>` (legacy,
 *  pre-privacy-change rows) or a `.../object/sign/<bucket>/<path>?token=...`
 *  (already-signed) URL, since both share the same `/<bucket>/` marker. */
export function storagePathFromUrl(bucket: string, url: string): string | null {
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length).split("?")[0];
}

/** Batch-resolves many object paths to signed URLs in a single request —
 *  use this instead of calling `signedUrl()` in a loop when rendering a page
 *  with many images (a listings grid, a gallery). Paths that fail to sign
 *  (e.g. already deleted) are simply omitted from the returned map. */
export async function signedUrlsForPaths(
  supabase: SupabaseClient,
  bucket: string,
  paths: string[],
  expiresInSeconds = 900
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(paths)];
  if (unique.length === 0) return map;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(unique, expiresInSeconds);
  for (const row of data ?? []) {
    if (row.signedUrl && row.path) map.set(row.path, row.signedUrl);
  }
  return map;
}
