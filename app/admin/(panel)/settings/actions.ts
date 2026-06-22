"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateSettingsGroup(formData: FormData) {
  const supabase = await createClient();

  const updates: { key: string; value: string; label: string; group_name: string; type: string }[] = [];
  formData.forEach((value, key) => {
    if (key.startsWith("__")) return; // skip meta fields
    if (typeof value === "string") {
      const label = String(formData.get(`__label_${key}`) ?? key);
      const group = String(formData.get(`__group`) ?? "");
      const type  = String(formData.get(`__type_${key}`) ?? "text");
      updates.push({ key, value, label, group_name: group, type });
    }
  });

  const { error } = await supabase
    .from("site_settings")
    .upsert(updates, { onConflict: "key" });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/contact");

  return { ok: true };
}
