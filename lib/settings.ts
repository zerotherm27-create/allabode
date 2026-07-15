import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { settingsFallback } from "@/lib/settings-schema";

export type { Settings } from "@/lib/settings-schema";
export { settingsFallback, s, settingsSchema } from "@/lib/settings-schema";

/**
 * Public, read-only settings access. Uses a plain anon client (no cookies) —
 * site_settings is public CMS data (contact info, hero image overrides),
 * and reading it via the cookie-bound SSR client (lib/supabase/server.ts)
 * forces every page that calls this into fully dynamic rendering, which
 * defeats ISR caching across the entire marketing site since nearly every
 * page calls getSettings(). Mirrors the same client lib/listings.ts already
 * uses for the same reason.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db = url && key ? createSupabaseClient(url, key) : null;

export async function getSettings() {
  if (!db) return settingsFallback;
  try {
    const { data } = await db.from("site_settings").select("key, value");
    if (!data || data.length === 0) return settingsFallback;
    const fromDb = Object.fromEntries(
      (data as { key: string; value: string | null }[]).map((r) => [r.key, r.value ?? ""])
    );
    return { ...settingsFallback, ...fromDb };
  } catch {
    return settingsFallback;
  }
}
