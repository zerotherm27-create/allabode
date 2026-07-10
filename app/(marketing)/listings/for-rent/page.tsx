import type { Metadata } from "next";
import { CategoryListingsPage } from "@/components/listings-category";
import { getListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Properties for Rent Philippines | All Abode",
  description:
    "Find properties for rent through All Abode, including condominiums, residential units, commercial spaces, offices, warehouses, and parking.",
  alternates: { canonical: "/listings/for-rent" },
};

export default async function ForRentListingsPage() {
  const [all, settings] = await Promise.all([getListings(), getSettings()]);
  const rentals = all.filter((l) => l.listingMarkets?.includes("For Rent") ?? l.status === "For Rent");
  return (
    <CategoryListingsPage
      eyebrow="For Rent"
      title="Properties for Rent"
      subtitle="Find available rental properties with help from All Abode. Browse residential units, commercial spaces, offices, warehouses, industrial spaces, and parking slots for lease."
      crumbLabel="For Rent"
      intro="Whether you are looking for a home, business space, office, warehouse, or parking slot, All Abode can assist with inquiries, viewings, requirements, and lease coordination."
      cta={{ label: "Schedule a Viewing", href: "/contact" }}
      listings={rentals}
      heroImage={s(settings, "page_listings_image") || undefined}
    />
  );
}
