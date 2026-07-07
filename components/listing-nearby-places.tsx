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

  const groups = new Map<string, NearbyPlace[]>();
  for (const p of places) {
    const list = groups.get(p.category) ?? [];
    list.push(p);
    groups.set(p.category, list);
  }

  return (
    <div className="mt-8">
      <h2 className="font-display text-xl font-semibold text-navy">What&#x2019;s nearby</h2>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {Array.from(groups.entries()).map(([category, items]) => (
          <div key={category}>
            <p className="label-caps flex items-center gap-2 text-slate">
              <Icon name={CATEGORY_ICONS[category] ?? "place"} size={18} className="text-gold-ink" />
              {category}
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {items.map((item) => (
                <li
                  key={item.name}
                  className="flex items-start justify-between gap-3 border-b border-line/60 pb-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-navy">{item.name}</p>
                    {item.blurb && <p className="text-xs text-slate">{item.blurb}</p>}
                  </div>
                  <span className="whitespace-nowrap text-xs font-medium text-slate">
                    {formatDistance(item.distanceM)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
