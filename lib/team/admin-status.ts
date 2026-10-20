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
