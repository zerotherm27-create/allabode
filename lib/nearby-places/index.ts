import { geocodeAddress } from "@/lib/nearby-places/geocode";
import { getNearbyPois } from "@/lib/nearby-places/overpass";
import { summarizeNearbyPlaces, type NearbyPlace } from "@/lib/nearby-places/summarize";

export type { NearbyPlace } from "@/lib/nearby-places/summarize";

export type RefreshNearbyPlacesResult =
  | { ok: true; places: NearbyPlace[] }
  | { ok: false; error: string };

/**
 * Geocodes the listing's public address, queries real nearby POIs, and has
 * AI group/blurb them. Only ever called from an admin-triggered server
 * action — Nominatim/Overpass are free/keyless but rate-limited, so this
 * must never run on the public page-render path.
 */
export async function refreshNearbyPlaces(address: string): Promise<RefreshNearbyPlacesResult> {
  const point = await geocodeAddress(address);
  if (!point) return { ok: false, error: "Couldn't locate that address — please check it and try again." };

  const pois = await getNearbyPois(point.lat, point.lon);
  const places = await summarizeNearbyPlaces(pois);
  return { ok: true, places };
}
