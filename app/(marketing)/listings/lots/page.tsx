import type { Metadata } from "next";
import { CategoryListingsPage } from "@/components/listings-category";
import { getListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

const title = "Lots for Sale Philippines | All Abode";
const description =
  "Browse vacant lots for sale through All Abode. We assist with inquiries, availability checks, title verification, and transaction coordination.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/listings/lots" },
  openGraph: { title, description },
};

export default async function LotsListingsPage() {
  const [all, settings] = await Promise.all([getListings(), getSettings()]);
  const lots = all.filter((l) => l.propertyType === "Lot");
  return (
    <CategoryListingsPage
      eyebrow="Lots"
      title="Lots"
      subtitle="Browse vacant lots for sale with All Abode. We assist buyers and investors with lot inquiries, title verification, viewings, and transaction coordination."
      crumbLabel="Lots"
      cta={{ label: "Inquire About a Lot", href: "/contact" }}
      listings={lots}
      heroImage={s(settings, "page_listings_image") || undefined}
    />
  );
}
