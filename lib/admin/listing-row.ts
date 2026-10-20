export const SPECIALIST_STATUSES = ["Draft", "Available", "Reserved", "Leased", "Sold", "Archived"] as const;

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}
function n(fd: FormData, k: string): number | null {
  const v = s(fd, k);
  if (v == null) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function date(fd: FormData, k: string): string | null {
  const v = s(fd, k);
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const parsed = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : v;
}

export function slugify(v: string): string {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function listingRow(fd: FormData) {
  const title = s(fd, "title") ?? "Untitled";
  const amenities = (s(fd, "amenities") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  return {
    title,
    slug: s(fd, "slug") ?? slugify(title),
    description: s(fd, "description"),
    seo_description: s(fd, "seo_description"),
    location: s(fd, "location"),
    city: s(fd, "city"),
    province: s(fd, "province"),
    private_address: s(fd, "private_address"),
    price: n(fd, "price"),
    price_label: s(fd, "price_label"),
    rent_price: n(fd, "rent_price"),
    rent_price_label: s(fd, "rent_price_label"),
    listing_category: s(fd, "listing_category") ?? "For Sale",
    lease_type: s(fd, "lease_type"),
    property_type: s(fd, "property_type") ?? "Condo",
    status: s(fd, "status") ?? "Draft",
    bedrooms: n(fd, "bedrooms"),
    bathrooms: n(fd, "bathrooms"),
    floor_area: n(fd, "floor_area"),
    lot_area: n(fd, "lot_area"),
    parking: n(fd, "parking"),
    furnishing: s(fd, "furnishing"),
    amenities,
    lease_terms: s(fd, "lease_terms"),
    sale_terms: s(fd, "sale_terms"),
    availability_date: date(fd, "availability_date"),
    is_featured: fd.get("is_featured") === "on",
    clean_title: fd.get("clean_title") === "on",
    owner_name: s(fd, "owner_name"),
    owner_contact: s(fd, "owner_contact"),
    internal_notes: s(fd, "internal_notes"),
    unit_id: s(fd, "unit_id"),
  };
}

/** /listings/<slug> must never shadow a static listings route. */
const RESERVED_SLUGS = ["for-rent", "for-sale", "commercial", "office", "industrial-warehouse", "parking", "lots"];

/**
 * Slug for a new specialist listing, derived from the title (specialists never
 * type one). A reserved word always gets the suffix; pass `suffix` to retry
 * after a unique-constraint collision.
 */
export function specialistListingSlug(title: string, suffix?: string): string {
  const base = slugify(title) || "listing";
  return suffix || RESERVED_SLUGS.includes(base) ? `${base}-${suffix ?? "listing"}` : base;
}

/**
 * Row for a specialist's insert/update. It never carries anything staff-only
 * or privileged: owner/seller details, internal notes, the exact address, the
 * PM unit link, featuring and the slug (the live URL is kept on update and
 * derived server-side on create). The published-status option is never
 * offered, so a status that is not in SPECIALIST_STATUSES (e.g. "Published",
 * set by staff) is left untouched on update and falls back to "Draft" on
 * create. The DB trigger enforces the same rules; the app just never sends them.
 */
export function specialistListingRow(fd: FormData, mode: "create" | "update" = "update") {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    is_featured, unit_id, status, slug,
    owner_name, owner_contact, internal_notes, private_address,
    ...rest
  } = listingRow(fd);
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const requested = s(fd, "status");
  const allowed = requested != null && (SPECIALIST_STATUSES as readonly string[]).includes(requested);
  if (allowed) return { ...rest, status: requested };
  return mode === "create" ? { ...rest, status: "Draft" } : rest;
}
