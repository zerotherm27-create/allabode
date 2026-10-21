// Import-free on purpose (loaded directly by unit tests). Pure helpers that
// decide how /api/leads stores an inquiry: which database function, with what
// arguments, and whether follow-up consent was given.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/** A well-formed UUID string (lowercased) or null. Never throws. */
export function parseListingUuid(v: unknown): string | null {
  return typeof v === "string" && UUID.test(v.trim()) ? v.trim().toLowerCase() : null;
}

/**
 * Consent to follow-up emails. The single required checkbox covers both the
 * inquiry and follow-ups, so it counts only when the base consent is also
 * exactly `true`. Anything else (missing, "true", 1) is false.
 */
export function parseFollowupConsent(body: Record<string, unknown>): boolean {
  return body.consent === true && body.consentFollowup === true;
}

export type IntakePlan =
  | { kind: "specialist"; slug: string; listingId: string | null }
  | { kind: "listing"; listingId: string; type: "inquiry" | "viewing" }
  | { kind: "plain" };

/**
 * Chooses the intake path. A specialist slug wins (microsite form); otherwise a
 * listing id on an inquiry/viewing lead selects the listing function; every
 * other lead stays a plain insert.
 */
export function planIntake(type: string, body: Record<string, unknown>): IntakePlan {
  if (type === "inquiry" && typeof body.specialist === "string" && SLUG.test(body.specialist)) {
    return { kind: "specialist", slug: body.specialist, listingId: parseListingUuid(body.listingId) };
  }
  if (type === "inquiry" || type === "viewing") {
    const listingId = parseListingUuid(body.listingId);
    if (listingId) return { kind: "listing", listingId, type };
  }
  return { kind: "plain" };
}

function detailsOf(row: Record<string, unknown>): Record<string, unknown> {
  const d = row.details;
  return d && typeof d === "object" && !Array.isArray(d) ? (d as Record<string, unknown>) : {};
}

/** Arguments for create_specialist_inquiry, from a validated inquiry row. */
export function specialistRpcArgs(
  row: Record<string, unknown>,
  slug: string,
  listingId: string | null,
  consent: boolean,
) {
  const { listing, ...rest } = detailsOf(row);
  return {
    p_specialist_slug: slug,
    p_name: row.name,
    p_email: row.email,
    p_phone: row.phone,
    p_message: row.message ?? null,
    p_listing_id: listingId,
    p_consent_followup: consent,
    // A specialist-page message is not about a listing title: drop a null key.
    p_details: listing != null ? { ...rest, listing } : rest,
  };
}

/** Arguments for create_listing_inquiry, from a validated inquiry/viewing row. */
export function listingRpcArgs(
  row: Record<string, unknown>,
  listingId: string,
  type: "inquiry" | "viewing",
  consent: boolean,
) {
  return {
    p_listing_id: listingId,
    p_name: row.name,
    p_email: row.email,
    p_phone: row.phone,
    p_message: row.message ?? null,
    p_consent_followup: consent,
    p_details: detailsOf(row),
    p_type: type,
    p_preferred_viewing_date: row.preferred_viewing_date ?? null,
    p_preferred_contact_method: row.preferred_contact_method ?? null,
  };
}

/** True when a database error is the functions' "invalid input" signal (safe to show). */
export function isInputError(err: { code?: string } | null | undefined): boolean {
  return err?.code === "22023";
}

// ---- Admin assignment ----

export type AssignSpecialist = { id: string; status: string | null };

/** Why an assignment is refused, or null when it is allowed. null target = unassign. */
export function assignmentProblem(target: AssignSpecialist | null, wantsAssign: boolean): string | null {
  if (!wantsAssign) return null;
  if (!target) return "That specialist could not be found.";
  if (target.status !== "approved") return "Only approved specialists can be assigned leads.";
  return null;
}

/** A specialist-page lead that never got assigned (the gap before assignment existed). */
export function isUnassignedSpecialistLead(row: { details?: unknown; specialist_id?: string | null }): boolean {
  const d = row.details;
  return (
    !row.specialist_id &&
    !!d &&
    typeof d === "object" &&
    !Array.isArray(d) &&
    (d as Record<string, unknown>).source === "specialist-page"
  );
}
