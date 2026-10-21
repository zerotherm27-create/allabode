import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SpecialistMicrosite } from "@/components/team/microsite/specialist-microsite";
import { getPublicSpecialist } from "@/lib/team/public-queries";
import { isValidSpecialistSlug, metaDescription } from "@/lib/team/queries";
import { composeIntro } from "@/lib/team/profile-copy";
import { getListings } from "@/lib/listings";
import { site } from "@/lib/site";

type Params = Promise<{ slug: string }>;

const FALLBACK_DESCRIPTION =
  "Property specialist accredited under All Abode Property Solutions.";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const specialist = isValidSpecialistSlug(slug) ? await getPublicSpecialist(slug) : null;
  if (!specialist) return { title: "Property specialist", robots: { index: false } };

  // The root layout's title template appends " | All Abode Property Solutions".
  const title = `${specialist.name} | Property specialist`;
  const fullTitle = `${title} | ${site.name}`;
  // No bio yet: describe them with the same composed intro the About section shows.
  const description = metaDescription(
    specialist.tagline,
    specialist.bio ?? composeIntro(specialist),
    FALLBACK_DESCRIPTION,
  );
  const url = `https://${site.domain}/team/${specialist.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      type: "profile",
      siteName: site.name,
      ...(specialist.photoUrl
        ? { images: [{ url: specialist.photoUrl, width: 800, height: 1000, alt: specialist.name }] }
        : {}),
    },
  };
}

export default async function SpecialistProfilePage({ params }: { params: Params }) {
  const { slug } = await params;
  if (!isValidSpecialistSlug(slug)) notFound();

  const specialist = await getPublicSpecialist(slug);
  if (!specialist) notFound();

  const allListings = await getListings();
  const listings = allListings.filter(
    (l) => l.specialist?.slug === specialist.slug && l.status !== "Sold",
  );
  return <SpecialistMicrosite specialist={specialist} listings={listings} />;
}
