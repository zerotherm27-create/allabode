import {
  getOpenAI,
  isAiConfigured,
  AI_PROVIDER,
  RECEIPT_MODEL,
  RECEIPT_PROMPT_VERSION,
} from "@/lib/ai/client";

// Strict JSON schema for the extraction (spec §10.6). Strict mode requires every
// property listed in `required` and `additionalProperties: false`; optional values
// use nullable types.
const RECEIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    vendor_name: { type: ["string", "null"] },
    vendor_address: { type: ["string", "null"] },
    receipt_number: { type: ["string", "null"] },
    receipt_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    receipt_time: { type: ["string", "null"], description: "HH:mm 24h" },
    currency: { type: "string", description: "ISO code; PHP if unclear" },
    subtotal: { type: ["number", "null"] },
    vat_amount: { type: ["number", "null"] },
    service_charge: { type: ["number", "null"] },
    discount: { type: ["number", "null"] },
    total_amount: { type: ["number", "null"] },
    payment_method: { type: ["string", "null"] },
    tin: { type: ["string", "null"] },
    line_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          description: { type: ["string", "null"] },
          quantity: { type: ["number", "null"] },
          unit_price: { type: ["number", "null"] },
          amount: { type: ["number", "null"] },
        },
        required: ["description", "quantity", "unit_price", "amount"],
      },
    },
    expense_category_suggestion: { type: ["string", "null"] },
    charge_to: { type: ["string", "null"], description: "owner | tenant | company | split | unknown" },
    confidence_overall: { type: "number", description: "0..1 self-reported confidence" },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "vendor_name", "vendor_address", "receipt_number", "receipt_date", "receipt_time",
    "currency", "subtotal", "vat_amount", "service_charge", "discount", "total_amount",
    "payment_method", "tin", "line_items", "expense_category_suggestion", "charge_to",
    "confidence_overall", "warnings",
  ],
} as const;

const SYSTEM_PROMPT =
  "You extract structured data from Philippine sales receipts and invoices. " +
  "Read only what is visible. If a value is unreadable or absent, return null and add a short note to `warnings`. " +
  "Never guess amounts. Dates as YYYY-MM-DD. Amounts as plain numbers (no currency symbols, no thousands separators). " +
  "Set confidence_overall lower when the image is blurry, crumpled, handwritten, or partially cut off.";

export type ReceiptExtraction = {
  raw_ai_json: Record<string, unknown>;
  normalized_json: Record<string, unknown>;
  provider: string;
  model_name: string;
  prompt_version: string;
  confidence: number | null;
  warnings: string[];
};

/** True for mime types we can send to the vision model as an image. */
export function isImageMime(mime: string | null | undefined) {
  return !!mime && ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(mime);
}

/**
 * Runs AI extraction on a receipt image. Image inputs only (callers should route
 * PDFs/other to manual review). Returns the raw model JSON plus a lightly
 * normalized copy (currency forced to PHP, numbers coerced) — stored separately
 * so the untouched AI output is always auditable (spec §10.6/§10.12).
 */
export async function extractReceipt(fileBuffer: Buffer, mime: string): Promise<ReceiptExtraction> {
  if (!isAiConfigured()) throw new Error("AI not configured");
  const client = getOpenAI();
  const dataUrl = `data:${mime};base64,${fileBuffer.toString("base64")}`;

  const completion = await client.chat.completions.create({
    model: RECEIPT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract this receipt into the required schema." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "receipt_extraction", schema: RECEIPT_SCHEMA, strict: true },
    },
  });

  const text = completion.choices[0]?.message?.content ?? "{}";
  const raw = JSON.parse(text) as Record<string, unknown>;

  const num = (v: unknown): number | null => {
    const n = typeof v === "string" ? Number(v.replace(/[^0-9.-]/g, "")) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const normalized: Record<string, unknown> = {
    ...raw,
    currency: "PHP",
    subtotal: num(raw.subtotal),
    vat_amount: num(raw.vat_amount),
    service_charge: num(raw.service_charge),
    discount: num(raw.discount),
    total_amount: num(raw.total_amount),
  };

  const confidence = typeof raw.confidence_overall === "number" ? raw.confidence_overall : null;
  const warnings = Array.isArray(raw.warnings) ? (raw.warnings as string[]) : [];

  return {
    raw_ai_json: raw,
    normalized_json: normalized,
    provider: AI_PROVIDER,
    model_name: RECEIPT_MODEL,
    prompt_version: RECEIPT_PROMPT_VERSION,
    confidence,
    warnings,
  };
}
