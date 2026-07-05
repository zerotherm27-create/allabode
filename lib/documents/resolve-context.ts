import type { SupabaseClient } from "@supabase/supabase-js";

export type DocumentContext = {
  personName: string | null;
  personKind: "tenant" | "owner" | null;
  unitId: string | null;
  unitLabel: string | null;
  propertyId: string | null;
  propertyName: string | null;
};

const EMPTY: DocumentContext = {
  personName: null,
  personKind: null,
  unitId: null,
  unitLabel: null,
  propertyId: null,
  propertyName: null,
};

function key(entityType: string, entityId: string) {
  return `${entityType}:${entityId}`;
}

type UnitJoin = { unit_label: string; property_id: string; properties: { name: string } | null } | null;

/**
 * Resolves the polymorphic entity_type/entity_id reference on `documents` rows
 * back to a human name and property/unit context, batched into one query per
 * entity_type bucket (documents has no direct property/unit/person columns).
 */
export async function resolveDocumentContexts(
  supabase: SupabaseClient,
  docs: { entity_type: string; entity_id: string }[]
): Promise<Map<string, DocumentContext>> {
  const map = new Map<string, DocumentContext>();

  const idsByType = new Map<string, Set<string>>();
  for (const d of docs) {
    if (!idsByType.has(d.entity_type)) idsByType.set(d.entity_type, new Set());
    idsByType.get(d.entity_type)!.add(d.entity_id);
  }

  const ownerIds = [...(idsByType.get("owner") ?? [])];
  const propertyIds = [...(idsByType.get("property") ?? [])];
  const leaseIds = [...(idsByType.get("lease") ?? [])];
  const tenantIds = [...(idsByType.get("tenant") ?? [])];

  if (ownerIds.length) {
    const { data } = await supabase.from("owners").select("id,name").in("id", ownerIds);
    for (const o of (data ?? []) as { id: string; name: string }[]) {
      map.set(key("owner", o.id), { ...EMPTY, personName: o.name, personKind: "owner" });
    }
  }

  if (propertyIds.length) {
    const { data } = await supabase
      .from("properties")
      .select("id,name,owners(name)")
      .in("id", propertyIds);
    for (const p of (data ?? []) as unknown as { id: string; name: string; owners: { name: string } | null }[]) {
      map.set(key("property", p.id), {
        ...EMPTY,
        personName: p.owners?.name ?? null,
        personKind: p.owners?.name ? "owner" : null,
        propertyId: p.id,
        propertyName: p.name,
      });
    }
  }

  if (leaseIds.length) {
    const { data } = await supabase
      .from("leases")
      .select("id,unit_id,tenants(name),units(unit_label,property_id,properties(name))")
      .in("id", leaseIds);
    for (const l of (data ?? []) as unknown as { id: string; unit_id: string; tenants: { name: string } | null; units: UnitJoin }[]) {
      map.set(key("lease", l.id), {
        personName: l.tenants?.name ?? null,
        personKind: l.tenants?.name ? "tenant" : null,
        unitId: l.unit_id,
        unitLabel: l.units?.unit_label ?? null,
        propertyId: l.units?.property_id ?? null,
        propertyName: l.units?.properties?.name ?? null,
      });
    }
  }

  if (tenantIds.length) {
    const { data: tenantRows } = await supabase.from("tenants").select("id,name").in("id", tenantIds);
    const nameById = new Map(((tenantRows ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name] as const));

    const { data: leaseRows } = await supabase
      .from("leases")
      .select("tenant_id,unit_id,status,start_date,units(unit_label,property_id,properties(name))")
      .in("tenant_id", tenantIds)
      .order("start_date", { ascending: false });

    type LeaseRow = { tenant_id: string; unit_id: string; status: string; start_date: string; units: UnitJoin };
    const bestLeaseByTenant = new Map<string, LeaseRow>();
    for (const l of (leaseRows ?? []) as unknown as LeaseRow[]) {
      const existing = bestLeaseByTenant.get(l.tenant_id);
      if (!existing || (l.status === "active" && existing.status !== "active")) {
        bestLeaseByTenant.set(l.tenant_id, l);
      }
    }

    for (const tenantId of tenantIds) {
      const lease = bestLeaseByTenant.get(tenantId);
      map.set(key("tenant", tenantId), {
        personName: nameById.get(tenantId) ?? null,
        personKind: "tenant",
        unitId: lease?.unit_id ?? null,
        unitLabel: lease?.units?.unit_label ?? null,
        propertyId: lease?.units?.property_id ?? null,
        propertyName: lease?.units?.properties?.name ?? null,
      });
    }
  }

  return map;
}
