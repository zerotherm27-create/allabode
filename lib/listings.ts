import { createClient } from "@supabase/supabase-js";
import {
  listings as mockListings,
  type Listing,
  type ListingStatus,
} from "@/lib/data";
import type { NearbyPlace } from "@/lib/nearby-places";
import { LISTING_IMAGES_BUCKET, storagePathFromUrl, signedUrlsForPaths } from "@/lib/storage";

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
  "id,slug,title,location,price,price_label,listing_category,lease_type,property_type,status,bedrooms,bathrooms,floor_area,lot_area,parking,furnishing,lease_terms,sale_terms,availability_date,is_featured,created_at,nearby_places,nearby_places_updated_at,listing_images(url,alt_text,sort_order)";

type Row = {
  id: string;
  slug: string;
  title: string;
  location: string | null;
  price: number | null;
  price_label: string | null;
  listing_category: "For Sale" | "For Lease";
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

const COMMERCIAL = new Set(["Commercial", "Office", "Warehouse", "Lot"]);

function uiStatus(row: Row): ListingStatus {
  if (row.status === "Reserved") return "Reserved";
  if (row.status === "Sold" || row.status === "Leased") return "Sold";
  // Display label only: the DB keeps "For Lease" as the listing_category value.
  return row.listing_category === "For Lease" ? "For Rent" : "For Sale";
}

function fmtPrice(row: Row): string {
  if (row.price == null) return "Price on request";
  const base = `₱ ${Math.round(Number(row.price)).toLocaleString("en-PH")}`;
  return row.listing_category === "For Lease" ? `${base}/mo` : base;
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
    status: uiStatus(row),
    type: COMMERCIAL.has(row.property_type) ? "Commercial" : "Residential",
    beds: row.bedrooms ?? undefined,
    baths: row.bathrooms ?? undefined,
    area: row.floor_area != null ? `${Math.round(Number(row.floor_area))} sqm` : "",
    gradient: gradientFor(row.slug),
    images,
    propertyType: row.property_type,
    listingType: row.lease_type ?? row.listing_category,
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

/** Listing photos live in a private bucket now — the stored `url` is really
 *  just a path carrier. Batch-resolve every image across all given listings
 *  to a short-lived signed URL in one request, instead of leaving the raw
 *  (non-fetchable, private-bucket) URL in place. Falls back to the original
 *  value per-image if signing fails, so a partial failure never blanks a
 *  whole photo grid. */
async function resolveImageUrls(listings: Listing[]): Promise<Listing[]> {
  if (!db) return listings;
  const allPaths = listings.flatMap((l) =>
    (l.images ?? [])
      .map((img) => storagePathFromUrl(LISTING_IMAGES_BUCKET, img.url))
      .filter((p): p is string => p != null)
  );
  if (allPaths.length === 0) return listings;
  const signed = await signedUrlsForPaths(db, LISTING_IMAGES_BUCKET, allPaths);
  if (signed.size === 0) return listings;
  for (const listing of listings) {
    if (!listing.images) continue;
    listing.images = listing.images.map((img) => {
      const path = storagePathFromUrl(LISTING_IMAGES_BUCKET, img.url);
      const url = path ? signed.get(path) : undefined;
      return url ? { ...img, url } : img;
    });
  }
  return listings;
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
  return resolveImageUrls((data as Row[]).map(mapRow));
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
  return resolveImageUrls((data as Row[]).map(mapRow));
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
  const [listing] = await resolveImageUrls([mapRow(data as Row)]);
  return listing;
}
