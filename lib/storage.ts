import type { SupabaseClient } from "@supabase/supabase-js";

export const RECEIPTS_BUCKET = "receipts";
export const FINANCE_DOCS_BUCKET = "finance-docs";
export const DOCUMENTS_BUCKET = "documents";

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
