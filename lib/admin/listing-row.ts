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
export const RESERVED_LISTING_ROUTES = [
  "for-rent", "for-sale", "commercial", "office", "industrial-warehouse", "parking", "lots",
] as const;

/** Approval states in which a specialist may hard-delete a listing. A live (approved)
 *  listing is archived instead: deleting it would cascade into staff-owned records. */
export const SPECIALIST_DELETABLE_APPROVALS = ["draft", "submitted", "rejected"] as const;

/** A specialist may hard-delete only a listing that has never been live: not
 *  approved now, and not approved at any point (`ever_approved`, which also
 *  covers a listing staff took down). Mirrors the DB delete policy. */
export function specialistCanDelete(
  approvalStatus: string | null | undefined,
  everApproved: boolean | null | undefined = false,
): boolean {
  if (everApproved) return false;
  return (SPECIALIST_DELETABLE_APPROVALS as readonly string[]).includes(approvalStatus ?? "draft");
}

/** Photo upload limits for specialists (stricter than staff). */
export const SPECIALIST_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const SPECIALIST_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const SPECIALIST_PHOTO_MAX_FILES = 10;

/** First problem with a batch of photos to upload, or null when they are fine. */
export function specialistPhotoError(files: { name: string; type: string; size: number }[]): string | null {
  if (files.length > SPECIALIST_PHOTO_MAX_FILES) {
    return `Add up to ${SPECIALIST_PHOTO_MAX_FILES} photos at a time.`;
  }
  for (const f of files) {
    if (!(SPECIALIST_PHOTO_TYPES as readonly string[]).includes(f.type)) {
      return `"${f.name}" isn't a JPEG, PNG or WebP image.`;
    }
    if (f.size > SPECIALIST_PHOTO_MAX_BYTES) return `"${f.name}" is over 10 MB. Choose a smaller image.`;
  }
  return null;
}

/**
 * Slug for a new specialist listing, derived from the title (specialists never
 * type one). A reserved word always gets the suffix; pass `suffix` to retry
 * after a unique-constraint collision.
 */
export function specialistListingSlug(title: string, suffix?: string): string {
  const base = slugify(title) || "listing";
  return suffix || (RESERVED_LISTING_ROUTES as readonly string[]).includes(base) ? `${base}-${suffix ?? "listing"}` : base;
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
