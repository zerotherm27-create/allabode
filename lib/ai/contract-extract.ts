import {
  getOpenAI,
  isAiConfigured,
  AI_PROVIDER,
  CONTRACT_MODEL,
  CONTRACT_PROMPT_VERSION,
} from "@/lib/ai/client";
import { isImageMime } from "@/lib/ai/receipts";
import {
  isSupportedContractMime,
  type ContractExtraction,
  type ContractExtractionData,
} from "@/lib/pm/parent-contract";

export type {
  ContractExtraction, ContractExtractionData, ExtractedClause, ExtractedParty,
} from "@/lib/pm/parent-contract";
export { CONTRACT_UPLOAD_MIMES, isSupportedContractMime } from "@/lib/pm/parent-contract";

/**
 * Reads an already-executed contract (one signed on paper or in Word, before
 * this platform existed) so an Addendum can amend it.
 *
 * Everything here is *review material*: the admin form shows every extracted
 * value in an editable field and nothing reaches the printed Addendum without
 * a staff member having looked at it. That is why the schema is generous with
 * nulls and asks the model for `warnings` — a blank field a human fills in is
 * always better than a confident guess in a legal document.
 */

const NULLABLE_STRING = { type: ["string", "null"] } as const;

function party(role: string) {
  return {
    type: "object",
    additionalProperties: false,
    description: `The ${role} as named in the contract`,
    properties: {
      name: NULLABLE_STRING,
      address: NULLABLE_STRING,
      id_type: { type: ["string", "null"], description: "e.g. Driver's License, PhilID, Passport" },
      id_number: NULLABLE_STRING,
      email: NULLABLE_STRING,
      contact: NULLABLE_STRING,
    },
    required: ["name", "address", "id_type", "id_number", "email", "contact"],
  } as const;
}

const CONTRACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    contract_kind: {
      type: "string",
      description:
        "tenancy (residential/commercial lease) | parking (parking slot rental) | " +
        "short_term_rental | pm (property management appointment) | unknown",
    },
    contract_title: { type: ["string", "null"], description: "The document's own title, e.g. TENANCY AGREEMENT" },
    reference_code: { type: ["string", "null"], description: "Any contract/reference number printed on it" },
    agreement_date: { type: ["string", "null"], description: "Date the contract was made, YYYY-MM-DD" },
    property: {
      type: "object",
      additionalProperties: false,
      properties: {
        building_name: NULLABLE_STRING,
        unit_number: NULLABLE_STRING,
        address: NULLABLE_STRING,
        description: { type: ["string", "null"], description: "One line naming the premises, unit first" },
      },
      required: ["building_name", "unit_number", "address", "description"],
    },
    landlord: party("landlord, lessor, owner or principal"),
    tenant: party("tenant, lessee or appointed manager's counterparty"),
    term: {
      type: "object",
      additionalProperties: false,
      properties: {
        start_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
        end_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
      },
      required: ["start_date", "end_date"],
    },
    monthly_rent: { type: ["number", "null"] },
    security_deposit: { type: ["number", "null"] },
    advance_rent: { type: ["number", "null"] },
    occupants: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { name: NULLABLE_STRING, id_number: NULLABLE_STRING },
        required: ["name", "id_number"],
      },
    },
    bank_details: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: ["string", "null"], description: "Account name" },
        bank: NULLABLE_STRING,
        branch: NULLABLE_STRING,
        account_number: NULLABLE_STRING,
      },
      required: ["name", "bank", "branch", "account_number"],
    },
    clauses: {
      type: "array",
      description:
        "Every numbered section of the contract, in document order, including sub-clauses " +
        "such as 3.1 or 3.2. `text` is the section's wording copied verbatim.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          ref: { type: "string", description: "Section number as printed, e.g. 3 or 3.2" },
          heading: NULLABLE_STRING,
          text: NULLABLE_STRING,
        },
        required: ["ref", "heading", "text"],
      },
    },
    confidence_overall: { type: "number", description: "0..1 self-reported confidence" },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "contract_kind", "contract_title", "reference_code", "agreement_date", "property",
    "landlord", "tenant", "term", "monthly_rent", "security_deposit", "advance_rent",
    "occupants", "bank_details", "clauses", "confidence_overall", "warnings",
  ],
} as const;

const SYSTEM_PROMPT =
  "You read executed Philippine property contracts (tenancy/lease, parking slot rental, " +
  "short-term rental, property management appointment) and return their contents as structured data. " +
  "Copy only what the document actually says. If a value is absent or unreadable, return null and add a " +
  "short note to `warnings` — never infer, complete or tidy up a term. " +
  "Dates as YYYY-MM-DD. Amounts as plain numbers (no currency symbols, no thousands separators). " +
  "For `clauses`, list every numbered section in order and copy its wording verbatim, preserving the " +
  "numbering exactly as printed. " +
  "Set confidence_overall lower when the document is a scan, is skewed or blurry, is handwritten, " +
  "or when pages appear to be missing.";

/**
 * Runs AI extraction over an uploaded contract. PDFs are sent to the model as a
 * file part rather than being parsed locally — that keeps the repo free of a PDF
 * text-extraction dependency and, more importantly, handles scanned originals,
 * which a text extractor cannot read at all.
 *
 * Guard with `isAiConfigured()` first: without a key the caller should fall back
 * to staff typing the four snapshot fields by hand, the same way the receipt
 * pipeline degrades to manual entry.
 */
export async function extractParentContract(
  fileBuffer: Buffer,
  mime: string,
  filename: string,
): Promise<ContractExtraction> {
  if (!isAiConfigured()) throw new Error("AI not configured");
  if (!isSupportedContractMime(mime)) throw new Error(`Unsupported file type: ${mime}`);

  const client = getOpenAI();
  const dataUrl = `data:${mime};base64,${fileBuffer.toString("base64")}`;
  const filePart = isImageMime(mime)
    ? ({ type: "image_url", image_url: { url: dataUrl } } as const)
    : ({ type: "file", file: { filename, file_data: dataUrl } } as const);

  const completion = await client.chat.completions.create({
    model: CONTRACT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Read this executed contract into the required schema." },
          filePart,
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "contract_extraction", schema: CONTRACT_SCHEMA, strict: true },
    },
  });

  const text = completion.choices[0]?.message?.content ?? "{}";
  const raw = JSON.parse(text) as ContractExtractionData;

  return {
    provider: AI_PROVIDER,
    model_name: CONTRACT_MODEL,
    prompt_version: CONTRACT_PROMPT_VERSION,
    raw_ai_json: raw,
    confidence: typeof raw.confidence_overall === "number" ? raw.confidence_overall : null,
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    extracted_at: new Date().toISOString(),
  };
}
