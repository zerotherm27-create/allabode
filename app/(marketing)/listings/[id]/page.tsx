import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Container } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PropertyCard } from "@/components/property-card";
import { InquiryForm } from "@/components/forms/lead-forms";
import { statusStyles } from "@/lib/data";
import { getListing, getListings } from "@/lib/listings";

type Params = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const all = await getListings();
  return all.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Listing not found" };
  return {
    title: `${listing.title} — ${listing.price}`,
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
      ? [{ icon: "bed", label: `${listing.beds} Bedrooms` }]
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
      {/* Gallery band */}
      <div className="relative isolate">
        <div
          className={`h-[40vh] w-full bg-gradient-to-br ${listing.gradient} md:h-[56vh]`}
        />
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(120%_120%_at_80%_0%,rgba(180,151,90,0.35),transparent_55%)]" />
        <Container className="absolute inset-x-0 bottom-0 pb-6">
          <Link
            href="/listings"
            className="label-caps inline-flex items-center gap-1.5 text-white/90 hover:text-gold"
          >
            <Icon name="arrow_back" size={18} />
            Back to listings
          </Link>
        </Container>
      </div>

      <section className="py-section">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px]">
          {/* Main */}
          <div>
            <span
              className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyles[listing.status]}`}
            >
              {listing.status}
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold text-navy sm:text-4xl">
              {listing.title}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-slate">
              <Icon name="location_on" size={20} className="text-gold" />
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

            {/* Property details (brief: listing/property type, furnishing, parking,
                lot area, lease/sale terms, availability) */}
            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-navy">
                Property details
              </h2>
              <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-line pt-4 sm:grid-cols-2">
                {[
                  ["Listing type", listing.listingType],
                  ["Property type", listing.propertyType],
                  ["Floor area", listing.area],
                  ["Lot area", listing.lotArea],
                  ["Bedrooms", listing.beds != null ? String(listing.beds) : undefined],
                  ["Bathrooms", listing.baths != null ? String(listing.baths) : undefined],
                  ["Parking", listing.parking != null ? `${listing.parking} slot${listing.parking === 1 ? "" : "s"}` : undefined],
                  ["Furnishing", listing.furnishing],
                  [listing.leaseTerms ? "Lease terms" : "Sale terms", listing.leaseTerms ?? listing.saleTerms],
                  ["Availability", listing.availabilityDate ?? listing.status],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-line/60 pb-2">
                      <dt className="text-sm text-slate">{k}</dt>
                      <dd className="text-sm font-medium text-navy text-right">{v}</dd>
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
                    <Icon name={h.icon} size={22} className="text-gold" />
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
                <Button href="#inquire">Schedule a Viewing</Button>
                <Button href="/appraisal" variant="ghost">
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

      {/* Inquiry form */}
      <section id="inquire" className="scroll-mt-24 bg-surface-gray py-section">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="label-caps text-gold">Inquire</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl">
              Request details or a viewing
            </h2>
            <p className="mt-4 text-slate">
              Send your details and a licensed agent will reach out within one
              business day to answer questions or schedule a viewing for{" "}
              <strong className="text-navy">{listing.title}</strong>.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
            <InquiryForm listingTitle={`${listing.title} — ${listing.location}`} />
          </div>
        </Container>
      </section>

      {/* Listing disclaimer */}
      <div className="border-t border-line bg-surface-gray">
        <Container className="py-5">
          <p className="text-sm text-slate">
            <strong className="text-navy">Listing disclaimer:</strong> Property information,
            pricing, availability, and terms are subject to verification and may change
            without prior notice. Please confirm details with All Abode before making decisions.
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
