import type { SupabaseClient } from "@supabase/supabase-js";

export type ApplianceBrandOptions = Record<string, string[]>;

export const ABENSON_SOURCE_URLS = [
  "https://home.abenson.com/home-appliances.html",
  "https://home.abenson.com/small-appliances.html",
  "https://home.abenson.com/home-appliances/refrigerator.html",
] as const;

export const DEFAULT_APPLIANCE_BRAND_OPTIONS: ApplianceBrandOptions = {
  refrigerator: ["Condura", "Fujidenzo", "Haier", "LG", "Midea", "Panasonic", "Samsung", "Sharp", "Toshiba", "Whirlpool"],
  air_conditioner: ["Carrier", "Condura", "Daikin", "Kolin", "LG", "Midea", "Panasonic", "Samsung", "TCL"],
  television: ["Hisense", "LG", "Panasonic", "Samsung", "Sharp", "Sony", "TCL", "Toshiba"],
  microwave: ["Dowell", "Hanabishi", "Midea", "Panasonic", "Samsung", "Sharp", "Whirlpool"],
  induction_cooker: ["Dowell", "Hanabishi", "La Germania", "Midea", "Tecnogas", "Tefal", "Whirlpool"],
  rice_cooker: ["Dowell", "Hanabishi", "Kyowa", "Panasonic", "Sharp", "Tefal", "Tiger"],
  electric_kettle: ["Dowell", "Hanabishi", "Kyowa", "Tefal"],
  washing_machine: ["Fujidenzo", "Haier", "LG", "Midea", "Panasonic", "Samsung", "Sharp", "Toshiba", "Whirlpool"],
  water_heater: ["Ariston", "Caribbean", "Midea", "Panasonic", "Sharp", "Stiebel Eltron"],
  range_hood: ["La Germania", "Midea", "Tecnogas", "Technik"],
  fan: ["Asahi", "Dowell", "Hanabishi", "Kyowa"],
  air_fryer: ["Dowell", "Hanabishi", "Kyowa", "Tefal"],
  coffee_maker: ["Dowell", "Hanabishi", "Kyowa", "Tefal"],
  water_dispenser: ["Caribbean", "Dowell", "Hanabishi", "Midea"],
  others: ["Asahi", "Caribbean", "Condura", "Dowell", "Fujidenzo", "Haier", "Hanabishi", "Kyowa", "LG", "Midea", "Panasonic", "Samsung", "Sharp", "TCL", "Tefal", "Toshiba", "Whirlpool"],
};

const PARTICULARS_CATEGORY_HINTS: [RegExp, string][] = [
  [/ref|refrigerator|fridge/i, "refrigerator"],
  [/air\s*con|aircon|a\/c|air conditioner/i, "air_conditioner"],
  [/tv|television/i, "television"],
  [/microwave/i, "microwave"],
  [/induction/i, "induction_cooker"],
  [/rice/i, "rice_cooker"],
  [/kettle/i, "electric_kettle"],
  [/wash/i, "washing_machine"],
  [/heater/i, "water_heater"],
  [/hood|exhaust/i, "range_hood"],
  [/fan/i, "fan"],
  [/air fryer/i, "air_fryer"],
  [/coffee/i, "coffee_maker"],
  [/dispenser/i, "water_dispenser"],
];

function sortedUnique(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function applianceBrandOptionsForCategory(options: ApplianceBrandOptions, categoryKey: string) {
  return options[categoryKey]?.length ? options[categoryKey] : DEFAULT_APPLIANCE_BRAND_OPTIONS[categoryKey] ?? DEFAULT_APPLIANCE_BRAND_OPTIONS.others;
}

export function applianceCategoryForParticulars(particulars: string) {
  return PARTICULARS_CATEGORY_HINTS.find(([pattern]) => pattern.test(particulars))?.[1] ?? "others";
}

export function applianceBrandOptionsForParticulars(options: ApplianceBrandOptions, particulars: string) {
  return applianceBrandOptionsForCategory(options, applianceCategoryForParticulars(particulars));
}

export async function fetchApplianceBrandOptions(supabase: SupabaseClient): Promise<ApplianceBrandOptions> {
  const [{ data: brands, error: brandsError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase.from("appliance_brands").select("id,name").eq("is_active", true).order("name"),
    supabase.from("appliance_brand_categories").select("brand_id,category_key,sort_order").order("sort_order"),
  ]);

  if (brandsError || categoriesError || !brands?.length || !categories?.length) {
    return DEFAULT_APPLIANCE_BRAND_OPTIONS;
  }

  const brandNames = new Map((brands as { id: string; name: string }[]).map((row) => [row.id, row.name]));
  const out: ApplianceBrandOptions = {};
  for (const row of categories as { brand_id: string; category_key: string }[]) {
    const name = brandNames.get(row.brand_id);
    if (!name) continue;
    out[row.category_key] = [...(out[row.category_key] ?? []), name];
  }

  return Object.fromEntries(
    Object.entries({ ...DEFAULT_APPLIANCE_BRAND_OPTIONS, ...out }).map(([key, values]) => [key, sortedUnique(values)]),
  );
}
