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
  dbId?: string;
};

export type ListingCard = {
  slug: string;
  title: string;
  location: string;
  price: string;
  beds?: number;
  baths?: number;
  image?: string;
  /** Real listing UUID — public on listing pages already; needed so a chat lead is attached to the listing. */
  dbId?: string;
};

export type ContactRequest = { listing?: string; listingId?: string };

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
    dbId: l.dbId,
  };
}

const CARDS_OPEN = "<<LISTINGS:";
const CONTACT_OPEN = "<<CONTACT:";
const CLOSE = ">>";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// JSON could contain ">>" inside a title; escape it so the marker stays parseable.
function jsonForMarker(v: unknown): string {
  return JSON.stringify(v).replace(/>/g, "\\u003e");
}

/** Appended after the streamed text so the widget can render cards. */
export function encodeCards(cards: ListingCard[]): string {
  if (cards.length === 0) return "";
  return `\n${CARDS_OPEN}${jsonForMarker(cards)}${CLOSE}`;
}

/** Appended after the streamed text so the widget shows the inline contact form. */
export function encodeContact(ctx: ContactRequest = {}): string {
  return `\n${CONTACT_OPEN}${jsonForMarker(ctx)}${CLOSE}`;
}

export type ParsedChat = { text: string; cards: ListingCard[]; contact?: ContactRequest };

/** Splits streamed text into the visible message and any trailing markers.
 *  Tolerates a partially streamed marker (hides it until complete). */
export function parseCards(raw: string): ParsedChat {
  const starts = [raw.indexOf(CARDS_OPEN), raw.indexOf(CONTACT_OPEN)].filter((i) => i !== -1);
  if (starts.length === 0) return { text: raw, cards: [] };
  const first = Math.min(...starts);
  const text = raw.slice(0, first).trimEnd();
  const result: ParsedChat = { text, cards: [] };

  let pos = first;
  while (pos < raw.length) {
    const isCards = raw.startsWith(CARDS_OPEN, pos);
    const isContact = raw.startsWith(CONTACT_OPEN, pos);
    if (!isCards && !isContact) {
      pos = raw.indexOf("<<", pos + 1);
      if (pos === -1) break;
      continue;
    }
    const open = isCards ? CARDS_OPEN : CONTACT_OPEN;
    const end = raw.indexOf(CLOSE, pos);
    if (end === -1) break; // still streaming
    try {
      const parsed = JSON.parse(raw.slice(pos + open.length, end));
      if (isCards && Array.isArray(parsed)) {
        result.cards = parsed
          .filter((c) => c && typeof c.slug === "string" && typeof c.title === "string")
          .slice(0, MAX_RESULTS)
          .map((c) => ({ ...c, dbId: typeof c.dbId === "string" && UUID_RE.test(c.dbId) ? c.dbId : undefined })) as ListingCard[];
      } else if (isContact && parsed && typeof parsed === "object") {
        result.contact = {
          listing: typeof parsed.listing === "string" ? parsed.listing.slice(0, 200) : undefined,
          listingId: typeof parsed.listingId === "string" && UUID_RE.test(parsed.listingId) ? parsed.listingId : undefined,
        };
      }
    } catch {
      // malformed marker: ignore
    }
    pos = end + CLOSE.length;
  }
  return result;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/i;
export function isSafeSlug(s: string): boolean {
  return SLUG_RE.test(s);
}
