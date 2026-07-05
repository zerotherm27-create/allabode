"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export type PropertyOption = { id: string; name: string };
export type UnitOption = { id: string; label: string; propertyId: string };

export function DocumentsFilterBar({
  properties,
  units,
  propertyId,
  unitId,
}: {
  properties: PropertyOption[];
  units: UnitOption[];
  propertyId: string;
  unitId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const visibleUnits = propertyId ? units.filter((u) => u.propertyId === propertyId) : units;

  function updateParam(key: "property_id" | "unit_id", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === "property_id") params.delete("unit_id");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        aria-label="Filter by property"
        value={propertyId}
        onChange={(e) => updateParam("property_id", e.target.value)}
        className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-navy"
      >
        <option value="">All properties</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <select
        aria-label="Filter by unit"
        value={unitId}
        onChange={(e) => updateParam("unit_id", e.target.value)}
        className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-navy"
      >
        <option value="">All units</option>
        {visibleUnits.map((u) => (
          <option key={u.id} value={u.id}>{u.label}</option>
        ))}
      </select>
    </div>
  );
}
