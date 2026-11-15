import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PropertyCard } from "@/components/property-card";
import { CompactPropertyCard } from "@/components/team/microsite/compact-property-card";
import { FeaturedListing } from "@/components/team/microsite/featured-listing";
import { Reveal } from "@/components/motion";
import { ListingsExpander } from "@/components/team/microsite/listings-expander";
import { FacadeIllustration } from "@/components/team/microsite/skyline";
import { APEX_ORIGIN, apexUrl } from "@/components/team/microsite/links";
import { FEATURED_LISTING_COUNT, LISTINGS_COPY } from "@/lib/team/profile-copy";
import type { Listing } from "@/lib/data";

/**
 * Phones: a sideways snap row of compact cards (about two and a half in view,
 * bleeding to the right edge; the overflow stays inside the row). md and up:
 * the shared PropertyCard grid, optionally led by one wide feature card. The
 * row is a focusable region so arrow keys scroll it; the card links inside are
 * focusable as well.
 */
function CardGrid({
  listings,
  label,
  feature = false,
  narrow = false,
  className = "",
}: {
  listings: Listing[];
  label: string;
  /** Lead the md+ grid with the first listing as a wide feature card. */
  feature?: boolean;
  /** Two columns at most (the grid shares the row with the contact aside). */
  narrow?: boolean;
  className?: string;
}) {
  const lead = feature ? listings[0] : null;
  const grid = lead ? listings.slice(1) : listings;
  return (
    <div className={className}>
      {/* Region (not the list) takes the focus so the list keeps its list semantics. */}
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        className="-mr-5 snap-x snap-mandatory scroll-pl-0 overflow-x-auto overscroll-x-contain pb-1 pr-5 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
      >
        <ul className="grid w-max auto-cols-[9.5rem] grid-flow-col gap-3 min-[400px]:auto-cols-[10.5rem]">
          {listings.map((listing) => (
            <li key={listing.id} className="snap-start">
              <CompactPropertyCard listing={listing} linkOrigin={APEX_ORIGIN} />
            </li>
          ))}
        </ul>
      </div>
      <div className="hidden flex-col gap-6 md:flex">
        {lead && <FeaturedListing listing={lead} linkOrigin={APEX_ORIGIN} />}
        {grid.length > 0 && (
          <ul className={`grid grid-cols-2 gap-6 ${narrow ? "" : "lg:grid-cols-3"}`}>
            {grid.map((listing) => (
              <li key={listing.id}>
                <PropertyCard listing={listing} showListedBy={false} linkOrigin={APEX_ORIGIN} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * "Selected properties": the specialist's listings (featured first, as
 * getListings orders them). By default the first is a wide feature card over a
 * row of three, the rest revealed in place. With `aside` (the Listings-first
 * layout) the cards sit two-up beside a sticky contact card instead.
 * Anchor target of the heroes' "View listings" and the header's "Properties".
 */
export function MicrositeListings({ listings, aside }: { listings: Listing[]; aside?: ReactNode }) {
  const first = listings.slice(0, FEATURED_LISTING_COUNT);
  const rest = listings.slice(FEATURED_LISTING_COUNT);

  const body =
    listings.length > 0 ? (
      <ListingsExpander
        first={<CardGrid listings={first} label="Selected properties, scrolls sideways" feature={!aside} narrow={!!aside} />}
        rest={<CardGrid listings={rest} label="More properties, scrolls sideways" narrow={!!aside} className="mt-4 md:mt-6" />}
        restCount={rest.length}
      />
    ) : (
      <Reveal className="grid grid-cols-1 border border-line bg-surface md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <div aria-hidden="true" className="relative hidden min-h-56 overflow-hidden bg-navy md:block">
          <FacadeIllustration className="absolute inset-0 h-full w-full text-white/15" litClassName="text-gold" />
        </div>
        <div className="p-6 sm:p-10">
          <h3 className="font-display text-2xl font-semibold text-navy">{LISTINGS_COPY.emptyHeading}</h3>
          <p className="mt-3 max-w-[56ch] leading-relaxed text-slate">{LISTINGS_COPY.emptyBody}</p>
          <Button href="#contact" variant="ghost" size="lg" className="mt-7 whitespace-nowrap max-sm:w-full">
            Inquire now
            <Icon name="arrow_forward" size={16} />
          </Button>
        </div>
      </Reveal>
    );

  return (
    <section id="properties" aria-labelledby="listings-heading" className="scroll-mt-20 bg-cream py-12 sm:py-16 lg:py-section">
      <div className="container-site">
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <p className="label-caps text-gold-ink">{LISTINGS_COPY.eyebrow}</p>
            <h2 id="listings-heading" className="mt-3 font-display text-3xl font-bold tracking-[-0.01em] text-navy sm:text-4xl">
              {LISTINGS_COPY.heading}
            </h2>
            <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-slate">{LISTINGS_COPY.sub}</p>
          </div>
          <a
            href={apexUrl("/listings")}
            className="label-caps inline-flex min-h-[44px] shrink-0 items-center gap-2 text-gold-ink transition-colors hover:text-navy"
          >
            Browse all listings
            <Icon name="arrow_forward" size={16} />
          </a>
        </Reveal>

        {aside ? (
          <div className="mt-8 grid grid-cols-1 gap-8 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
            <div className="min-w-0">{body}</div>
            <aside className="max-lg:hidden lg:sticky lg:top-24">{aside}</aside>
          </div>
        ) : (
          <div className="mt-8 sm:mt-10">{body}</div>
        )}
      </div>
    </section>
  );
}
