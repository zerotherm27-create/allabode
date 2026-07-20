import type { Listing } from "@/lib/data";
import { containsAny } from "./text-match";

/** Full readable overview of a listing — used when no specific attribute keyword matched. */
export function describeListing(listing: Listing): string {
  const parts = [`${listing.title} in ${listing.location} — ${listing.price}.`];

  if (listing.beds != null || listing.baths != null) {
    const bedLabel = listing.beds === 0 ? "Studio" : listing.beds != null ? `${listing.beds} bedroom(s)` : "";
    const bathLabel = listing.baths != null ? `${listing.baths} bathroom(s)` : "";
    parts.push([bedLabel, bathLabel].filter(Boolean).join(", ") + ".");
  }

  parts.push(`Floor area: ${listing.area}${listing.lotArea ? `, lot area: ${listing.lotArea}` : ""}.`);

  if (listing.furnishing) parts.push(`Furnishing: ${listing.furnishing}.`);
  if (listing.parking != null) parts.push(`Parking slots: ${listing.parking}.`);
  if (listing.availabilityDate) parts.push(`Availability: ${listing.availabilityDate}.`);
  parts.push(`Current status: ${listing.status}.`);

  return parts.join(" ");
}

export function describeNearbyPlaces(listing: Listing): string {
  const places = listing.nearbyPlaces ?? [];
  if (places.length === 0) {
    return "We don't have nearby-amenities data cached for this listing yet — ask our team and we can check for you.";
  }
  const lines = places
    .slice(0, 6)
    .map((p) => `${p.name} (${p.category}, ~${Math.round(p.distanceM)}m away)${p.blurb ? ` — ${p.blurb}` : ""}`);
  return `Nearby: ${lines.join("; ")}.`;
}

type AttributeMatcher = { keywords: string[]; answer: (listing: Listing) => string | null };

const ATTRIBUTE_MATCHERS: AttributeMatcher[] = [
  {
    keywords: ["price", "cost", "magkano", "how much", "budget", "expensive", "mahal"],
    answer: (l) => `${l.title} is ${l.price}.`,
  },
  {
    keywords: ["bedroom", "bedrooms", "how many beds"],
    answer: (l) => (l.beds != null ? `${l.title} has ${l.beds === 0 ? "no separate bedroom (studio)" : `${l.beds} bedroom(s)`}.` : null),
  },
  {
    keywords: ["bathroom", "bathrooms", "toilet", "comfort room"],
    answer: (l) => (l.baths != null ? `${l.title} has ${l.baths} bathroom(s).` : null),
  },
  {
    keywords: ["square meter", "sqm", "floor area", "how big", "how large", "size of the unit"],
    answer: (l) => `Floor area is ${l.area}${l.lotArea ? `, lot area is ${l.lotArea}` : ""}.`,
  },
  {
    keywords: ["lot area", "land area"],
    answer: (l) => (l.lotArea ? `Lot area is ${l.lotArea}.` : null),
  },
  {
    keywords: ["furnished", "furniture", "unfurnished", "semi-furnished"],
    answer: (l) => (l.furnishing ? `This listing is ${l.furnishing.toLowerCase()}.` : null),
  },
  {
    keywords: ["parking", "garage"],
    answer: (l) => (l.parking != null ? `It comes with ${l.parking} parking slot(s).` : "We don't have parking details on file for this listing — please ask our team."),
  },
  {
    keywords: ["available", "move in", "move-in", "when can i", "vacant"],
    answer: (l) =>
      l.status === "Reserved" || l.status === "Sold"
        ? `This listing is currently marked as ${l.status}.`
        : `This listing is currently ${l.availabilityDate ? `available starting ${l.availabilityDate}` : "available"}.`,
  },
  {
    keywords: ["nearby", "near", "school", "mall", "hospital", "market", "amenities", "around the area", "what's around"],
    answer: (l) => describeNearbyPlaces(l),
  },
  {
    keywords: ["reserved", "sold", "still available", "status of"],
    answer: (l) => `Current status: ${l.status}.`,
  },
];

/** Tries to answer a single-attribute question about a specific listing. Returns
 *  null when no attribute keyword matched, so the caller can fall back to a full
 *  describeListing() overview instead. */
export function answerListingQuestion(listing: Listing, message: string): string | null {
  for (const matcher of ATTRIBUTE_MATCHERS) {
    if (containsAny(message, matcher.keywords)) {
      const answer = matcher.answer(listing);
      if (answer) return answer;
    }
  }
  return null;
}
