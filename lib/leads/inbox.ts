/**
 * Pure helpers for the specialist leads inbox. Import-free on purpose so it
 * can be unit-tested without a bundler and used from server and client code.
 */

export const LEAD_STAGES = ["New", "Contacted", "Viewing", "Negotiating", "Closed", "Lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const MAX_NOTES_LENGTH = 5000;

export type LeadFilter = LeadStage | "all";

export function isLeadStage(v: unknown): v is LeadStage {
  return typeof v === "string" && (LEAD_STAGES as readonly string[]).includes(v);
}

/** Parses a ?stage= value; anything unknown means "all". */
export function parseStageFilter(v: unknown): LeadFilter {
  const s = Array.isArray(v) ? v[0] : v;
  return isLeadStage(s) ? s : "all";
}

export function parseNotes(v: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (v === null || v === undefined) return { ok: true, value: "" };
  if (typeof v !== "string") return { ok: false, error: "Notes must be text." };
  const value = v.replace(/\r\n/g, "\n").trim();
  if (value.length > MAX_NOTES_LENGTH) {
    return { ok: false, error: `Notes can be up to ${MAX_NOTES_LENGTH} characters.` };
  }
  return { ok: true, value };
}

type Filterable = { name: string; email: string; lead_stage: string; created_at: string };

export function countByStage(rows: { lead_stage: string }[]): Record<LeadFilter, number> {
  const out = { all: rows.length } as Record<LeadFilter, number>;
  for (const s of LEAD_STAGES) out[s] = 0;
  for (const r of rows) if (isLeadStage(r.lead_stage)) out[r.lead_stage] += 1;
  return out;
}

export function searchMatches(row: { name: string; email: string }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q);
}

/** Filters by stage and search; New leads first, then newest first. */
export function filterLeads<T extends Filterable>(rows: T[], stage: LeadFilter, query: string): T[] {
  return rows
    .filter((r) => (stage === "all" || r.lead_stage === stage) && searchMatches(r, query))
    .sort((a, b) => {
      const an = a.lead_stage === "New" ? 0 : 1;
      const bn = b.lead_stage === "New" ? 0 : 1;
      if (an !== bn) return an - bn;
      return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
    });
}

/** Consent / unsubscribe badge state for the detail page. */
export function consentState(l: {
  consent_followup: boolean | null;
  unsubscribed_at: string | null;
}): "unsubscribed" | "consented" | "none" {
  if (l.unsubscribed_at) return "unsubscribed";
  return l.consent_followup ? "consented" : "none";
}

/** Postgres/PostgREST errors that mean the lead migration is not applied yet. */
export function isMigrationMissing(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "42703" || err.code === "42P01" || err.code === "PGRST200" || err.code === "PGRST204") return true;
  return /lead_stage|specialist_id|consent_followup|lead_email_sends|email_templates/i.test(err.message ?? "");
}
