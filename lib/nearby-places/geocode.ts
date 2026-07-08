const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "AllAbodePropertySolutions/1.0 (info@allabodeph.com)";

export type GeocodeResult = { lat: number; lon: number };

/**
 * Free, keyless geocoding via OpenStreetMap Nominatim. Sets a descriptive
 * User-Agent per Nominatim's usage policy. Only ever called from an
 * admin-triggered server action — never on the public page-render path.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (!q) return null;
  try {
    const res = await fetch(`${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    const first = data[0];
    if (!first) return null;
    const lat = Number(first.lat);
    const lon = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}
