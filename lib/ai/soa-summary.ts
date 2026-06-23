import { getOpenAI, isAiConfigured, RECEIPT_MODEL } from "@/lib/ai/client";
import type { SoaTotals, SoaType } from "@/lib/finance/soa";

/**
 * Optional plain-English summary of a statement for the recipient. AI may describe
 * the provided figures only — it never computes or changes them (spec §10.8 step 5).
 * Returns null when AI is unavailable so publishing still works.
 */
export async function generateSoaSummary(input: {
  type: SoaType;
  party: string;
  periodStart: string;
  periodEnd: string;
  totals: SoaTotals;
}): Promise<string | null> {
  if (!isAiConfigured()) return null;
  try {
    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: RECEIPT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You write a brief (2-3 sentence), neutral, plain-English summary of a property statement of account for the recipient. " +
            "Describe only the figures provided. Do not invent numbers, do not recompute, do not give financial advice.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}
