import { createClient } from "@supabase/supabase-js";

/**
 * The licensed broker the specialists are accredited under. Read from
 * `site_settings` (publicly readable) with a plain anon client, like
 * lib/listings.ts, so it works anywhere. Null when the PRC licence number
 * is empty/missing or the query fails — callers then omit the licence line.
 */
export async function getBroker(): Promise<{ name: string; licenseNo: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const db = createClient(url, key);
    const { data, error } = await db
      .from("site_settings")
      .select("key,value")
      .in("key", ["broker_name", "broker_prc_license"]);
    if (error || !data) return null;
    const map = Object.fromEntries(
      data.map((r: { key: string; value: string | null }) => [r.key, (r.value ?? "").trim()]),
    );
    if (!map.broker_prc_license) return null;
    return { name: map.broker_name || "", licenseNo: map.broker_prc_license };
  } catch {
    return null;
  }
}
