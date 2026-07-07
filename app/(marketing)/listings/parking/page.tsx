import type { Metadata } from "next";
import { CategoryListingsPage } from "@/components/listings-category";
import { getListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Parking Slots for Rent or Sale Philippines",
  description:
    "Browse parking slots for rent or sale through All Abode. Availability is subject to building rules, ownership, and verification.",
  alternates: { canonical: "/listings/parking" },
};

export default async function ParkingListingsPage() {
  const [all, settings] = await Promise.all([getListings(), getSettings()]);
  const parking = all.filter((l) => l.propertyType === "Parking");
  return (
    <CategoryListingsPage
      eyebrow="Parking"
      title="Parking Slots"
      subtitle="Browse parking slots for rent or sale through All Abode. We assist with inquiries, availability checks, building requirements, and transaction coordination."
      crumbLabel="Parking"
      cta={{ label: "Inquire About Parking", href: "/contact" }}
      listings={parking}
      heroImage={s(settings, "page_listings_image") || undefined}
    />
  );
}
