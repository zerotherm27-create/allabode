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

/** Which controls the detail page offers for a status. */
export function availableActions(status: string): {
  approve: boolean; reject: boolean; suspend: boolean; reinstate: boolean;
} {
  return {
    approve: status === "pending" || status === "rejected",
    reject: status === "pending",
    suspend: status === "approved",
    reinstate: status === "suspended",
  };
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

/** Staff can approve only what a specialist has submitted. */
export function canApproveListing(approvalStatus: string | null | undefined): boolean {
  return approvalStatus === "submitted";
}

/** Staff can send back only what a specialist has submitted. */
export function canRejectListing(approvalStatus: string | null | undefined): boolean {
  return approvalStatus === "submitted";
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
