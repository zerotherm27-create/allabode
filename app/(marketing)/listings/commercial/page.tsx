import type { Metadata } from "next";
import { CategoryListingsPage } from "@/components/listings-category";
import { getListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

const title = "Commercial Properties Philippines | All Abode";
const description =
  "Browse commercial properties for rent or sale with All Abode, including retail spaces, business spaces, and mixed-use property options.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/listings/commercial" },
  openGraph: { title, description },
};

export default async function CommercialListingsPage() {
  const [all, settings] = await Promise.all([getListings(), getSettings()]);
  const commercial = all.filter((l) => l.propertyType === "Commercial");
  return (
    <CategoryListingsPage
      eyebrow="Commercial"
      title="Commercial Properties"
      subtitle="Find commercial properties for rent or sale with support from All Abode. We assist business owners, investors, and property owners with commercial property inquiries, viewings, leasing, and sale coordination."
      crumbLabel="Commercial"
      cta={{ label: "Inquire About Commercial Space", href: "/contact" }}
      listings={commercial}
      heroImage={s(settings, "page_listings_image") || undefined}
    />
  );
}
