import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/sections";
import { ListingsBrowser } from "@/components/listings-browser";
import { getListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Property Listings Philippines | All Abode",
  description:
    "Browse All Abode property listings for rent, sale, commercial spaces, office spaces, warehouses, industrial properties, and parking.",
  alternates: { canonical: "/listings" },
};

const categories = [
  { label: "For Rent", href: "/listings/for-rent" },
  { label: "For Sale", href: "/listings/for-sale" },
  { label: "Commercial", href: "/listings/commercial" },
  { label: "Office", href: "/listings/office" },
  { label: "Industrial and Warehouse", href: "/listings/industrial-warehouse" },
  { label: "Parking", href: "/listings/parking" },
];

export default async function ListingsPage() {
  const [listings, settings] = await Promise.all([getListings(), getSettings()]);
  return (
    <>
      <PageHero
        eyebrow="Listings"
        title="Property Listings"
        lead="Explore available properties for rent, sale, business use, office use, industrial use, warehouse use, and parking. All listings are subject to availability, owner approval, and verification at the time of inquiry."
        crumbs={[{ label: "Home", href: "/" }, { label: "Listings" }]}
        image={s(settings, "page_listings_image") || undefined}
      />
      <section className="py-section">
        <Container>
          <nav aria-label="Listing categories" className="mb-10 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="label-caps border border-line bg-surface px-4 py-2.5 text-navy transition-colors hover:border-gold-ink hover:text-gold-ink"
              >
                {c.label}
              </Link>
            ))}
          </nav>
          <ListingsBrowser listings={listings} />
        </Container>
      </section>
    </>
  );
}
