import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { type Listing, type ListingStatus, formatBeds } from "@/lib/data";

/**
 * Tag colours for the small card. Not the shared statusStyles: white on the
 * green/amber status tokens is under 3:1, which at 11px fails contrast. Brass
 * "For sale" tags follow the mobile mockup.
 */
const TAG: Record<ListingStatus, string> = {
  "For Sale": "bg-gold text-navy",
  "For Rent": "bg-navy text-white",
  "For Sale & For Rent": "bg-gold text-navy",
  Reserved: "bg-surface text-navy",
  Sold: "bg-ink text-white",
};

/**
 * Microsite-only small card for the phone listings row (the shared
 * PropertyCard stays as is for md and up): 4:3 image with the status tag on
 * its bottom-left, a two-line title, one specs line and the price. The title
 * link is stretched over the whole card so the entire card is the tap target.
 */
export function CompactPropertyCard({
  listing,
  linkOrigin = "",
}: {
  listing: Listing;
  linkOrigin?: string;
}) {
  const detailHref = `${linkOrigin}/listings/${listing.id}`;
  const beds = listing.beds != null ? formatBeds(listing.beds) : null;
  const specs = [beds ? { icon: "bed", label: beds } : null, { icon: "square_foot", label: listing.area }].filter(
    (s): s is { icon: string; label: string } => s !== null && !!s.label,
  );

  return (
    <article className="group relative flex h-full flex-col border border-line bg-surface transition-shadow duration-[var(--dur-mid)] hover:shadow-[var(--shadow-card)]">
      <div className="relative aspect-[4/3] overflow-hidden">
        {listing.images?.[0] ? (
          <Image
            src={listing.images[0].url}
            alt={listing.images[0].alt ?? listing.title}
            fill
            sizes="160px"
            className="object-cover"
          />
        ) : (
          <div aria-hidden="true" className={`h-full w-full bg-gradient-to-br ${listing.gradient}`} />
        )}
        <span
          className={`absolute bottom-0 left-0 max-w-full px-2 py-1 text-[0.6875rem] font-bold uppercase leading-tight tracking-[0.08em] ${TAG[listing.status]}`}
        >
          {listing.status}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="line-clamp-2 font-display text-[0.8125rem] font-semibold leading-snug text-navy">
          <Link
            href={detailHref}
            className="after:absolute after:inset-0 after:content-[''] hover:text-navy-700 focus-visible:underline"
          >
            {listing.title}
          </Link>
        </h3>
        {specs.length > 0 && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6875rem] text-slate">
            {specs.map((s) => (
              <span key={s.icon} className="inline-flex items-center gap-1">
                <Icon name={s.icon} size={13} className="shrink-0 text-navy-700" />
                {s.label}
              </span>
            ))}
          </p>
        )}
        <p className="mt-auto pt-2 font-display text-sm font-bold text-navy-700">{listing.price}</p>
      </div>
    </article>
  );
}
