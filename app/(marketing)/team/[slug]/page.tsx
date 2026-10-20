import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { SectionHeading, CtaBand } from "@/components/sections";
import { PropertyCard } from "@/components/property-card";
import { SpecialistPortrait } from "@/components/team/specialist-card";
import { getPublicSpecialist } from "@/lib/team/public-queries";
import { getBrokerProfile } from "@/lib/team/broker";
import { licenseLine } from "@/lib/team/license";
import { isValidSpecialistSlug, metaDescription } from "@/lib/team/queries";
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
  const description = metaDescription(specialist.tagline, specialist.bio, FALLBACK_DESCRIPTION);
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

function TagList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <dt className="label-caps text-gold-ink">{label}</dt>
      <dd className="mt-3">
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item} className="border border-line bg-surface px-3 py-1.5 text-sm text-navy">
              {item}
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

const moreFromAllAbode = [
  {
    href: "/property-solutions/property-management",
    icon: "home_work",
    title: "Property management",
    body: "Rent collection, tenant care, and upkeep handled for owners.",
  },
  {
    href: "/valuation",
    icon: "request_quote",
    title: "Valuation and appraisal",
    body: "A professional opinion of value for your property.",
  },
];

export default async function SpecialistProfilePage({ params }: { params: Params }) {
  const { slug } = await params;
  if (!isValidSpecialistSlug(slug)) notFound();

  const specialist = await getPublicSpecialist(slug);
  if (!specialist) notFound();

  const [broker, allListings] = await Promise.all([getBrokerProfile(), getListings()]);
  const licence = licenseLine(
    { licenseMode: specialist.licenseMode, licenseNo: specialist.licenseNo },
    broker.licenseNo ? { name: broker.name, licenseNo: broker.licenseNo } : null,
  );
  const listings = allListings.filter(
    (l) => l.specialist?.slug === specialist.slug && l.status !== "Sold",
  );
  const years = specialist.yearsExperience;

  return (
    <>
      <section className="bg-cream pb-section pt-32 md:pt-36">
        <Container>
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-2 text-sm text-slate"
          >
            <Link href="/" className="inline-flex min-h-[44px] items-center hover:text-navy-700">
              Home
            </Link>
            <Icon name="chevron_right" size={16} />
            <Link href="/team" className="inline-flex min-h-[44px] items-center hover:text-navy-700">
              Our team
            </Link>
            <Icon name="chevron_right" size={16} />
            <span aria-current="page" className="text-navy">{specialist.name}</span>
          </nav>

          <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-16">
            {/* Portrait with a brass offset outline */}
            <div className="relative mx-auto w-full max-w-xs pb-3 pr-3 md:mx-0 md:max-w-none">
              <div
                aria-hidden="true"
                className="absolute inset-0 left-3 top-3 border border-gold"
              />
              <SpecialistPortrait
                name={specialist.name}
                photoUrl={specialist.photoUrl}
                sizes="320px"
                priority
                className="relative"
              />
            </div>

            <div className="min-w-0">
              <p className="label-caps text-gold-ink">Property specialist</p>
              <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-navy sm:text-5xl">
                {specialist.name}
              </h1>
              {specialist.tagline && (
                <p className="mt-4 text-lg leading-relaxed text-slate">{specialist.tagline}</p>
              )}

              <ul className="mt-5 flex flex-col gap-2 text-sm text-slate">
                {years != null && years > 0 && (
                  <li className="flex items-center gap-2">
                    <Icon name="work" size={18} className="shrink-0 text-gold-ink" />
                    {years} {years === 1 ? "year" : "years"} of experience
                  </li>
                )}
                {licence && (
                  <li className="flex items-start gap-2">
                    <Icon name="verified" size={18} className="mt-0.5 shrink-0 text-gold-ink" />
                    <span className="min-w-0 break-words">{licence}</span>
                  </li>
                )}
              </ul>

              <Button href="/contact" size="lg" className="mt-7">
                Send an inquiry
              </Button>

              {specialist.bio && (
                <div className="mt-10">
                  <h2 className="label-caps text-gold-ink">About</h2>
                  <p className="mt-3 max-w-2xl whitespace-pre-line break-words leading-relaxed text-slate">
                    {specialist.bio}
                  </p>
                </div>
              )}

              {(specialist.areas.length > 0 ||
                specialist.specialties.length > 0 ||
                specialist.languages.length > 0) && (
                <dl className="mt-10 flex flex-col gap-7">
                  <TagList label="Areas" items={specialist.areas} />
                  <TagList label="Specialties" items={specialist.specialties} />
                  <TagList label="Languages" items={specialist.languages} />
                </dl>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Their listings */}
      <section className="bg-surface-gray py-section">
        <Container>
          <SectionHeading
            eyebrow="Listings"
            title={`Properties listed by ${specialist.name}`}
          />
          {listings.length > 0 ? (
            <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <li key={listing.id}>
                  <PropertyCard listing={listing} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mx-auto mt-10 max-w-xl text-center">
              <p className="text-slate">
                No active listings right now. Browse everything currently available.
              </p>
              <Button href="/listings" variant="ghost" size="lg" className="mt-6">
                Browse all listings
              </Button>
            </div>
          )}
        </Container>
      </section>

      {/* More from All Abode */}
      <section className="py-section">
        <Container>
          <SectionHeading eyebrow="All Abode" title="More from All Abode" />
          <ul className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
            {moreFromAllAbode.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex h-full flex-col gap-4 border border-line bg-surface p-6 transition-shadow duration-[var(--dur-mid)] hover:shadow-[var(--shadow-card)]"
                >
                  <span className="flex h-12 w-12 items-center justify-center bg-navy/5 text-navy-700">
                    <Icon name={item.icon} size={26} />
                  </span>
                  <span>
                    <span className="block font-display text-lg font-semibold text-navy">
                      {item.title}
                    </span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-slate">
                      {item.body}
                    </span>
                  </span>
                  <span className="label-caps mt-auto flex min-h-[44px] items-center gap-2 text-navy transition-colors group-hover:text-gold-ink">
                    Learn more
                    <Icon name="arrow_forward" size={16} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <CtaBand
        title={`Talk to ${specialist.name.split(/\s+/)[0]}`}
        body="Send an inquiry and our team will get back to you."
      >
        <Button href="/contact" size="lg">
          Send an inquiry
        </Button>
        <Button href="/team" variant="ghost" size="lg">
          Meet the team
        </Button>
      </CtaBand>
    </>
  );
}
