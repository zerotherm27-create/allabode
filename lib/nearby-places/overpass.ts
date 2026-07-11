const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "AllAbodePropertySolutions/1.0 (info@allabodeph.com)";

export type RawPoi = { name: string; category: string; distanceM: number };

const CATEGORY_TAGS: { category: string; tags: [string, string][] }[] = [
  { category: "School", tags: [["amenity", "school"], ["amenity", "university"], ["amenity", "college"]] },
  { category: "Mall", tags: [["shop", "mall"]] },
  { category: "Market", tags: [["amenity", "marketplace"], ["shop", "supermarket"]] },
  { category: "Hospital", tags: [["amenity", "hospital"], ["amenity", "clinic"]] },
  { category: "Transit", tags: [["railway", "station"], ["highway", "bus_stop"]] },
];

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

type OverpassElement = {
  tags?: { name?: string };
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};

async function queryCategory(
  lat: number,
  lon: number,
  radiusM: number,
  category: string,
  tags: [string, string][]
): Promise<RawPoi[]> {
  const filters = tags
    .map(
      ([key, value]) =>
        `node["${key}"="${value}"](around:${radiusM},${lat},${lon});\n` +
        `way["${key}"="${value}"](around:${radiusM},${lat},${lon});`
    )
    .join("\n");
  const query = `[out:json][timeout:20];(${filters});out center;`;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "text/plain" },
      body: query,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { elements?: OverpassElement[] };
    return (data.elements ?? [])
      .map((el): RawPoi | null => {
        const name = el.tags?.name;
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        if (!name || elLat == null || elLon == null) return null;
        return { name, category, distanceM: Math.round(haversineMeters(lat, lon, elLat, elLon)) };
      })
      .filter((p): p is RawPoi => p !== null);
  } catch {
    return [];
  }
}

// Cap applied per category before the final list is built, so a single dense
// category (bus stops especially) can't crowd out the others — the AI
// curation step (summarize.ts) then picks the truly important few from this
// candidate pool.
const PER_CATEGORY_CAP = 8;

/**
 * Free, keyless real-POI lookup via the OpenStreetMap Overpass API. Only ever
 * called from an admin-triggered server action — never on the public
 * page-render path. Returns real places only, deduped, distance-sorted, and
 * capped per category so every category gets fair representation.
 */
export async function getNearbyPois(lat: number, lon: number, radiusM = 1500): Promise<RawPoi[]> {
  const results = await Promise.all(
    CATEGORY_TAGS.map((c) => queryCategory(lat, lon, radiusM, c.category, c.tags))
  );

  const deduped: RawPoi[] = [];
  const seen = new Set<string>();
  for (const categoryResults of results) {
    const sorted = categoryResults.slice().sort((a, b) => a.distanceM - b.distanceM);
    let kept = 0;
    for (const poi of sorted) {
      if (kept >= PER_CATEGORY_CAP) break;
      const key = `${poi.category}:${poi.name.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(poi);
      kept++;
    }
  }

  return deduped.sort((a, b) => a.distanceM - b.distanceM);
}
