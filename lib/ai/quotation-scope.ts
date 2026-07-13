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
            "You write the \"Scope of Work\" section for a property services quotation issued by a " +
            "PRC-licensed Philippine real estate brokerage/property management firm. Write it as a technical " +
            "work specification, not marketing copy: state exactly what work will be performed, using the " +
            "quantities, units, items, and descriptions given, grouped by category (unit furnishing, repairs " +
            "and improvement, other renovation/fit-out). Use short bullet points, one per item or logical " +
            "group of items — each bullet states the concrete action (supply, install, remove, repaint, " +
            "repair, replace, etc.), the item, and its quantity/spec exactly as given. " +
            "Do not use marketing or sales language — no adjectives like \"premium\", \"exceptional\", " +
            "\"elevate\", \"transform\", no exclamation points, no persuasive framing. Plain, neutral, " +
            "precise technical language only, as you'd find in a contractor's work order. " +
            "Do not invent work items, materials, or specifications that aren't implied by the input — " +
            "if a line item is sparse, state only what's given rather than guessing specifics.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}
