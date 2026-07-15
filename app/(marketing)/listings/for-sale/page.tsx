import type { Metadata } from "next";
import { CategoryListingsPage } from "@/components/listings-category";
import { getListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

const title = "Properties for Sale Philippines | All Abode";
const description =
  "Browse properties for sale through All Abode, including condos, lots, house and lots, commercial, office, industrial, and parking assets.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/listings/for-sale" },
  openGraph: { title, description },
};

export default async function ForSaleListingsPage() {
  const [all, settings] = await Promise.all([getListings(), getSettings()]);
  const forSale = all.filter((l) => l.listingMarkets?.includes("For Sale") ?? l.status === "For Sale");
  return (
    <CategoryListingsPage
      eyebrow="For Sale"
      title="Properties for Sale"
      subtitle="Browse available properties for sale through All Abode. We assist buyers, sellers, and investors with resale condominiums, lots, house and lots, commercial properties, office spaces, industrial properties, and parking slots."
      crumbLabel="For Sale"
      cta={{ label: "Inquire About a Property", href: "/contact" }}
      listings={forSale}
      heroImage={s(settings, "page_listings_image") || undefined}
      priceContext="sale"
    />
  );
}
