import { createClient } from "@supabase/supabase-js";
import {
  listings as mockListings,
  type Listing,
  type ListingStatus,
} from "@/lib/data";

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
  "slug,title,location,price,price_label,listing_category,property_type,status,bedrooms,bathrooms,floor_area,is_featured,created_at";

type Row = {
  slug: string;
  title: string;
  location: string | null;
  price: number | null;
  price_label: string | null;
  listing_category: "For Sale" | "For Lease";
  property_type: string;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area: number | null;
  is_featured: boolean;
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
  return row.listing_category; // "For Sale" | "For Lease"
}

function fmtPrice(row: Row): string {
  if (row.price == null) return "Price on request";
  const base = `₱ ${Math.round(Number(row.price)).toLocaleString("en-PH")}`;
  return row.listing_category === "For Lease" ? `${base}/mo` : base;
}

function mapRow(row: Row): Listing {
  return {
    id: row.slug,
    title: row.title,
    location: row.location ?? "",
    price: fmtPrice(row),
    status: uiStatus(row),
    type: COMMERCIAL.has(row.property_type) ? "Commercial" : "Residential",
    beds: row.bedrooms ?? undefined,
    baths: row.bathrooms ?? undefined,
    area: row.floor_area != null ? `${Math.round(Number(row.floor_area))} sqm` : "",
    gradient: gradientFor(row.slug),
  };
}

export async function getListings(): Promise<Listing[]> {
  if (!db) return mockListings;
  const { data, error } = await db
    .from("listings")
    .select(COLS)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error || !data || data.length === 0) return mockListings;
  return (data as Row[]).map(mapRow);
}

export async function getFeaturedListings(limit = 3): Promise<Listing[]> {
  if (!db) return mockListings.slice(0, limit);
  const { data, error } = await db
    .from("listings")
    .select(COLS)
    .eq("is_featured", true)
    .limit(limit);
  if (error || !data || data.length === 0) return mockListings.slice(0, limit);
  return (data as Row[]).map(mapRow);
}

export async function getListing(slug: string): Promise<Listing | null> {
  if (!db) return mockListings.find((l) => l.id === slug) ?? null;
  const { data, error } = await db
    .from("listings")
    .select(COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return mockListings.find((l) => l.id === slug) ?? null;
  return mapRow(data as Row);
}
