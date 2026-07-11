import { getOpenAI, isAiConfigured, RECEIPT_MODEL } from "@/lib/ai/client";
import type { ListingDescriptionInput } from "@/lib/ai/listing-description";

const SEO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    seo_title: { type: "string" },
    meta_description: { type: "string" },
  },
  required: ["seo_title", "meta_description"],
} as const;

const SYSTEM_PROMPT =
  "You optimize the title and search-result meta description for a Philippine real estate listing " +
  "(PRC-licensed brokerage). `seo_title`: under 60 characters, leads with property type, bedroom count " +
  "(if given), the market (for sale / for rent), and the city or neighborhood — written naturally, not " +
  "keyword-stuffed, no ALL CAPS or spammy punctuation. `meta_description`: 140-160 characters, one or two " +
  "natural sentences covering location, price, and a light call-to-action, written for a Google search " +
  "result snippet, no keyword-stuffing. Do not invent facts that aren't in the input — write generally " +
  "instead of guessing specifics that aren't given.";

export type ListingSeoResult = {
  title: string;
  metaDescription: string;
};

/**
 * Drafts an SEO-optimized title + meta description from the fields already filled in on the
 * admin form (works on an unsaved draft, not just a saved row). Staff review/edit the result
 * before saving — this never writes to the DB directly.
 */
export async function draftListingSeo(input: ListingDescriptionInput): Promise<ListingSeoResult | null> {
  if (!isAiConfigured()) return null;
  try {
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: RECEIPT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(input) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "listing_seo", schema: SEO_SCHEMA, strict: true },
      },
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { seo_title: string; meta_description: string };
    return { title: parsed.seo_title, metaDescription: parsed.meta_description };
  } catch {
    return null;
  }
}
