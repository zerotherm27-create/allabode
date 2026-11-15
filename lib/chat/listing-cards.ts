/**
 * Pure helpers for the chat assistant's listing search + preview cards.
 * Dependency-free on purpose: imported by both the API route (server) and the
 * chat widget (client), and loaded directly by the unit tests.
 */

export type SearchableListing = {
  id: string; // slug
  title: string;
  location: string;
  price: string;
  status: string;
  type: string; // "Residential" | "Commercial"
  beds?: number;
  baths?: number;
  propertyType?: string;
  listingMarkets?: string[]; // "For Sale" | "For Rent"
  images?: { url: string }[];
};

export type ListingCard = {
  slug: string;
  title: string;
  location: string;
  price: string;
  beds?: number;
  baths?: number;
  image?: string;
};

export type SearchCriteria = {
  location?: string;
  market?: string; // "sale" | "rent"
  propertyType?: string; // free text: condo, house, office, ...
  bedrooms?: number;
};

export const MAX_RESULTS = 4;
const CLOSED_STATUSES = new Set(["Sold", "Leased", "Reserved"]);

function norm(v: unknown): string {
  return typeof v === "string" ? v.toLowerCase().trim() : "";
}

export function searchListings<T extends SearchableListing>(
  all: T[],
  c: SearchCriteria
): T[] {
  const loc = norm(c.location);
  const kind = norm(c.propertyType);
  const market = norm(c.market);
  const beds = typeof c.bedrooms === "number" && Number.isFinite(c.bedrooms) ? c.bedrooms : undefined;

  return all
    .filter((l) => !CLOSED_STATUSES.has(l.status))
    .filter((l) => !loc || norm(`${l.location} ${l.title}`).includes(loc))
    .filter(
      (l) =>
        !kind ||
        norm(`${l.propertyType ?? ""} ${l.type} ${l.title}`).includes(kind)
    )
    .filter((l) => {
      if (market === "sale") return (l.listingMarkets ?? []).includes("For Sale");
      if (market === "rent") return (l.listingMarkets ?? []).includes("For Rent");
      return true;
    })
    .filter((l) => beds === undefined || l.beds === beds)
    .slice(0, MAX_RESULTS);
}

export function toCard(l: SearchableListing): ListingCard {
  return {
    slug: l.id,
    title: l.title,
    location: l.location,
    price: l.price,
    beds: l.beds,
    baths: l.baths,
    image: l.images?.[0]?.url,
  };
}

const OPEN = "<<LISTINGS:";
const CLOSE = ">>";

/** Appended after the streamed text so the widget can render cards. */
export function encodeCards(cards: ListingCard[]): string {
  if (cards.length === 0) return "";
  // JSON could contain ">>" inside a title; escape it so the marker stays parseable.
  return `\n${OPEN}${JSON.stringify(cards).replace(/>/g, "\\u003e")}${CLOSE}`;
}

/** Splits streamed text into the visible message and any trailing cards.
 *  Tolerates a partially streamed marker (hides it until complete). */
export function parseCards(raw: string): { text: string; cards: ListingCard[] } {
  const start = raw.indexOf(OPEN);
  if (start === -1) return { text: raw, cards: [] };
  const text = raw.slice(0, start).trimEnd();
  const end = raw.indexOf(CLOSE, start);
  if (end === -1) return { text, cards: [] };
  try {
    const parsed = JSON.parse(raw.slice(start + OPEN.length, end));
    if (!Array.isArray(parsed)) return { text, cards: [] };
    const cards = parsed
      .filter((c) => c && typeof c.slug === "string" && typeof c.title === "string")
      .slice(0, MAX_RESULTS) as ListingCard[];
    return { text, cards };
  } catch {
    return { text, cards: [] };
  }
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/i;
export function isSafeSlug(s: string): boolean {
  return SLUG_RE.test(s);
}
