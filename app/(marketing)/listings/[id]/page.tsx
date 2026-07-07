import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Container } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PropertyCard } from "@/components/property-card";
import { ListingGallery } from "@/components/listing-gallery";
import { ListingMap } from "@/components/listing-map";
import { ListingNearbyPlaces } from "@/components/listing-nearby-places";
import { ListingShareButton } from "@/components/listing-share-button";
import { InquiryForm } from "@/components/forms/lead-forms";
import { ViewingScheduler } from "@/components/forms/viewing-scheduler";
import { formatBeds, statusStyles } from "@/lib/data";
import { getListing, getListings } from "@/lib/listings";

type Params = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const all = await getListings();
  return all.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing)
    return {
      title: "Listing not found",
      description: "This property listing could not be found. Browse current All Abode listings for available properties.",
    };
  return {
    title: `${listing.title} | ${listing.price}`,
    description: `${listing.title} in ${listing.location}. ${listing.status}, ${listing.area}.`,
  };
}

const highlights = [
  { icon: "verified", label: "Verified by licensed broker" },
  { icon: "description", label: "Clean title & documents" },
  { icon: "schedule", label: "Flexible viewing schedule" },
  { icon: "handshake", label: "Assisted financing options" },
];

export default async function ListingDetailPage({ params }: Params) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  const specs = listing.specs ?? [
    ...(listing.beds != null
      ? [{ icon: "bed", label: formatBeds(listing.beds)! }]
      : []),
    ...(listing.baths != null
      ? [{ icon: "bathtub", label: `${listing.baths} Bathrooms` }]
      : []),
    { icon: "square_foot", label: listing.area },
  ];

  const related = (await getListings())
    .filter((l) => l.id !== listing.id)
    .slice(0, 3);

  return (
    <>
      {/* Gallery */}
      <ListingGallery images={listing.images ?? []} title={listing.title} gradient={listing.gradient}>
        <Container className="absolute inset-x-0 bottom-0 pb-6">
          <Link
            href="/listings"
            className="label-caps inline-flex items-center gap-1.5 text-white/90 hover:text-gold"
          >
            <Icon name="arrow_back" size={18} />
            Back to listings
          </Link>
        </Container>
      </ListingGallery>

      <section className="py-section">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px]">
          {/* Main */}
          <div>
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate">
                <li>
                  <Link href="/" className="hover:text-gold-ink">Home</Link>
                </li>
                <li aria-hidden="true"><Icon name="chevron_right" size={14} /></li>
                <li>
                  <Link href="/listings" className="hover:text-gold-ink">Listings</Link>
                </li>
                <li aria-hidden="true"><Icon name="chevron_right" size={14} /></li>
                <li aria-current="page" className="font-medium text-navy">{listing.title}</li>
              </ol>
            </nav>
            <div className="flex items-center justify-between gap-3">
              <span
                className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyles[listing.status]}`}
              >
                {listing.status}
              </span>
              <ListingShareButton title={listing.title} />
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold text-navy sm:text-4xl">
              {listing.title}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-slate">
              <Icon name="location_on" size={20} className="text-gold-ink" />
              {listing.location}
            </p>

            <div className="mt-8 flex flex-wrap gap-8 border-y border-line py-6">
              {specs.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <Icon name={s.icon} size={26} className="text-navy-700" />
                  <span className="font-medium text-navy">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 max-w-none">
              <h2 className="font-display text-xl font-semibold text-navy">
                About this property
              </h2>
              <p className="mt-3 leading-relaxed text-slate">
                A rare offering in {listing.location.split(",").slice(-1)},
                this {listing.type.toLowerCase()} property combines
                architectural precision with everyday comfort. Generous volumes,
                premium finishes, and an efficient layout make it equally suited
                to discerning owner-occupiers and portfolio investors. Every
                detail has been verified by our PRC-licensed brokerage team, so
                you can transact with complete confidence.
              </p>
            </div>

            <ListingMap location={listing.location} />

            {listing.nearbyPlaces && <ListingNearbyPlaces places={listing.nearbyPlaces} />}

            {/* Property details (brief: listing/property type, furnishing, parking,
                lot area, lease/sale terms, availability) */}
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-navy">
                Property details
              </h2>
              <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-line pt-4 sm:grid-cols-2">
                {(
                  [
                    { icon: "sell", label: "Listing type", value: listing.listingType },
                    { icon: "home_work", label: "Property type", value: listing.propertyType },
                    { icon: "square_foot", label: "Floor area", value: listing.area },
                    { icon: "landscape", label: "Lot area", value: listing.lotArea },
                    { icon: "bed", label: "Bedrooms", value: listing.beds != null ? (listing.beds === 0 ? "Studio" : String(listing.beds)) : undefined },
                    { icon: "bathtub", label: "Bathrooms", value: listing.baths != null ? String(listing.baths) : undefined },
                    { icon: "local_parking", label: "Parking", value: listing.parking != null ? `${listing.parking} slot${listing.parking === 1 ? "" : "s"}` : undefined },
                    { icon: "chair", label: "Furnishing", value: listing.furnishing },
                    { icon: "handshake", label: listing.leaseTerms ? "Lease terms" : "Sale terms", value: listing.leaseTerms ?? listing.saleTerms },
                    { icon: "event_available", label: "Availability", value: listing.availabilityDate ?? listing.status },
                  ] satisfies { icon: string; label: string; value: string | undefined }[]
                )
                  .filter((row) => row.value)
                  .map((row) => (
                    <div key={row.label} className="flex justify-between gap-4 border-b border-line/60 pb-2">
                      <dt className="flex items-center gap-2 text-sm text-slate">
                        <Icon name={row.icon} size={18} className="text-navy-700" />
                        {row.label}
                      </dt>
                      <dd className="text-sm font-medium text-navy text-right">{row.value}</dd>
                    </div>
                  ))}
              </dl>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-navy">
                Highlights
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {highlights.map((h) => (
                  <div
                    key={h.label}
                    className="flex items-center gap-3 border border-line bg-surface px-4 py-3"
                  >
                    <Icon name={h.icon} size={22} className="text-gold-ink" />
                    <span className="text-sm text-ink">{h.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky enquiry card */}
          <aside className="h-fit lg:sticky lg:top-24">
            <div className="border border-line bg-surface p-7">
              <p className="label-caps text-slate">Guide price</p>
              <p className="mt-1 font-display text-3xl font-bold text-navy-700">
                {listing.price}
              </p>
              <div className="my-6 h-px w-full bg-gold/30" />
              <p className="text-sm text-slate">
                Speak with the licensed broker handling this property.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <Button href={listing.dbId ? "#schedule" : "#inquire"}>Schedule a Viewing</Button>
                <Button href="/valuation" variant="ghost">
                  Request Appraisal
                </Button>
              </div>
              <div className="mt-6 flex items-center gap-3 border-t border-line pt-5 text-sm text-slate">
                <Icon name="support_agent" size={22} className="text-navy" />
                Questions? Call{" "}
                <a href="tel:+63288881234" className="font-medium text-navy">
                  +63 2 8888 1234
                </a>
              </div>
            </div>
          </aside>
        </Container>
      </section>

      {/* Schedule a viewing */}
      {listing.dbId && (
        <section id="schedule" className="scroll-mt-24 bg-surface-gray py-section">
          <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="label-caps text-gold-ink">Schedule</p>
              <h2 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl">
                Book a viewing time
              </h2>
              <p className="mt-4 text-slate">
                Pick an open slot below and we&#x2019;ll confirm your viewing for{" "}
                <strong className="text-navy">{listing.title}</strong>.
              </p>
            </div>
            <ViewingScheduler listingId={listing.dbId} listingTitle={listing.title} />
          </Container>
        </section>
      )}

      {/* Inquiry form */}
      <section id="inquire" className="scroll-mt-24 py-section">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="label-caps text-gold-ink">Inquire</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl">
              Have a question instead?
            </h2>
            <p className="mt-4 text-slate">
              Send your details and a licensed agent will reach out within one
              business day to answer questions about{" "}
              <strong className="text-navy">{listing.title}</strong>.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
            <InquiryForm listingTitle={`${listing.title}, ${listing.location}`} />
          </div>
        </Container>
      </section>

      {/* Listing disclaimer */}
      <div className="border-t border-line bg-surface-gray">
        <Container className="py-5">
          <p className="text-sm text-slate">
            <strong className="text-navy">Broker disclosure:</strong> This listing is
            marketed by All Abode, operated by All Abode Brokerage and Valuation OPC.
            Brokerage services are performed under the supervision of a duly licensed
            real estate broker. Property details are subject to verification, owner
            approval, and availability at the time of inquiry.
          </p>
        </Container>
      </div>

      {/* Related */}
      <section className="bg-surface-gray py-section">
        <Container>
          <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">
            You may also like
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {related.map((l) => (
              <PropertyCard key={l.id} listing={l} />
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
