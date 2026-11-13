import { createClient } from "@supabase/supabase-js";
import {
  listings as mockListings,
  type Listing,
  type ListingStatus,
} from "@/lib/data";
import type { NearbyPlace } from "@/lib/nearby-places";
import { LISTING_IMAGES_BUCKET, storagePathFromUrl } from "@/lib/storage";
import { specialistTitleLine, storedDesignation } from "@/lib/team/license";
import { specialistPhotoUrl } from "@/lib/team/queries";
import { listingMarkets, listingStatusLabel, listingTypeLabels, type ListingCategory } from "@/lib/listing-category";

/**
 * Public, read-only listings access. Uses a plain anon client (no cookies) so it
 * works in server components, route handlers, and generateStaticParams alike.
 * Falls back to the mock data in `lib/data.ts` whenever Supabase is unconfigured,
 * errors, or returns nothing — so the site always renders.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db = url && key ? createClient(url, key) : null;

const COLS =
  "id,slug,title,location,price,price_label,rent_price,rent_price_label,description,seo_description,listing_category,lease_type,property_type,status,bedrooms,bathrooms,floor_area,lot_area,parking,furnishing,lease_terms,sale_terms,availability_date,is_featured,clean_title,created_at,nearby_places,nearby_places_updated_at,listing_images(url,alt_text,sort_order)";

type Row = {
  id: string;
  slug: string;
  title: string;
  location: string | null;
  price: number | null;
  price_label: string | null;
  rent_price: number | null;
  rent_price_label: string | null;
  description: string | null;
  seo_description: string | null;
  listing_category: ListingCategory;
  lease_type: string | null;
  property_type: string;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area: number | null;
  lot_area: number | null;
  parking: number | null;
  furnishing: string | null;
  lease_terms: string | null;
  sale_terms: string | null;
  availability_date: string | null;
  is_featured: boolean;
  clean_title: boolean;
  nearby_places: NearbyPlace[] | null;
  nearby_places_updated_at: string | null;
  listing_images: { url: string; alt_text: string | null; sort_order: number }[] | null;
};

const GRADIENTS = [
  "from-navy via-navy-700 to-navy-600",
  "from-navy-800 via-navy-700 to-navy-600",
  "from-navy via-navy-800 to-navy-700",
  "from-navy-700 via-navy-600 to-navy-800",
  "from-navy-800 via-navy to-navy-700",
  "from-navy-600 via-navy-700 to-navy-800",
];

function gradientFor(slug: string) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

const COMMERCIAL = new Set(["Commercial", "Office", "Warehouse", "Lot", "Parking"]);

function uiStatus(row: Row): ListingStatus {
  if (row.status === "Reserved") return "Reserved";
  if (row.status === "Sold") return "Sold";
  if (row.status === "Leased") return "Leased";
  return listingStatusLabel(row.listing_category);
}

function fmtPeso(value: number): string {
  return `₱ ${Math.round(value).toLocaleString("en-PH")}`;
}

/** Sale-side price — set for "For Sale" and dual-market listings. */
function fmtSalePrice(row: Row): string | undefined {
  if (row.listing_category === "For Lease") return undefined;
  if (row.price == null) return undefined;
  return fmtPeso(Number(row.price));
}

/** Rent-side price — from `price` for plain "For Lease" (unchanged behavior),
 *  or from the new `rent_price` for dual-market listings. */
function fmtRentPrice(row: Row): string | undefined {
  if (row.listing_category === "For Lease") {
    if (row.price == null) return undefined;
    return `${fmtPeso(Number(row.price))}/mo`;
  }
  if (row.listing_category === "For Sale and For Lease") {
    if (row.rent_price == null) return undefined;
    return `${fmtPeso(Number(row.rent_price))}/mo`;
  }
  return undefined;
}

function fmtPrice(row: Row): string {
  // Primary/single-price string, kept for contexts that only want one value
  // (price sort/filter, AI description generator, non-dual-market listings).
  return fmtSalePrice(row) ?? fmtRentPrice(row) ?? "Price on request";
}

function mapRow(row: Row): Listing {
  const images = (row.listing_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({ url: img.url, alt: img.alt_text }));
  return {
    id: row.slug,
    dbId: row.id,
    title: row.title,
    location: row.location ?? "",
    price: fmtPrice(row),
    salePrice: fmtSalePrice(row),
    rentPrice: fmtRentPrice(row),
    description: row.description ?? undefined,
    seoDescription: row.seo_description ?? undefined,
    cleanTitle: row.clean_title,
    status: uiStatus(row),
    type: COMMERCIAL.has(row.property_type) ? "Commercial" : "Residential",
    beds: row.bedrooms ?? undefined,
    baths: row.bathrooms ?? undefined,
    area: row.floor_area != null ? `${Math.round(Number(row.floor_area))} sqm` : "",
    gradient: gradientFor(row.slug),
    images,
    propertyType: row.property_type,
    listingType: listingTypeLabels(row.listing_category, row.lease_type).join(" · "),
    listingTypes: listingTypeLabels(row.listing_category, row.lease_type),
    listingMarkets: listingMarkets(row.listing_category),
    furnishing: row.furnishing ?? undefined,
    parking: row.parking ?? undefined,
    lotArea: row.lot_area != null ? `${Math.round(Number(row.lot_area))} sqm` : undefined,
    leaseTerms: row.lease_terms ?? undefined,
    saleTerms: row.sale_terms ?? undefined,
    availabilityDate: row.availability_date ?? undefined,
    nearbyPlaces: row.nearby_places ?? undefined,
    nearbyPlacesUpdatedAt: row.nearby_places_updated_at ?? undefined,
  };
}

/** The listing-images bucket is public, so photos are served at stable URLs
 *  that next/image and the CDN can cache. (They used to be re-signed on every
 *  page regeneration, which changed the URL each time and re-downloaded every
 *  photo from Supabase — billed egress.) This normalises any stored URL —
 *  including legacy signed ones — to the canonical public URL for its path.
 *  No network call: getPublicUrl just builds the string. Images whose path
 *  can't be recovered are left as they are. */
async function resolveImageUrls(listings: Listing[]): Promise<Listing[]> {
  if (!db) return listings;
  const bucket = db.storage.from(LISTING_IMAGES_BUCKET);
  for (const listing of listings) {
    if (!listing.images) continue;
    listing.images = listing.images.map((img) => {
      const path = storagePathFromUrl(LISTING_IMAGES_BUCKET, img.url);
      if (!path) return img;
      return { ...img, url: bucket.getPublicUrl(path).data.publicUrl };
    });
  }
  return listings;
}

type SpecialistRow = {
  id: string;
  slug: string;
  display_name: string;
  photo_path: string | null;
  /** Present only once 20261113100000_specialist_designation_accreditation.sql has run. */
  designation?: string | null;
  accreditation?: string | null;
};

/** Attach the listing specialist, fail-soft. Deliberately a separate step from
 *  the main `COLS` query: until the specialists migration is applied,
 *  `listings.specialist_id` / `public_specialists` don't exist, and adding the
 *  column to the main select would error the whole query and swap the live
 *  site to mock data. Any failure here (missing column/view, network) is
 *  swallowed and the listings are returned unchanged. Two small queries at
 *  most. */
async function attachSpecialists(
  listings: Listing[],
  opts: { withLicense?: boolean } = {},
): Promise<Listing[]> {
  try {
    if (!db) return listings;
    const dbIds = listings.map((l) => l.dbId).filter((v): v is string => !!v);
    if (dbIds.length === 0) return listings;

    // Only rows that have a specialist come back, so this stays small. For a
    // handful of listings (detail page, featured) narrow by id; for the full
    // list skip the `in (...)` filter to avoid an oversized URL.
    const q = db.from("listings").select("id,specialist_id").not("specialist_id", "is", null);
    const { data: links, error: linkErr } = await (dbIds.length <= 20 ? q.in("id", dbIds) : q);
    if (linkErr || !Array.isArray(links) || links.length === 0) return listings;
    const bySpecialist = new Map<string, string>();
    for (const r of links as { id: string; specialist_id: string | null }[]) {
      if (r.specialist_id) bySpecialist.set(r.id, r.specialist_id);
    }
    const wanted = dbIds.filter((id) => bySpecialist.has(id));
    if (wanted.length === 0) return listings;

    const specialistIds = [...new Set(wanted.map((id) => bySpecialist.get(id)!))];
    // Try with the designation/accreditation columns; if they don't exist yet
    // (migration not run), fall back to the original columns.
    let people: SpecialistRow[] | null = null;
    let peopleErr: unknown = null;
    {
      const r = await db
        .from("public_specialists")
        .select("id,slug,display_name,photo_path,designation,accreditation")
        .in("id", specialistIds);
      people = r.data as SpecialistRow[] | null;
      peopleErr = r.error;
    }
    if (peopleErr) {
      const r = await db
        .from("public_specialists")
        .select("id,slug,display_name,photo_path")
        .in("id", specialistIds);
      people = r.data as SpecialistRow[] | null;
      peopleErr = r.error;
    }
    if (peopleErr || !Array.isArray(people) || people.length === 0) return listings;
    const byId = new Map((people as SpecialistRow[]).map((p) => [p.id, p]));

    return listings.map((l) => {
      const sid = l.dbId ? bySpecialist.get(l.dbId) : undefined;
      const p = sid ? byId.get(sid) : undefined;
      if (!p) return l;
      return {
        ...l,
        specialist: {
          slug: p.slug,
          name: p.display_name,
          photoUrl: specialistPhotoUrl(p.photo_path),
          licenseLine: opts.withLicense ? specialistTitleLine(p.accreditation) : null,
          designation: storedDesignation(p.designation),
        },
      };
    });
  } catch {
    return listings;
  }
}

/**
 * List views (cards, category pages, sitemap, related) only ever show the first
 * photo. Keeping just that one trims the page payload and the number of image
 * URLs that have to be resolved; the full gallery comes from getListing().
 */
function coverOnly(listing: Listing): Listing {
  return listing.images && listing.images.length > 1 ? { ...listing, images: listing.images.slice(0, 1) } : listing;
}

export async function getListings(): Promise<Listing[]> {
  if (!db) return mockListings;
  const { data, error } = await db
    .from("listings")
    .select(COLS)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "listing_images", ascending: true });
  if (error || !data || data.length === 0) return mockListings;
  return attachSpecialists(await resolveImageUrls((data as Row[]).map(mapRow).map(coverOnly)));
}

export async function getFeaturedListings(limit = 3): Promise<Listing[]> {
  if (!db) return mockListings.slice(0, limit);
  const { data, error } = await db
    .from("listings")
    .select(COLS)
    .eq("is_featured", true)
    .order("sort_order", { referencedTable: "listing_images", ascending: true })
    .limit(limit);
  if (error || !data || data.length === 0) return mockListings.slice(0, limit);
  return attachSpecialists(await resolveImageUrls((data as Row[]).map(mapRow).map(coverOnly)));
}

export async function getListing(slug: string): Promise<Listing | null> {
  if (!db) return mockListings.find((l) => l.id === slug) ?? null;
  const { data, error } = await db
    .from("listings")
    .select(COLS)
    .eq("slug", slug)
    .order("sort_order", { referencedTable: "listing_images", ascending: true })
    .maybeSingle();
  if (error || !data) return mockListings.find((l) => l.id === slug) ?? null;
  const [resolved] = await resolveImageUrls([mapRow(data as Row)]);
  const [listing] = await attachSpecialists([resolved], { withLicense: true });
  return listing;
}
