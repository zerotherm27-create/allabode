/** Lowercase, strip punctuation, collapse whitespace. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

export function containsAny(s: string, keywords: string[]): boolean {
  const n = normalize(s);
  return keywords.some((k) => n.includes(normalize(k)));
}

const NUMBER_WORD_MULTIPLIER: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  m: 1_000_000,
  million: 1_000_000,
};

/** Parses "5m", "5 million", "500k", "5,000,000", "₱5000000" into a number. */
function parseAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/[₱,]/g, "").trim().toLowerCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*(k|thousand|m|million)?$/);
  if (!match) return undefined;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return undefined;
  const mult = match[2] ? NUMBER_WORD_MULTIPLIER[match[2]] : 1;
  return base * mult;
}

const AMOUNT_TOKEN = "₱?\\s*[\\d,]+(?:\\.\\d+)?\\s*(?:k|thousand|m|million)?";

/** Extracts a price range from free text: "under 5 million", "5m-10m", "around 30k", "between 3M and 6M". */
export function extractPriceRange(message: string): { min?: number; max?: number } {
  const text = message.toLowerCase();

  const between = text.match(
    new RegExp(`between\\s+(${AMOUNT_TOKEN})\\s+(?:and|to|-)\\s+(${AMOUNT_TOKEN})`, "i")
  );
  if (between) {
    const min = parseAmount(between[1]);
    const max = parseAmount(between[2]);
    if (min != null || max != null) return { min, max };
  }

  const range = text.match(new RegExp(`(${AMOUNT_TOKEN})\\s*(?:-|to)\\s*(${AMOUNT_TOKEN})`, "i"));
  if (range) {
    const min = parseAmount(range[1]);
    const max = parseAmount(range[2]);
    if (min != null || max != null) return { min, max };
  }

  const under = text.match(new RegExp(`(?:under|below|less than|up to|within|max(?:imum)?)\\s+(${AMOUNT_TOKEN})`, "i"));
  if (under) {
    const max = parseAmount(under[1]);
    if (max != null) return { max };
  }

  const over = text.match(new RegExp(`(?:over|above|more than|at least|min(?:imum)?)\\s+(${AMOUNT_TOKEN})`, "i"));
  if (over) {
    const min = parseAmount(over[1]);
    if (min != null) return { min };
  }

  const around = text.match(new RegExp(`(?:around|about|budget of|budget is)\\s+(${AMOUNT_TOKEN})`, "i"));
  if (around) {
    const amount = parseAmount(around[1]);
    if (amount != null) return { min: amount * 0.8, max: amount * 1.2 };
  }

  const bare = text.match(new RegExp(`(${AMOUNT_TOKEN})`, "i"));
  if (bare) {
    const amount = parseAmount(bare[1]);
    // A bare number needs a unit or comma-grouping to count as a price signal —
    // an unqualified "2" or "3" is almost always a bedroom/bathroom count instead.
    if (amount != null && /[km,]|thousand|million/i.test(bare[1])) return { min: amount * 0.8, max: amount * 1.2 };
  }

  return {};
}

export function extractBedCount(message: string): number | undefined {
  const match = message.toLowerCase().match(/(\d+)\s*(?:bed|bedroom|br)\b/);
  return match ? Number(match[1]) : undefined;
}

export function extractBathCount(message: string): number | undefined {
  const match = message.toLowerCase().match(/(\d+)\s*(?:bath|bathroom|cr|toilet)\b/);
  return match ? Number(match[1]) : undefined;
}
