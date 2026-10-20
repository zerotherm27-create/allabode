// Pure helpers for the admin specialists screens (import-free so they can be
// unit tested directly).
export type SpecialistStatus = "pending" | "approved" | "rejected" | "suspended";

const ORDER: Record<string, number> = { pending: 0, approved: 1, suspended: 2, rejected: 3 };

/** Pending applications first, then approved/suspended/rejected; newest first within a status. */
export function sortSpecialists<T extends { status: string; created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const d = (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9);
    if (d !== 0) return d;
    return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  });
}

/** Which controls the detail page offers for a status. Accounts are invite-only
 *  (staff add them already approved), so there is no approve/reject step. */
export function availableActions(status: string): { suspend: boolean; reinstate: boolean } {
  return {
    suspend: status === "approved",
    reinstate: status === "suspended",
  };
}

/** What the admin list shows for a row: an approved row nobody has linked yet
 *  is an invitation still waiting to be activated at /team/join. */
export type SpecialistAccountState = "invited" | "active" | "suspended" | "pending" | "rejected";

export function specialistAccountState(row: { status: string; auth_user_id?: string | null }): SpecialistAccountState {
  if (row.status === "suspended") return "suspended";
  if (row.status === "pending") return "pending";
  if (row.status === "rejected") return "rejected";
  return row.auth_user_id ? "active" : "invited";
}

export const ACCOUNT_STATE_LABEL: Record<SpecialistAccountState, string> = {
  invited: "Invited — not activated yet",
  active: "Active",
  suspended: "Suspended",
  pending: "Pending",
  rejected: "Rejected",
};

// ---------- adding a specialist (staff) ----------
export const NEW_SPECIALIST_LIMITS = { name: 120, email: 254, phone: 40, tagline: 140 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed, lower-cased email, or null when it isn't a plausible address. */
export function normalizeSpecialistEmail(raw: unknown): string | null {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!v || v.length > NEW_SPECIALIST_LIMITS.email || !EMAIL_RE.test(v)) return null;
  return v;
}

export type NewSpecialistFields = { displayName: string; email: string; phone: string | null; tagline: string | null };
export type NewSpecialistErrors = Partial<Record<"full_name" | "email" | "phone" | "tagline", string>>;

/** Validates the add-specialist form (except the web address, which the action
 *  checks with validateSubdomain plus a uniqueness lookup). */
export function validateNewSpecialist(input: {
  full_name?: unknown; email?: unknown; phone?: unknown; tagline?: unknown;
}): { ok: true; value: NewSpecialistFields } | { ok: false; errors: NewSpecialistErrors } {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const errors: NewSpecialistErrors = {};
  const displayName = str(input.full_name);
  if (displayName.length < 2) errors.full_name = "Enter the specialist's full name.";
  else if (displayName.length > NEW_SPECIALIST_LIMITS.name) errors.full_name = `Keep the name under ${NEW_SPECIALIST_LIMITS.name} characters.`;
  const email = normalizeSpecialistEmail(input.email);
  if (!email) errors.email = "Enter a valid email address.";
  const phone = str(input.phone);
  if (phone && phone.replace(/\D/g, "").length < 10) errors.phone = "Enter a mobile number with at least 10 digits, or leave it blank.";
  else if (phone.length > NEW_SPECIALIST_LIMITS.phone) errors.phone = "That mobile number is too long.";
  const tagline = str(input.tagline);
  if (tagline.length > NEW_SPECIALIST_LIMITS.tagline) errors.tagline = `Keep the tagline under ${NEW_SPECIALIST_LIMITS.tagline} characters.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { displayName, email: email!, phone: phone || null, tagline: tagline || null } };
}

/** Friendly message for a unique violation on insert (Postgres 23505), by constraint. */
export function specialistConflictMessage(
  error: { code?: string; message?: string; details?: string } | null | undefined,
  values: { email: string; subdomain: string },
): string | null {
  if (!error || error.code !== "23505") return null;
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  if (/subdomain/i.test(text)) return `The web address "${values.subdomain}" is already taken. Choose a different one.`;
  if (/email/i.test(text)) return `${values.email} has already been added as a specialist.`;
  return "That specialist already exists.";
}

/** The owner's copy-friendly activation instructions after adding someone. */
export function activationInstructions(name: string, email: string, joinUrl: string): string {
  return `Ask ${name} to go to ${joinUrl} and sign up with ${email}. Their account opens once they confirm that email.`;
}

/** True when a Postgres/PostgREST error means the specialists table is missing. */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205"
    || /relation .*specialists.* does not exist|Could not find the table/i.test(error.message ?? "");
}

// ---------- listing approval (staff queue) ----------
export type ApprovalFilter = "all" | "submitted" | "approved" | "rejected" | "draft";

export const APPROVAL_FILTERS: readonly ApprovalFilter[] = ["all", "submitted", "approved", "rejected", "draft"];

export const REJECTION_NOTE_MAX = 500;

/** Approval states staff can approve from: a submission, or a listing they sent
 *  back or took down earlier (reinstating it). */
export const APPROVABLE_FROM = ["submitted", "rejected"] as const;

/** Approval states staff can reject from: a submission (send back), or a live
 *  approved listing (take down). */
export const REJECTABLE_FROM = ["submitted", "approved"] as const;

/** Staff can approve a submitted listing, or reinstate a rejected/taken-down one.
 *  A house listing (no specialist) left in draft can also be approved, so it is
 *  never stranded with no control. */
export function canApproveListing(
  approvalStatus: string | null | undefined,
  opts: { house?: boolean } = {},
): boolean {
  if (opts.house && approvalStatus === "draft") return true;
  return (APPROVABLE_FROM as readonly unknown[]).includes(approvalStatus);
}

/** Staff can send back a submission, or take down an approved listing (note required). */
export function canRejectListing(approvalStatus: string | null | undefined): boolean {
  return (REJECTABLE_FROM as readonly unknown[]).includes(approvalStatus);
}

/** Required, trimmed, length-capped note shown to the specialist. */
export function normalizeRejectionNote(
  raw: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return { ok: false, error: "Add a note telling the specialist what to change." };
  if (value.length > REJECTION_NOTE_MAX) {
    return { ok: false, error: `Keep the note under ${REJECTION_NOTE_MAX} characters.` };
  }
  return { ok: true, value };
}

/** The status a listing moves to when approved: a Draft goes live as Available. */
export function statusAfterApproval(status: string | null | undefined): string | null {
  return status === "Draft" ? "Available" : null;
}

export function parseApprovalFilter(raw: unknown): ApprovalFilter {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (APPROVAL_FILTERS as readonly unknown[]).includes(v) ? (v as ApprovalFilter) : "all";
}

/** Count of rows per approval status, plus the total under "all". */
export function approvalCounts<T extends { approval_status?: string | null }>(
  rows: T[],
): Record<ApprovalFilter, number> {
  const counts: Record<ApprovalFilter, number> = { all: rows.length, submitted: 0, approved: 0, rejected: 0, draft: 0 };
  for (const r of rows) {
    const s = r.approval_status ?? "approved";
    if (s === "submitted" || s === "approved" || s === "rejected" || s === "draft") counts[s] += 1;
  }
  return counts;
}

/** Filters by approval status; "all" keeps everything but lists awaiting-approval rows first (stable). */
export function filterByApproval<T extends { approval_status?: string | null }>(
  rows: T[],
  filter: ApprovalFilter,
): T[] {
  if (filter !== "all") return rows.filter((r) => (r.approval_status ?? "approved") === filter);
  const awaiting = rows.filter((r) => r.approval_status === "submitted");
  const rest = rows.filter((r) => r.approval_status !== "submitted");
  return [...awaiting, ...rest];
}

/** True when a PostgREST/Postgres error means a column or embedded relationship is not there yet
 *  (the specialists migration has not been run). */
export function isMissingColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204" || error.code === "PGRST200"
    || /column .* does not exist|Could not find (the )?['"]?\w+['"]? column|Could not find a relationship/i.test(error.message ?? "");
}
