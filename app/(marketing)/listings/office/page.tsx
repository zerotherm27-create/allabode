import type { Metadata } from "next";
import { CategoryListingsPage } from "@/components/listings-category";
import { getListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

const title = "Office Spaces Philippines | All Abode";
const description =
  "Find office spaces for rent or sale through All Abode. Browse office units and business spaces with leasing and brokerage support.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/listings/office" },
  openGraph: { title, description },
};

export default async function OfficeListingsPage() {
  const [all, settings] = await Promise.all([getListings(), getSettings()]);
  const offices = all.filter((l) => l.propertyType === "Office");
  return (
    <CategoryListingsPage
      eyebrow="Office"
      title="Office Spaces"
      subtitle="Browse office spaces for rent or sale with All Abode. We assist professionals, companies, startups, and investors with office property inquiries and transaction coordination."
      crumbLabel="Office"
      cta={{ label: "Find Office Space", href: "/contact" }}
      listings={offices}
      heroImage={s(settings, "page_listings_image") || undefined}
    />
  );
}
