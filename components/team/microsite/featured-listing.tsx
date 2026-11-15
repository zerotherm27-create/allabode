import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { type Listing, formatBeds } from "@/lib/data";

/**
 * The first listing as one wide card (photo left, details right) above the
 * regular grid, md and up only (phones use the sideways row). The title link
 * is stretched over the whole card so the entire card is the click target.
 */
export function FeaturedListing({ listing, linkOrigin = "" }: { listing: Listing; linkOrigin?: string }) {
  const detailHref = `${linkOrigin}/listings/${listing.id}`;
  const specs: { icon: string; label: string }[] =
    listing.specs ?? [
      ...(listing.beds != null ? [{ icon: "bed", label: formatBeds(listing.beds)! }] : []),
      ...(listing.baths != null ? [{ icon: "bathtub", label: `${listing.baths} Baths` }] : []),
      ...(listing.area ? [{ icon: "square_foot", label: listing.area }] : []),
    ];

  return (
    <article className="group relative grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] border border-line bg-surface transition-shadow duration-[var(--dur-mid)] hover:shadow-[var(--shadow-card)]">
      <div className="relative min-h-[22rem] overflow-hidden lg:min-h-[26rem]">
        {listing.images?.[0] ? (
          <Image
            src={listing.images[0].url}
            alt={listing.images[0].alt ?? listing.title}
            fill
            sizes="(min-width: 1280px) 760px, 60vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div aria-hidden="true" className={`h-full w-full bg-gradient-to-br ${listing.gradient}`} />
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-center p-8 lg:p-12">
        <p className="label-caps text-gold-ink">{listing.status}</p>
        <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-navy lg:text-3xl">
          <Link
            href={detailHref}
            className="after:absolute after:inset-0 after:content-[''] hover:text-navy-700 focus-visible:underline"
          >
            {listing.title}
          </Link>
        </h3>
        <p className="mt-2 flex items-center gap-1.5 text-base text-slate">
          <Icon name="location_on" size={18} className="shrink-0 text-gold-ink" />
          {listing.location}
        </p>
        <p className="mt-5 font-display text-2xl font-bold text-navy-700">{listing.price}</p>
        {specs.length > 0 && (
          <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5 text-sm text-slate">
            {specs.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5">
                <Icon name={s.icon} size={18} className="shrink-0 text-navy-700" />
                {s.label}
              </span>
            ))}
          </p>
        )}
        <p aria-hidden="true" className="label-caps mt-7 inline-flex items-center gap-2 text-navy transition-colors group-hover:text-gold-ink">
          View details
          <Icon name="arrow_forward" size={16} />
        </p>
      </div>
    </article>
  );
}
