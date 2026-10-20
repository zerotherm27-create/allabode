// Pure, import-free (unit tested directly via tests/helpers/load-ts.mjs).

/**
 * The fixed accreditation label every property specialist shows: under their
 * name on the profile page, in the listing detail "Listed by" block and,
 * read-only, on the specialist dashboard. No broker name or licence number is
 * displayed anywhere (owner decision); the DB licence columns are unused by the UI.
 */
export const ACCREDITATION_LABEL = "Accredited real estate salesperson";

export function specialistTitleLine(): string {
  return ACCREDITATION_LABEL;
}
