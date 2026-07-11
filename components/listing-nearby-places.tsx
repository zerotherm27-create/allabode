import { Icon } from "@/components/icon";
import type { NearbyPlace } from "@/lib/nearby-places";

const CATEGORY_ICONS: Record<string, string> = {
  School: "school",
  Mall: "storefront",
  Market: "shopping_cart",
  Hospital: "local_hospital",
  Transit: "directions_bus",
};

function formatDistance(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

export function ListingNearbyPlaces({ places }: { places: NearbyPlace[] }) {
  if (places.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="font-display text-xl font-semibold text-navy">What&#x2019;s nearby</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {places.map((item) => (
          <div
            key={`${item.category}:${item.name}`}
            className="flex items-start justify-between gap-3 border border-line bg-surface px-4 py-3"
          >
            <div>
              <p className="label-caps flex items-center gap-1.5 text-slate">
                <Icon name={CATEGORY_ICONS[item.category] ?? "place"} size={14} className="text-gold-ink" />
                {item.category}
              </p>
              <p className="mt-1 font-medium text-navy">{item.name}</p>
              {item.blurb && <p className="mt-0.5 text-xs text-slate">{item.blurb}</p>}
            </div>
            <span className="whitespace-nowrap text-xs font-medium text-slate">
              {formatDistance(item.distanceM)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
