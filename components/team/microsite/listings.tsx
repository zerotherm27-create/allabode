import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PropertyCard } from "@/components/property-card";
import { CompactPropertyCard } from "@/components/team/microsite/compact-property-card";
import { Reveal } from "@/components/motion";
import { ListingsExpander } from "@/components/team/microsite/listings-expander";
import { FacadeIllustration } from "@/components/team/microsite/skyline";
import { APEX_ORIGIN, apexUrl } from "@/components/team/microsite/links";
import { FEATURED_LISTING_COUNT, LISTINGS_COPY } from "@/lib/team/profile-copy";
import type { Listing } from "@/lib/data";

/**
 * Phones: a sideways snap row of compact cards (about two and a half in view,
 * bleeding to the right edge; the overflow stays inside the row). md and up:
 * the shared PropertyCard grid. The row is a focusable region so arrow keys
 * scroll it; the card links inside are focusable as well.
 */
function CardGrid({ listings, label, className = "" }: { listings: Listing[]; label: string; className?: string }) {
  return (
    <div className={className}>
      {/* Region (not the list) takes the focus so the list keeps its list semantics. */}
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        className="-mr-5 snap-x snap-mandatory scroll-pl-0 overflow-x-auto overscroll-x-contain pb-1 pr-5 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
      >
        <ul className="grid w-max auto-cols-[8.5rem] grid-flow-col gap-2.5 min-[400px]:auto-cols-[9rem]">
          {listings.map((listing) => (
            <li key={listing.id} className="snap-start">
              <CompactPropertyCard listing={listing} linkOrigin={APEX_ORIGIN} />
            </li>
          ))}
        </ul>
      </div>
      <ul className="hidden grid-cols-2 gap-6 md:grid lg:grid-cols-3">
        {listings.map((listing) => (
          <li key={listing.id}>
            <PropertyCard listing={listing} showListedBy={false} linkOrigin={APEX_ORIGIN} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "Selected properties": the specialist's listings (featured first, as
 * getListings orders them), three up front and the rest revealed in place.
 * Anchor target of the hero's "View listings" and the header's "Properties".
 */
export function MicrositeListings({ listings }: { listings: Listing[] }) {
  const first = listings.slice(0, FEATURED_LISTING_COUNT);
  const rest = listings.slice(FEATURED_LISTING_COUNT);

  return (
    <section id="properties" aria-labelledby="listings-heading" className="scroll-mt-20 bg-cream py-10 sm:py-14 lg:py-section">
      <div className="container-site">
        {/* Grid so the link sits on the heading's row on phones (sub below, full
            width) and beside heading + sub, bottom-aligned, from sm up. */}
        <Reveal className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4">
          <div className="col-start-1 row-start-1">
            <p className="label-caps text-gold-ink">{LISTINGS_COPY.eyebrow}</p>
            <h2
              id="listings-heading"
              className="mt-3 font-display text-xl font-bold text-navy min-[360px]:text-2xl sm:mt-4 sm:text-4xl"
            >
              {LISTINGS_COPY.heading}
            </h2>
          </div>
          <p className="col-span-2 row-start-2 mt-2 max-w-[52ch] text-[0.8125rem] leading-relaxed text-slate sm:col-span-1 sm:col-start-1 sm:mt-3 sm:text-base">
            {LISTINGS_COPY.sub}
          </p>
          <a
            href={apexUrl("/listings")}
            className="label-caps col-start-2 row-start-1 inline-flex min-h-[44px] shrink-0 items-center gap-2 self-end text-gold-ink transition-colors hover:text-navy max-sm:max-w-[8.5rem] max-sm:gap-1.5 max-sm:text-right max-sm:leading-snug sm:row-span-2"
          >
            Browse all listings
            <Icon name="arrow_forward" size={16} />
          </a>
        </Reveal>

        {listings.length > 0 ? (
          <div className="mt-6 sm:mt-10">
            <ListingsExpander
              first={<CardGrid listings={first} label="Selected properties, scrolls sideways" />}
              rest={<CardGrid listings={rest} label="More properties, scrolls sideways" className="mt-4 md:mt-6" />}
              restCount={rest.length}
            />
          </div>
        ) : (
          <Reveal className="mt-10 grid grid-cols-1 border border-line bg-surface md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <div aria-hidden="true" className="relative hidden min-h-56 overflow-hidden bg-navy md:block">
              <FacadeIllustration className="absolute inset-0 h-full w-full text-white/15" litClassName="text-gold" />
            </div>
            <div className="p-6 sm:p-10">
              <h3 className="font-display text-2xl font-semibold text-navy">{LISTINGS_COPY.emptyHeading}</h3>
              <p className="mt-3 max-w-[56ch] leading-relaxed text-slate">{LISTINGS_COPY.emptyBody}</p>
              <Button href="#contact" variant="ghost" size="lg" className="mt-7 whitespace-nowrap">
                Tell me what you need
                <Icon name="arrow_forward" size={16} />
              </Button>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
