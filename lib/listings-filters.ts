import { type Listing } from "@/lib/data";

export const FURNISHING_OPTIONS = ["Fully furnished", "Semi-furnished", "Unfurnished"];

/** Strips non-digits from a formatted price string (e.g. "₱ 5,000,000" -> 5000000). */
export function priceValue(p: string): number {
  const n = Number(p.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function availabilityOf(l: Listing): "Available" | "Reserved" | "Sold" {
  if (l.status === "Reserved") return "Reserved";
  if (l.status === "Sold") return "Sold";
  return "Available";
}

export function listingTypeOptions(l: Listing): string[] {
  if (l.listingTypes?.length) return l.listingTypes;
  return l.listingType ? [l.listingType] : [];
}

export type ListingFilterCriteria = {
  listingType?: string;
  propertyType?: string;
  minBeds?: number;
  minBaths?: number;
  furnishing?: string;
  availability?: string;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
};

/** Same predicate chain used by the listings browser UI, shared so both stay in sync. */
export function filterListings(listings: Listing[], criteria: ListingFilterCriteria): Listing[] {
  const { listingType, propertyType, minBeds, minBaths, furnishing, availability, minPrice, maxPrice, query } =
    criteria;

  return listings.filter((l) => {
    if (listingType && listingType !== "All" && !listingTypeOptions(l).includes(listingType)) return false;
    if (propertyType && propertyType !== "All" && l.propertyType !== propertyType) return false;
    if (availability && availability !== "All" && availabilityOf(l) !== availability) return false;
    if (minBeds === 0 && (l.beds ?? -1) !== 0) return false;
    if (minBeds != null && minBeds > 0 && (l.beds ?? 0) < minBeds) return false;
    if (minBaths != null && minBaths > 0 && (l.baths ?? 0) < minBaths) return false;
    if (furnishing && furnishing !== "All" && !(l.furnishing ?? "").startsWith(furnishing.split(" ")[0]))
      return false;

    const pv = priceValue(l.price);
    if (minPrice != null && pv < minPrice) return false;
    if (maxPrice != null && pv > maxPrice) return false;

    if (query?.trim()) {
      const q = query.toLowerCase();
      if (!l.title.toLowerCase().includes(q) && !l.location.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
