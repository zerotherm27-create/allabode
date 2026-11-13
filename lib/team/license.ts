// Pure, import-free (unit tested directly via tests/helpers/load-ts.mjs).

/**
 * The accreditation label shown under a specialist's name on the profile page,
 * in the listing detail "Listed by" block and, read-only, on the specialist
 * dashboard. Staff pick one of three types per specialist; the default
 * ("salesperson") is what every specialist had before the choice existed. No
 * broker name or licence number is displayed anywhere (owner decision); the DB
 * licence columns are unused by the UI.
 */
export const ACCREDITATION_LABEL = "Accredited real estate salesperson";

export const ACCREDITATION_TYPES = ["salesperson", "sales_partner", "marketing_partner"] as const;
export type AccreditationType = (typeof ACCREDITATION_TYPES)[number];

export const DEFAULT_ACCREDITATION: AccreditationType = "salesperson";

export const ACCREDITATION_LABELS: Record<AccreditationType, string> = {
  salesperson: ACCREDITATION_LABEL,
  sales_partner: "Accredited sales partner",
  marketing_partner: "Accredited marketing partner",
};

/** Short names for the admin picker. */
export const ACCREDITATION_OPTION_NAMES: Record<AccreditationType, string> = {
  salesperson: "Real estate salesperson",
  sales_partner: "Sales partner",
  marketing_partner: "Marketing partner",
};

/** Max length of a custom designation (matches the DB check). */
export const DESIGNATION_MAX = 60;

/** Examples offered as suggestions in the admin form; any text is allowed. */
export const DESIGNATION_SUGGESTIONS = [
  "Property Specialist",
  "Senior Property Consultant",
  "Marketing Partner",
] as const;

/** Narrows a stored value to a known type; anything else (null, unknown, pre-migration) is the default. */
export function parseAccreditation(value: unknown): AccreditationType {
  return typeof value === "string" && (ACCREDITATION_TYPES as readonly string[]).includes(value)
    ? (value as AccreditationType)
    : DEFAULT_ACCREDITATION;
}

export function accreditationLabel(type?: unknown): string {
  return ACCREDITATION_LABELS[parseAccreditation(type)];
}

export function specialistTitleLine(type?: unknown): string {
  return accreditationLabel(type);
}

/** A stored designation, trimmed; null when blank or not text (the site then uses its default wording). */
export function storedDesignation(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.replace(/\s+/g, " ").trim();
  return t === "" ? null : t.slice(0, DESIGNATION_MAX);
}

export type TitleInput = { designation: unknown; accreditation: unknown };
export type TitleResult =
  | { ok: true; value: { designation: string | null; accreditation: AccreditationType } }
  | { ok: false; errors: { designation?: string; accreditation?: string } };

/** Validates the admin's designation (optional free text) and accreditation type (required, one of three). */
export function validateTitle(input: TitleInput): TitleResult {
  const errors: { designation?: string; accreditation?: string } = {};
  const raw = typeof input.designation === "string" ? input.designation.replace(/\s+/g, " ").trim() : "";
  if (raw.length > DESIGNATION_MAX) errors.designation = `Keep the designation to ${DESIGNATION_MAX} characters or fewer.`;
  if (/[<>]/.test(raw)) errors.designation = "The designation can't contain < or >.";
  if (typeof input.accreditation !== "string" || !(ACCREDITATION_TYPES as readonly string[]).includes(input.accreditation)) {
    errors.accreditation = "Choose an accreditation.";
  }
  if (errors.designation || errors.accreditation) return { ok: false, errors };
  return {
    ok: true,
    value: { designation: raw === "" ? null : raw, accreditation: input.accreditation as AccreditationType },
  };
}
