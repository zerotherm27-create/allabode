import type { SupabaseClient } from "@supabase/supabase-js";
import type { UnitOption } from "@/components/admin/listing-form";

type UnitRow = {
  id: string;
  unit_label: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area: number | null;
  base_rent: number | null;
  properties:
    | { name: string; address: string | null; city: string | null; province: string | null; property_type: string | null }
    | { name: string; address: string | null; city: string | null; province: string | null; property_type: string | null }[]
    | null;
};

/** Property-management units offered as an optional auto-fill source on the listing form. */
export async function getListingUnitOptions(supabase: SupabaseClient): Promise<UnitOption[]> {
  const { data } = await supabase
    .from("units")
    .select("id,unit_label,bedrooms,bathrooms,floor_area,base_rent,properties(name,address,city,province,property_type)")
    .order("unit_label");

  return ((data ?? []) as unknown as UnitRow[]).map((u) => {
    const p = Array.isArray(u.properties) ? u.properties[0] : u.properties;
    return {
      id: u.id,
      unitLabel: u.unit_label,
      propertyName: p?.name ?? "",
      propertyAddress: p?.address ?? "",
      city: p?.city ?? null,
      province: p?.province ?? null,
      propertyType: p?.property_type ?? null,
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms,
      floorArea: u.floor_area != null ? Number(u.floor_area) : null,
      baseRent: u.base_rent != null ? Number(u.base_rent) : null,
    };
  });
}
