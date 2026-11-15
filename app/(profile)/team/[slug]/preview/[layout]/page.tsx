import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SpecialistMicrosite } from "@/components/team/microsite/specialist-microsite";
import { isMicrositeLayout } from "@/lib/team/layout";
import { getPublicSpecialist } from "@/lib/team/public-queries";
import { isValidSpecialistSlug } from "@/lib/team/queries";
import { getListings } from "@/lib/listings";

type Params = Promise<{ slug: string; layout: string }>;

// A try-before-you-switch view of one layout, linked from the specialist's
// Profile page. Never indexed; the real page stays at /team/<slug>.
export const metadata: Metadata = {
  title: "Layout preview",
  robots: { index: false, follow: false },
};

export default async function SpecialistLayoutPreviewPage({ params }: { params: Params }) {
  const { slug, layout } = await params;
  if (!isValidSpecialistSlug(slug) || !isMicrositeLayout(layout)) notFound();

  const specialist = await getPublicSpecialist(slug);
  if (!specialist) notFound();

  const allListings = await getListings();
  const listings = allListings.filter(
    (l) => l.specialist?.slug === specialist.slug && l.status !== "Sold" && l.status !== "Leased",
  );
  return <SpecialistMicrosite specialist={specialist} listings={listings} layout={layout} />;
}
