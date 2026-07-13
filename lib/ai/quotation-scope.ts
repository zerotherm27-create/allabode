import { getOpenAI, isAiConfigured, RECEIPT_MODEL } from "@/lib/ai/client";
import type { LineItemCategory } from "@/lib/quotation/totals";

export type QuotationScopeInput = {
  title?: string;
  propertyReference?: string;
  paymentTermsType?: "cash" | "progress_billing" | "";
  lineItems: {
    category: LineItemCategory;
    item: string;
    description: string;
    quantity: number;
    unit: string;
  }[];
};

/**
 * Drafts a "Scope of Work" paragraph from the line items already entered on the
 * quotation form (works on an unsaved draft, not just a saved row). Staff review/
 * edit the result before saving — this never writes to the DB directly.
 */
export async function draftQuotationScope(input: QuotationScopeInput): Promise<string | null> {
  if (!isAiConfigured()) return null;
  try {
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: RECEIPT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You write a clear, professional \"Scope of Work\" section for a property services quotation " +
            "issued by a PRC-licensed Philippine real estate brokerage/property management firm. Write " +
            "80-150 words as one or two short paragraphs, no headings or bullet points. Summarize the work " +
            "covered by the line items provided (grouped loosely by category — unit furnishing, repairs " +
            "and improvement, or other renovation/fit-out work), in plain client-facing language. " +
            "Professional, confident tone. Do not invent work items that aren't implied by the input — " +
            "if the line items are sparse, keep the summary general rather than guessing specifics.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}
