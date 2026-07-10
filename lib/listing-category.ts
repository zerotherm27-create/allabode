export const LISTING_CATEGORIES = ["For Sale", "For Lease", "For Sale and For Lease"] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];
export type ListingMarket = "For Sale" | "For Rent";

export function listingMarkets(category: string | null | undefined): ListingMarket[] {
  if (category === "For Sale and For Lease") return ["For Sale", "For Rent"];
  if (category === "For Lease") return ["For Rent"];
  return ["For Sale"];
}

export function listingMatchesMarket(category: string | null | undefined, market: ListingMarket): boolean {
  return listingMarkets(category).includes(market);
}

export function listingStatusLabel(category: string | null | undefined): "For Sale" | "For Rent" | "For Sale & For Rent" {
  if (category === "For Sale and For Lease") return "For Sale & For Rent";
  if (category === "For Lease") return "For Rent";
  return "For Sale";
}

export function listingTypeLabels(category: string | null | undefined, leaseType?: string | null): string[] {
  if (category === "For Sale and For Lease") return ["For Sale", leaseType || "For Rent"];
  if (category === "For Lease") return [leaseType || "For Rent"];
  return ["For Sale"];
}
