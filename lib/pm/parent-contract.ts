/**
 * Shapes and constants for an uploaded parent contract — the executed copy of
 * an agreement signed outside this system, which an Addendum can amend.
 *
 * Deliberately dependency-free and separate from `lib/ai/contract-extract.ts`:
 * the admin create form is a client component and needs the accepted mime list
 * and these types, but must not drag the OpenAI SDK into the browser bundle.
 */

/** Mime types the contract reader accepts. PDFs go to the model as a file part; the rest as images. */
export const CONTRACT_UPLOAD_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export function isSupportedContractMime(mime: string | null | undefined): boolean {
  return !!mime && CONTRACT_UPLOAD_MIMES.includes(mime);
}

export type ExtractedParty = {
  name: string | null;
  address: string | null;
  id_type: string | null;
  id_number: string | null;
  email: string | null;
  contact: string | null;
};

/** One numbered section of the original, used to drive the amended-provisions picker. */
export type ExtractedClause = { ref: string; heading: string | null; text: string | null };

export type ContractExtractionData = {
  contract_kind: string;
  contract_title: string | null;
  reference_code: string | null;
  agreement_date: string | null;
  property: {
    building_name: string | null;
    unit_number: string | null;
    address: string | null;
    description: string | null;
  };
  landlord: ExtractedParty;
  tenant: ExtractedParty;
  term: { start_date: string | null; end_date: string | null };
  monthly_rent: number | null;
  security_deposit: number | null;
  advance_rent: number | null;
  occupants: { name: string | null; id_number: string | null }[];
  bank_details: { name: string | null; bank: string | null; branch: string | null; account_number: string | null };
  clauses: ExtractedClause[];
  confidence_overall: number | null;
  warnings: string[];
};

/** Stored verbatim on `addenda.parent_extraction` so every AI-sourced field stays auditable. */
export type ContractExtraction = {
  provider: string;
  model_name: string;
  prompt_version: string;
  raw_ai_json: ContractExtractionData;
  confidence: number | null;
  warnings: string[];
  extracted_at: string;
};
