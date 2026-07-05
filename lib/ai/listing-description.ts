import { getOpenAI, isAiConfigured, RECEIPT_MODEL } from "@/lib/ai/client";

export type ListingDescriptionInput = {
  title: string;
  location?: string;
  city?: string;
  province?: string;
  listingCategory?: string;
  leaseType?: string;
  propertyType?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floorArea?: number | null;
  lotArea?: number | null;
  furnishing?: string;
  price?: number | null;
  priceLabel?: string;
  amenities?: string[];
};

/**
 * Drafts an SEO-friendly listing description from the fields already filled in on the
 * admin form (works on an unsaved "new listing" draft, not just a saved row). Staff
 * review/edit the result before saving — this never writes to the DB directly.
 */
export async function draftListingDescription(input: ListingDescriptionInput): Promise<string | null> {
  if (!isAiConfigured()) return null;
  try {
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: RECEIPT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You write a compelling, SEO-friendly real estate listing description for a PRC-licensed " +
            "Philippine property brokerage. Write 120-160 words as one or two short paragraphs, no " +
            "headings or bullet points. Naturally work in the location, property type, and key specs/" +
            "amenities provided so the text reads well for search engines, without keyword-stuffing. " +
            "Professional, confident tone. Do not invent facts that aren't in the input — if a detail " +
            "isn't given, write generally instead of guessing specifics.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}
