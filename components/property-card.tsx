import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { SaveListingButton } from "@/components/save-listing-button";
import { type Listing, formatBeds, statusStyles } from "@/lib/data";

export function PropertyCard({ listing }: { listing: Listing }) {
  const specs: { icon: string; label: string }[] =
    listing.specs ?? [
      ...(listing.beds != null
        ? [{ icon: "bed", label: formatBeds(listing.beds)! }]
        : []),
      ...(listing.baths != null
        ? [{ icon: "bathtub", label: `${listing.baths} Baths` }]
        : []),
      { icon: "square_foot", label: listing.area },
    ];

  return (
    <article className="group flex flex-col overflow-hidden border border-line bg-surface transition-shadow duration-[var(--dur-mid)] hover:shadow-[var(--shadow-card)]">
      {/* Image band */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {listing.images?.[0] ? (
          <Image
            src={listing.images[0].url}
            alt={listing.images[0].alt ?? listing.title}
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br ${listing.gradient} transition-transform duration-700 group-hover:scale-105`}
          />
        )}
        <span
          className={`absolute left-4 top-4 rounded-full px-3 py-1 text-caps font-bold uppercase ${statusStyles[listing.status]}`}
        >
          {listing.status}
        </span>
        <SaveListingButton listingId={listing.id} title={listing.title} />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-6">
        <p className="font-display text-xl font-bold text-navy-700">
          {listing.price}
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold leading-tight text-navy">
          <Link href={`/listings/${listing.id}`} className="hover:text-navy-700 focus-visible:underline">
            {listing.title}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate">
          <Icon name="location_on" size={16} className="text-gold-ink" />
          {listing.location}
        </p>
        {(listing.listingType || listing.propertyType) && (
          <p className="label-caps mt-2 text-slate">
            {[listing.listingType, listing.propertyType]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-sm text-slate">
          {specs.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <Icon name={s.icon} size={18} className="text-navy-700" />
              {s.label}
            </span>
          ))}
        </div>

        <Link
          href={`/listings/${listing.id}`}
          aria-hidden="true"
          tabIndex={-1}
          className="label-caps mt-6 flex min-h-[44px] items-center gap-2 text-navy transition-colors hover:text-gold-ink"
        >
          View Details
          <Icon name="arrow_forward" size={16} />
        </Link>
      </div>
    </article>
  );
}
