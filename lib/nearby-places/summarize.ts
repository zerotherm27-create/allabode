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
  "property listing. Your only job is to group/relabel categories sensibly and add a short " +
  "one-line blurb per place. You must NOT add, remove, or rename any place — every `name` in " +
  "your output must exactly match a `name` from the input, and `distanceM` must be copied " +
  "unchanged. Return valid JSON matching the schema.";

function plainList(pois: RawPoi[]): NearbyPlace[] {
  return pois.map((p) => ({ name: p.name, category: p.category, distanceM: p.distanceM }));
}

/**
 * Groups/blurbs real OSM results via AI — never invents places. Post-validates
 * the AI's output by rejecting any item whose name doesn't exactly match an
 * input POI, falling back to the plain grouped list if AI is unavailable,
 * errors, or fails validation entirely.
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
