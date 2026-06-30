import { getOpenAI, isAiConfigured } from "@/lib/ai/client";

const VALIDATE_MODEL = "gpt-4.1-mini";

const VALIDATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    safe: { type: "boolean" },
    flags: { type: "array", items: { type: "string" } },
  },
  required: ["safe", "flags"],
} as const;

export type SoaValidationResult = { safe: boolean; flags: string[] };

export async function validateSoaForAutoApproval(input: {
  totalIncome: number;
  totalDeductions: number;
  payout: number;
  mgmtFeePct: number;
  vatPct: number;
  lines: { line_type: string; description: string; amount: number }[];
  prevSoaPayout?: number | null;
}): Promise<SoaValidationResult> {
  const { totalIncome, totalDeductions, payout, mgmtFeePct, vatPct, lines, prevSoaPayout } = input;

  // ── Deterministic pre-checks — no AI needed ──
  if (payout < 0) {
    return { safe: false, flags: ["Payout is negative — manual review required before publishing to owner"] };
  }

  const mgmtFeeLine = lines.find((l) => l.line_type === "deduction_mgmt_fee");
  const vatLine = lines.find((l) => l.line_type === "deduction_vat");
  const expectedMgmt = Math.round(totalIncome * (mgmtFeePct / 100) * 100) / 100;
  const actualMgmt = mgmtFeeLine ? Math.abs(mgmtFeeLine.amount) : 0;
  const expectedVat = Math.round(actualMgmt * (vatPct / 100) * 100) / 100;
  const actualVat = vatLine ? Math.abs(vatLine.amount) : 0;

  const mathFlags: string[] = [];
  if (Math.abs(actualMgmt - expectedMgmt) > 1) {
    mathFlags.push(`Management fee mismatch: expected ₱${expectedMgmt.toFixed(2)}, found ₱${actualMgmt.toFixed(2)}`);
  }
  if (Math.abs(actualVat - expectedVat) > 1) {
    mathFlags.push(`VAT mismatch: expected ₱${expectedVat.toFixed(2)}, found ₱${actualVat.toFixed(2)}`);
  }
  if (mathFlags.length > 0) {
    return { safe: false, flags: mathFlags };
  }

  // ── AI plausibility check ──
  if (!isAiConfigured()) {
    return { safe: false, flags: ["AI validation unavailable — manual review required (OPENAI_API_KEY not set)"] };
  }

  try {
    const client = getOpenAI();
    const summary = {
      totalIncome,
      totalDeductions,
      payout,
      lineCount: lines.length,
      incomeLines: lines.filter((l) => l.line_type.startsWith("income_")).map((l) => ({ type: l.line_type, amount: l.amount })),
      deductionLines: lines.filter((l) => l.line_type.startsWith("deduction_")).map((l) => ({ type: l.line_type, amount: l.amount })),
      prevSoaPayout: prevSoaPayout ?? null,
    };

    const completion = await client.chat.completions.create({
      model: VALIDATE_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You validate Philippine property management Statements of Account for plausibility before auto-publishing to owners. " +
            "Flag anomalies, not normal variation. Be conservative — only flag if something is genuinely unusual. " +
            "Return safe:true if the SOA looks routine and correct.",
        },
        {
          role: "user",
          content: `Validate this SOA:\n${JSON.stringify(summary, null, 2)}\n\n` +
            "Check: (1) Income lines are present and non-zero. " +
            "(2) No single deduction exceeds 80% of total income. " +
            (prevSoaPayout != null
              ? `(3) Current payout (${payout}) is not more than 30% different from previous payout (${prevSoaPayout}) without a clear reason (e.g. new expenses, first month). `
              : "") +
            "Return safe:true if everything looks routine. Return safe:false with specific flags if something is unusual.",
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "soa_validation", schema: VALIDATE_SCHEMA, strict: true },
      },
    });

    const text = completion.choices[0]?.message?.content ?? '{"safe":false,"flags":["AI returned empty response"]}';
    return JSON.parse(text) as SoaValidationResult;
  } catch (e) {
    return {
      safe: false,
      flags: [`AI validation error: ${e instanceof Error ? e.message : String(e)} — manual review required`],
    };
  }
}
