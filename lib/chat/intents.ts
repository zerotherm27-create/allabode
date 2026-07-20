import type { Listing } from "@/lib/data";
import { filterListings, priceValue, type ListingFilterCriteria } from "@/lib/listings-filters";
import { containsAny, extractBedCount, extractBathCount, extractPriceRange, normalize, tokenize } from "./text-match";
import { answerListingQuestion, describeListing } from "./listing-qa";
import { formatContactBlock, type KnowledgeBase } from "./knowledge-base";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatContext = {
  message: string;
  listingSlug?: string;
  listing: Listing | null;
  allListings: Listing[];
  kb: KnowledgeBase;
};

const GREETING_PATTERN = /^(hi|hello|hey|yo|good\s?(morning|afternoon|evening)|kumusta|magandang\s?(umaga|hapon|gabi))\b/i;

const SEARCH_PHRASES = [
  "show me", "looking for", "do you have", "any listings", "available properties",
  "for rent", "for sale", "for lease", "rent out", "renting", "buying", "buy a",
];

// Confident keyword -> exact `propertyType` label mappings (per the Supabase enum).
// "for rent"/"for sale" intentionally aren't mapped to a `listingType` filter — the
// exact values ("Long-term"/"Short-term"/"For Sale") vary enough across real listings
// that a wrong guess would silently zero out results; they only count as search triggers.
const PROPERTY_TYPE_KEYWORDS: [string, string][] = [
  ["condominium", "Condo"],
  ["condo", "Condo"],
  ["house and lot", "House and Lot"],
  ["house", "House and Lot"],
  ["apartment", "Apartment"],
  ["townhouse", "Townhouse"],
  ["dorm", "Dorm / Bed Space"],
  ["bedspace", "Dorm / Bed Space"],
  ["bed space", "Dorm / Bed Space"],
  ["commercial", "Commercial"],
  ["office", "Office"],
  ["warehouse", "Warehouse"],
  ["studio", "Condo"],
];

/** Exported so the API route can decide whether it's worth fetching `getListings()` at all. */
export function looksSearchLike(message: string): boolean {
  if (extractBedCount(message) != null || extractBathCount(message) != null) return true;
  const { min, max } = extractPriceRange(message);
  if (min != null || max != null) return true;
  if (containsAny(message, PROPERTY_TYPE_KEYWORDS.map(([k]) => k))) return true;
  if (containsAny(message, SEARCH_PHRASES)) return true;
  return false;
}

function matchGreeting(ctx: ChatContext): string | null {
  const tokens = tokenize(ctx.message);
  if (tokens.length > 5 || !GREETING_PATTERN.test(ctx.message.trim())) return null;
  return ctx.listingSlug && ctx.listing
    ? `Hi, I'm Abbie! Ask me anything about ${ctx.listing.title}, or about our other services.`
    : "Hi, I'm Abbie! Ask me about our services, or search for a listing right here in chat.";
}

function matchThisListing(ctx: ChatContext): string | null {
  if (!ctx.listingSlug || !ctx.listing) return null;
  const attributeAnswer = answerListingQuestion(ctx.listing, ctx.message);
  if (attributeAnswer) return attributeAnswer;
  if (containsAny(ctx.message, ["this property", "this listing", "this unit", "tell me about", "tell me more"])) {
    return describeListing(ctx.listing);
  }
  return null;
}

function formatListingLine(l: Listing): string {
  const bedBath = [l.beds != null ? `${l.beds === 0 ? "Studio" : `${l.beds}BR`}` : "", l.baths != null ? `${l.baths}BA` : ""]
    .filter(Boolean)
    .join(" ");
  return `${l.title} — ${l.location} — ${l.price}${bedBath ? ` (${bedBath})` : ""} — /listings/${l.id}`;
}

// Recognized independent of current inventory, so a place with zero matching
// listings still forces a "no results" outcome instead of silently being
// ignored (which would otherwise make an unrelated listing look like a match).
const KNOWN_LOCATIONS = [
  "makati", "quezon city", "manila", "taguig", "bgc", "bonifacio", "pasig", "ortigas",
  "mandaluyong", "pasay", "paranaque", "las pinas", "muntinlupa", "alabang", "cavite",
  "laguna", "cebu", "davao", "baguio", "iloilo", "tagaytay", "antipolo", "marikina",
  "caloocan", "valenzuela", "san juan", "malabon", "navotas",
];

/** Finds a location the visitor asked about — either a recognized PH city/area
 *  name, or (as a bonus for building/project names) any word shared with an
 *  actual listing's location string. */
function extractLocationQuery(message: string, allListings: Listing[]): string | undefined {
  const norm = normalize(message);
  const knownMatch = KNOWN_LOCATIONS.find((loc) => norm.includes(loc));
  if (knownMatch) return knownMatch;

  const messageTokens = new Set(tokenize(message));
  const locationWords = new Set<string>();
  for (const l of allListings) {
    for (const word of tokenize(l.location)) {
      if (word.length >= 4) locationWords.add(word);
    }
  }
  for (const word of locationWords) {
    if (messageTokens.has(word)) return word;
  }
  return undefined;
}

function matchListingSearch(ctx: ChatContext): string | null {
  if (!looksSearchLike(ctx.message)) return null;
  if (ctx.allListings.length === 0) return null;

  const criteria: ListingFilterCriteria = {};
  const beds = extractBedCount(ctx.message);
  if (beds != null) criteria.minBeds = beds;
  const baths = extractBathCount(ctx.message);
  if (baths != null) criteria.minBaths = baths;
  const { min, max } = extractPriceRange(ctx.message);
  if (min != null) criteria.minPrice = min;
  if (max != null) criteria.maxPrice = max;
  const propertyMatch = PROPERTY_TYPE_KEYWORDS.find(([keyword]) => containsAny(ctx.message, [keyword]));
  if (propertyMatch) criteria.propertyType = propertyMatch[1];
  const location = extractLocationQuery(ctx.message, ctx.allListings);
  if (location) criteria.query = location;

  const results = filterListings(ctx.allListings, criteria);
  if (results.length === 0) return null; // falls through to the fallback-to-contact template

  const sorted = [...results].sort((a, b) => priceValue(a.price) - priceValue(b.price));
  if (sorted.length <= 5) {
    return `Here's what we have: ${sorted.map(formatListingLine).join(" | ")}.`;
  }
  return `We found ${sorted.length} matching properties. A few to start: ${sorted
    .slice(0, 3)
    .map(formatListingLine)
    .join(" | ")}. See all of them at /listings.`;
}

function matchFaq(ctx: ChatContext): string | null {
  const questionTokens = new Set(tokenize(ctx.message));
  let best: { score: number; a: string } | null = null;

  for (const item of ctx.kb.faqIndex) {
    if (item.tokens.length === 0) continue;
    const overlap = item.tokens.filter((t) => questionTokens.has(t));
    const overlapRatio = overlap.length / item.tokens.length;
    const hasRareWordHit = overlap.some((t) => item.rareTokens.has(t));
    const qualifies = (overlapRatio >= 0.4 && overlap.length >= 2) || (hasRareWordHit && overlap.length >= 1);
    if (!qualifies) continue;
    if (!best || overlapRatio > best.score) best = { score: overlapRatio, a: item.a };
  }

  return best?.a ?? null;
}

const SERVICE_KEYWORDS: [string, string[]][] = [
  ["brokerage", ["broker", "sell my", "sell a property", "buy a property", "buying", "selling"]],
  ["leasing", ["lease", "rent out", "tenant", "leasing"]],
  ["property-management", ["manage my property", "property management", "maintenance", "rent collection"]],
  ["valuation", ["appraisal", "valuation", "how much is my property worth", "property worth"]],
  ["documentation-assistance", ["title transfer", "notarize", "notarial", "tax declaration", "documentation"]],
];

function matchServiceInfo(ctx: ChatContext): string | null {
  for (const [slug, keywords] of SERVICE_KEYWORDS) {
    if (containsAny(ctx.message, keywords)) {
      const service = ctx.kb.services.find((s) => s.slug === slug);
      if (service) return `${service.blurb} Learn more: ${service.href}`;
    }
  }
  return null;
}

function matchContactInfo(ctx: ChatContext): string | null {
  if (containsAny(ctx.message, ["founder", "who owns", "who runs", "license number", "prc license"])) {
    return `${ctx.kb.founder.name} is our ${ctx.kb.founder.title} (${ctx.kb.founder.license}).`;
  }
  if (containsAny(ctx.message, ["contact", "phone", "email", "call you", "where are you", "office", "address", "location"])) {
    return formatContactBlock(ctx.kb);
  }
  return null;
}

function fallback(ctx: ChatContext): string {
  const listingHint = ctx.listingSlug ? ` or use the inquiry form on this listing's page` : "";
  return `I'm not totally sure about that. ${formatContactBlock(ctx.kb)} You can also visit /contact${listingHint}.`;
}

export function routeMessage(ctx: ChatContext): string {
  return (
    matchGreeting(ctx) ??
    matchThisListing(ctx) ??
    matchListingSearch(ctx) ??
    matchFaq(ctx) ??
    matchServiceInfo(ctx) ??
    matchContactInfo(ctx) ??
    fallback(ctx)
  );
}
