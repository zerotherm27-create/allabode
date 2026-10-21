import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PropertyCard } from "@/components/property-card";
import { Reveal } from "@/components/motion";
import { ListingsExpander } from "@/components/team/microsite/listings-expander";
import { FacadeIllustration } from "@/components/team/microsite/skyline";
import { APEX_ORIGIN, apexUrl } from "@/components/team/microsite/links";
import { FEATURED_LISTING_COUNT, LISTINGS_COPY } from "@/lib/team/profile-copy";
import type { Listing } from "@/lib/data";

const GRID = "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3";

function CardGrid({ listings, className = "" }: { listings: Listing[]; className?: string }) {
  return (
    <ul className={`${GRID} ${className}`}>
      {listings.map((listing) => (
        <li key={listing.id}>
          <PropertyCard listing={listing} showListedBy={false} linkOrigin={APEX_ORIGIN} />
        </li>
      ))}
    </ul>
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
    <section id="properties" aria-labelledby="listings-heading" className="scroll-mt-20 bg-cream py-section">
      <div className="container-site">
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps text-gold-ink">{LISTINGS_COPY.eyebrow}</p>
            <h2 id="listings-heading" className="mt-4 font-display text-3xl font-bold text-navy sm:text-4xl">
              {LISTINGS_COPY.heading}
            </h2>
            <p className="mt-3 max-w-[52ch] leading-relaxed text-slate">{LISTINGS_COPY.sub}</p>
          </div>
          <a
            href={apexUrl("/listings")}
            className="label-caps inline-flex min-h-[44px] shrink-0 items-center gap-2 self-start text-gold-ink transition-colors hover:text-navy sm:self-auto"
          >
            Browse all listings
            <Icon name="arrow_forward" size={16} />
          </a>
        </Reveal>

        {listings.length > 0 ? (
          <div className="mt-10">
            <ListingsExpander
              first={<CardGrid listings={first} />}
              rest={<CardGrid listings={rest} className="mt-6" />}
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
