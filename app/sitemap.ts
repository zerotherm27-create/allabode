import type { MetadataRoute } from "next";
import { getListings } from "@/lib/listings";
import { getPublicSiteUrl } from "@/lib/url";

const MARKETING_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/property-solutions", priority: 0.9 },
  { path: "/property-solutions/brokerage", priority: 0.9 },
  { path: "/property-solutions/leasing", priority: 0.9 },
  { path: "/property-solutions/property-management", priority: 0.9 },
  { path: "/property-solutions/documentation-assistance", priority: 0.8 },
  { path: "/valuation", priority: 0.9 },
  { path: "/listings", priority: 0.9 },
  { path: "/listings/for-rent", priority: 0.8 },
  { path: "/listings/for-sale", priority: 0.8 },
  { path: "/listings/commercial", priority: 0.7 },
  { path: "/listings/office", priority: 0.7 },
  { path: "/listings/industrial-warehouse", priority: 0.7 },
  { path: "/listings/parking", priority: 0.7 },
  { path: "/list-your-property", priority: 0.8 },
  { path: "/about", priority: 0.6 },
  { path: "/faq", priority: 0.6 },
  { path: "/contact", priority: 0.7 },
  { path: "/resources", priority: 0.4 },
  { path: "/privacy-policy", priority: 0.2 },
  { path: "/terms-of-service", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicSiteUrl();
  const now = new Date();

  const pages: MetadataRoute.Sitemap = MARKETING_ROUTES.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.path.startsWith("/listings") ? "daily" : "weekly",
    priority: r.priority,
  }));

  let listingPages: MetadataRoute.Sitemap = [];
  try {
    const listings = await getListings();
    listingPages = listings.map((l) => ({
      url: `${base}/listings/${l.id}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    }));
  } catch {
    // Listings are optional in the sitemap; static routes still ship.
  }

  return [...pages, ...listingPages];
}
