import { Icon } from "@/components/icon";
import { type Listing, statusStyles } from "@/lib/data";

export function PropertyCard({ listing }: { listing: Listing }) {
  const specs: { icon: string; label: string }[] =
    listing.specs ?? [
      ...(listing.beds != null
        ? [{ icon: "bed", label: `${listing.beds} Beds` }]
        : []),
      ...(listing.baths != null
        ? [{ icon: "bathtub", label: `${listing.baths} Baths` }]
        : []),
      { icon: "square_foot", label: listing.area },
    ];

  return (
    <article className="group flex flex-col overflow-hidden border border-line bg-surface transition-shadow duration-[var(--dur-mid)] hover:shadow-[var(--shadow-card)]">
      {/* Image band (gradient placeholder) */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <div
          className={`h-full w-full bg-gradient-to-br ${listing.gradient} transition-transform duration-700 group-hover:scale-105`}
        />
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(120%_120%_at_80%_0%,rgba(180,151,90,0.35),transparent_55%)]" />
        <span
          className={`absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyles[listing.status]}`}
        >
          {listing.status}
        </span>
        <button
          type="button"
          aria-label="Save listing"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-navy/70 text-white backdrop-blur-md transition-colors hover:bg-navy-700"
        >
          <Icon name="favorite" size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-6">
        <p className="font-display text-xl font-bold text-navy-700">
          {listing.price}
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold leading-tight text-navy">
          {listing.title}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate">
          <Icon name="location_on" size={16} className="text-gold" />
          {listing.location}
        </p>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-sm text-slate">
          {specs.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <Icon name={s.icon} size={18} className="text-navy-700" />
              {s.label}
            </span>
          ))}
        </div>

        <a
          href={`/listings/${listing.id}`}
          className="label-caps mt-6 flex w-full items-center justify-center border border-navy py-3 text-navy transition-all hover:bg-navy hover:text-white"
        >
          View Details
        </a>
      </div>
    </article>
  );
}
