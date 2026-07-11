import { getOpenAI, isAiConfigured, RECEIPT_MODEL } from "@/lib/ai/client";
import type { RawPoi } from "@/lib/nearby-places/overpass";

export type NearbyPlace = { name: string; category: string; distanceM: number; blurb?: string };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    places: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          distanceM: { type: "number" },
          blurb: { type: "string" },
        },
        required: ["name", "category", "distanceM", "blurb"],
      },
    },
  },
  required: ["places"],
} as const;

const SYSTEM_PROMPT =
  "You are given a JSON array of real nearby places (name, category, distance in meters) near a " +
  "property listing. Curate this down to only the important, well-known, or notable places — for " +
  "each category, keep roughly the 2-3 most recognizable or significant entries (major malls, " +
  "major hospitals, established schools, main transit stops) and leave out small, generic, or " +
  "obscure ones. Add a short one-line blurb per place you keep. You must NOT invent, rename, or " +
  "alter any place you keep — every `name` and `distanceM` you return must exactly match an entry " +
  "from the input, copied unchanged. It is expected and correct to omit most input places. Return " +
  "valid JSON matching the schema.";

/** Deterministic non-AI curation: closest 3 per category, distance-sorted overall. */
function plainList(pois: RawPoi[]): NearbyPlace[] {
  const byCategory = new Map<string, RawPoi[]>();
  for (const p of pois) {
    const list = byCategory.get(p.category) ?? [];
    list.push(p);
    byCategory.set(p.category, list);
  }
  return Array.from(byCategory.values())
    .flatMap((list) => list.slice().sort((a, b) => a.distanceM - b.distanceM).slice(0, 3))
    .sort((a, b) => a.distanceM - b.distanceM)
    .map((p) => ({ name: p.name, category: p.category, distanceM: p.distanceM }));
}

/**
 * Curates real OSM results down to the important/notable few via AI — never
 * invents places, only selects a subset and blurbs it. Post-validates the
 * AI's output by rejecting any item whose name doesn't exactly match an
 * input POI, falling back to a deterministic closest-3-per-category list if
 * AI is unavailable, errors, or fails validation entirely.
 */
export async function summarizeNearbyPlaces(pois: RawPoi[]): Promise<NearbyPlace[]> {
  if (pois.length === 0) return [];
  if (!isAiConfigured()) return plainList(pois);

  try {
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: RECEIPT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(pois) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "nearby_places", schema: SCHEMA, strict: true },
      },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) return plainList(pois);
    const parsed = JSON.parse(text) as { places: NearbyPlace[] };

    const validNames = new Set(pois.map((p) => p.name.trim().toLowerCase()));
    const validated = (parsed.places ?? []).filter((p) => validNames.has(p.name.trim().toLowerCase()));

    return validated.length > 0 ? validated : plainList(pois);
  } catch {
    return plainList(pois);
  }
}
