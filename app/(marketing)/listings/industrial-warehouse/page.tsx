import type { Metadata } from "next";
import { CategoryListingsPage } from "@/components/listings-category";
import { getListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Industrial and Warehouse Properties Philippines",
  description:
    "Find industrial and warehouse properties for lease or sale through All Abode, with support for inquiries, viewings, and coordination.",
  alternates: { canonical: "/listings/industrial-warehouse" },
};

export default async function IndustrialWarehouseListingsPage() {
  const [all, settings] = await Promise.all([getListings(), getSettings()]);
  const industrial = all.filter(
    (l) => l.propertyType === "Warehouse" || l.propertyType === "Industrial"
  );
  return (
    <CategoryListingsPage
      eyebrow="Industrial and Warehouse"
      title="Industrial and Warehouse Properties"
      subtitle="Find industrial and warehouse properties for lease or sale with All Abode. We assist businesses and investors with property search, inquiry coordination, viewings, and transaction support."
      crumbLabel="Industrial and Warehouse"
      cta={{ label: "Inquire About Industrial Space", href: "/contact" }}
      listings={industrial}
      heroImage={s(settings, "page_listings_image") || undefined}
    />
  );
}
