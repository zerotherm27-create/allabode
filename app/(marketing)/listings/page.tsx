import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/sections";
import { ListingsBrowser } from "@/components/listings-browser";
import { getListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Property Listings Philippines | All Abode Property Solutions",
  description:
    "Browse properties for lease or sale in the Philippines. Search by location, price, property type, bedrooms, furnishing, and availability.",
};

export default async function ListingsPage() {
  const [listings, settings] = await Promise.all([getListings(), getSettings()]);
  return (
    <>
      <PageHero
        eyebrow="Listings"
        title="Property listings for lease and sale"
        lead="Browse available properties for lease, sale, short-term rental, long-term rental, and bed space arrangements. Use filters to find options based on location, price, property type, furnishing, and availability."
        crumbs={[{ label: "Home", href: "/" }, { label: "Listings" }]}
        image={s(settings, "page_listings_image") || undefined}
      />
      <section className="py-section">
        <Container>
          <ListingsBrowser listings={listings} />
        </Container>
      </section>
    </>
  );
}
