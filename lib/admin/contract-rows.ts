import type { SupabaseClient } from "@supabase/supabase-js";

export type ContractType = "pm" | "tenancy" | "parking" | "short_term_rental" | "addendum";

export type ContractRow = {
  id: string;
  type: ContractType;
  href: string;
  name: string;
  email: string;
  detail: string;
  status: string;
  statusLabel: string;
  created_at: string;
  signed_at: string | null;
};

/** Narrow the merged contract list to one person. Omit for the full admin list. */
export type ContractScope =
  | { party: "tenant"; id: string; email: string }
  | { party: "owner"; id: string; email: string; unitIds: string[] };

export const PM_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent — awaiting owner",
  owner_signed: "Owner signed — awaiting countersign",
  completed: "Fully executed",
  voided: "Voided",
};
export const TENANCY_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent — awaiting tenant",
  tenant_signed: "Tenant signed — awaiting landlord",
  completed: "Fully executed",
  voided: "Voided",
};
export const CONTRACT_STATUS_COLOR: Record<string, string> = {
  draft: "bg-surface-gray text-slate",
  sent: "bg-gold/15 text-gold-bright",
  owner_signed: "bg-reserved/15 text-reserved",
  tenant_signed: "bg-reserved/15 text-reserved",
  completed: "bg-available/15 text-available",
  voided: "bg-error/10 text-error",
};
export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  pm: "PM Agreement",
  tenancy: "Tenancy",
  parking: "Parking",
  short_term_rental: "Short Term Rental",
  addendum: "Addendum",
};
export const CONTRACT_TYPE_COLOR: Record<ContractType, string> = {
  pm: "bg-navy/10 text-navy",
  tenancy: "bg-gold/15 text-gold-bright",
  parking: "bg-navy-700/10 text-navy-700",
  short_term_rental: "bg-available/15 text-available",
  addendum: "bg-reserved/15 text-reserved",
};

type Named = { name?: string } | null;

type PmRaw = {
  id: string;
  owner_email: string;
  owner_name_hint: string | null;
  owner_details: Named;
  linked_owner_id: string | null;
  status: string;
  created_at: string;
  manager_signed_at: string | null;
};

type TenantContractRaw = {
  id: string;
  tenant_email: string;
  tenant_name_hint: string | null;
  tenant_details: Named;
  landlord_email: string | null;
  linked_tenant_id: string | null;
  status: string;
  created_at: string;
  landlord_signed_at: string | null;
};
type TenancyRaw = TenantContractRaw & {
  unit_id: string | null;
  property_details: { buildingName?: string; floorUnit?: string } | null;
};
type ParkingRaw = TenantContractRaw & {
  parking_details: { slotLabel?: string; buildingName?: string } | null;
};
type StrRaw = TenantContractRaw & {
  property_details: { buildingName?: string; unitNumber?: string } | null;
};
type AddendumRaw = TenantContractRaw & {
  parent_snapshot: { contractTitle?: string; referenceCode?: string } | null;
};

const lc = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** PostgREST `or=` value, double-quoted so commas/parentheses in an email can't break the filter. */
const quoted = (s: string) => `"${s.replace(/"/g, '\\"')}"`;

/**
 * Fetches all five contract families and normalises them into one list, newest first.
 *
 * Contracts are linked to people by email until they complete (`linked_*_id` is only
 * filled on completion), so scoped queries match on email too. `ilike` is used so case
 * doesn't matter, then rows are re-checked with an exact lowercase compare in JS because
 * `_` and `%` are wildcards in `ilike`.
 */
export async function fetchContractRows(
  supabase: SupabaseClient,
  scope?: ContractScope,
): Promise<ContractRow[]> {
  const email = scope ? scope.email.trim() : "";

  // Per-table `or` clause (undefined = no clause → unscoped, or this table can't match the scope).
  const tenantClause = scope?.party === "tenant"
    ? `linked_tenant_id.eq.${scope.id},tenant_email.ilike.${quoted(email)}`
    : undefined;
  const landlordClause = scope?.party === "owner" ? `landlord_email.ilike.${quoted(email)}` : undefined;
  const tenancyOwnerClause = scope?.party === "owner"
    ? [landlordClause, scope.unitIds.length ? `unit_id.in.(${scope.unitIds.join(",")})` : null].filter(Boolean).join(",")
    : undefined;
  const pmClause = scope?.party === "owner"
    ? `linked_owner_id.eq.${scope.id},owner_email.ilike.${quoted(email)}`
    : undefined;

  const common = "id,tenant_email,tenant_name_hint,tenant_details,landlord_email,linked_tenant_id,status,created_at,landlord_signed_at";
  const clauseFor = (ownerClause?: string) => (scope?.party === "tenant" ? tenantClause : ownerClause);

  const run = async <T,>(table: string, select: string, or: string | undefined, skip = false): Promise<T[]> => {
    if (skip) return [];
    let q = supabase.from(table).select(select).order("created_at", { ascending: false });
    if (or) q = q.or(or);
    const { data } = await q;
    return (data ?? []) as unknown as T[];
  };

  const [pm, tenancy, parking, str, addendum] = await Promise.all([
    run<PmRaw>(
      "agreements",
      "id,owner_email,owner_name_hint,owner_details,linked_owner_id,status,created_at,manager_signed_at",
      pmClause,
      scope?.party === "tenant",
    ),
    run<TenancyRaw>("tenancy_agreements", `${common},unit_id,property_details`, clauseFor(tenancyOwnerClause)),
    run<ParkingRaw>("parking_agreements", `${common},parking_details`, clauseFor(landlordClause)),
    run<StrRaw>("short_term_rental_agreements", `${common},property_details`, clauseFor(landlordClause)),
    run<AddendumRaw>("addenda", `${common},parent_snapshot`, clauseFor(landlordClause)),
  ]);

  const matchesTenant = (r: TenantContractRaw) =>
    scope?.party !== "tenant" || r.linked_tenant_id === scope.id || lc(r.tenant_email) === lc(scope.email);
  const matchesLandlord = (r: TenantContractRaw & { unit_id?: string | null }, withUnit = false) =>
    scope?.party !== "owner" ||
    lc(r.landlord_email) === lc(scope.email) ||
    (withUnit && !!r.unit_id && scope.unitIds.includes(r.unit_id));
  const matches = (r: TenantContractRaw & { unit_id?: string | null }, withUnit = false) =>
    scope?.party === "tenant" ? matchesTenant(r) : matchesLandlord(r, withUnit);

  const tenantName = (r: TenantContractRaw) => r.tenant_details?.name || r.tenant_name_hint || r.tenant_email;

  const rows: ContractRow[] = [
    ...pm
      .filter((r) => scope?.party !== "owner" || r.linked_owner_id === scope.id || lc(r.owner_email) === lc(scope.email))
      .map((r): ContractRow => ({
        id: r.id,
        type: "pm",
        href: `/admin/contracts/${r.id}`,
        name: r.owner_details?.name || r.owner_name_hint || r.owner_email,
        email: r.owner_email,
        detail: "Property Management",
        status: r.status,
        statusLabel: PM_STATUS_LABEL[r.status] ?? r.status,
        created_at: r.created_at,
        signed_at: r.manager_signed_at,
      })),
    ...tenancy.filter((r) => matches(r, true)).map((r): ContractRow => ({
      id: r.id,
      type: "tenancy",
      href: `/admin/contracts/tenancy/${r.id}`,
      name: tenantName(r),
      email: r.tenant_email,
      detail: [r.property_details?.buildingName, r.property_details?.floorUnit].filter(Boolean).join(" ") || "Tenancy",
      status: r.status,
      statusLabel: TENANCY_STATUS_LABEL[r.status] ?? r.status,
      created_at: r.created_at,
      signed_at: r.landlord_signed_at,
    })),
    ...parking.filter((r) => matches(r)).map((r): ContractRow => ({
      id: r.id,
      type: "parking",
      href: `/admin/contracts/parking/${r.id}`,
      name: tenantName(r),
      email: r.tenant_email,
      detail: [r.parking_details?.slotLabel, r.parking_details?.buildingName].filter(Boolean).join(", ") || "Parking",
      status: r.status,
      statusLabel: TENANCY_STATUS_LABEL[r.status] ?? r.status,
      created_at: r.created_at,
      signed_at: r.landlord_signed_at,
    })),
    ...str.filter((r) => matches(r)).map((r): ContractRow => ({
      id: r.id,
      type: "short_term_rental",
      href: `/admin/contracts/short-term-rental/${r.id}`,
      name: tenantName(r),
      email: r.tenant_email,
      detail: [r.property_details?.unitNumber, r.property_details?.buildingName].filter(Boolean).join(", ") || "Short Term Rental",
      status: r.status,
      statusLabel: TENANCY_STATUS_LABEL[r.status] ?? r.status,
      created_at: r.created_at,
      signed_at: r.landlord_signed_at,
    })),
    ...addendum.filter((r) => matches(r)).map((r): ContractRow => ({
      id: r.id,
      type: "addendum",
      href: `/admin/contracts/addendum/${r.id}`,
      name: tenantName(r),
      email: r.tenant_email,
      detail: [r.parent_snapshot?.contractTitle, r.parent_snapshot?.referenceCode].filter(Boolean).join(" · ") || "Addendum",
      status: r.status,
      statusLabel: TENANCY_STATUS_LABEL[r.status] ?? r.status,
      created_at: r.created_at,
      signed_at: r.landlord_signed_at,
    })),
  ];

  return rows.sort((x, y) => (x.created_at < y.created_at ? 1 : -1));
}
