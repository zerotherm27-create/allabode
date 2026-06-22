import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { settingsFallback } from "@/lib/settings-schema";

export type { Settings } from "@/lib/settings-schema";
export { settingsFallback, s, settingsSchema } from "@/lib/settings-schema";

export async function getSettings() {
  if (!isSupabaseConfigured()) return settingsFallback;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_settings").select("key, value");
    if (!data || data.length === 0) return settingsFallback;
    const fromDb = Object.fromEntries(
      (data as { key: string; value: string | null }[]).map((r) => [r.key, r.value ?? ""])
    );
    return { ...settingsFallback, ...fromDb };
  } catch {
    return settingsFallback;
  }
}
