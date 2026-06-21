import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/sections";
import { ListingsBrowser } from "@/components/listings-browser";
import { getListings } from "@/lib/listings";

export const metadata: Metadata = {
  title: "Property Listings",
  description:
    "Browse curated residential and commercial properties for sale and for lease across Metro Manila, Cebu, and Davao — represented by a licensed brokerage team.",
};

export default async function ListingsPage() {
  const listings = await getListings();
  return (
    <>
      <PageHero
        eyebrow="Premium Listings"
        title="Find your next address"
        lead="A curated portfolio of premium residential and commercial spaces, each verified by our licensed brokerage team."
        crumbs={[{ label: "Home", href: "/" }, { label: "Listings" }]}
      />
      <section className="py-section">
        <Container>
          <ListingsBrowser listings={listings} />
        </Container>
      </section>
    </>
  );
}
