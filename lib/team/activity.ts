/**
 * Pure helpers for the owner "Specialist activity overview". Import-free on
 * purpose so it can be unit-tested without a bundler. Callers pass plain rows
 * (already fetched with the staff session client) and a clock.
 */

export const ACTIVITY_RANGES = [7, 30, 90] as const;
export type ActivityRange = (typeof ACTIVITY_RANGES)[number];
export const DEFAULT_RANGE: ActivityRange = 30;

/** Parses ?range= ; anything unknown falls back to 30. */
export function parseRange(v: unknown): ActivityRange {
  const s = Array.isArray(v) ? v[0] : v;
  const n = typeof s === "string" ? Number(s) : NaN;
  return (ACTIVITY_RANGES as readonly number[]).includes(n) ? (n as ActivityRange) : DEFAULT_RANGE;
}

export const ACTIVITY_STAGES = ["New", "Contacted", "Viewing", "Negotiating", "Closed", "Lost"] as const;
export type ActivityStage = (typeof ACTIVITY_STAGES)[number];

/** A New lead untouched for longer than this is "stale". */
export const STALE_HOURS = 24;

export type ActivitySpecialist = { id: string; display_name: string };
export type ActivityListing = {
  specialist_id: string | null;
  approval_status?: string | null;
  status?: string | null;
};
export type ActivityInquiry = {
  id: string;
  name?: string | null;
  specialist_id: string | null;
  lead_stage?: string | null;
  created_at: string;
  unsubscribed_at?: string | null;
};
export type ActivitySend = {
  specialist_id: string | null;
  status: string;
  sent_at?: string | null;
  created_at?: string | null;
};

export type ListingBuckets = { live: number; awaiting: number; draft: number; other: number };
export type StaleLead = { id: string; name: string };

export type ActivityStats = {
  listings: ListingBuckets;
  newLeads: number;
  stages: Record<ActivityStage, number>;
  staleLeads: StaleLead[];
  followUpsSent: number;
  followUpsFailed: number;
  unsubscribes: number;
};

export type ActivityOverview = {
  bySpecialist: Record<string, ActivityStats>;
  /** Leads and listings with no specialist. */
  house: ActivityStats;
  /** Everything, house included. */
  company: ActivityStats;
};

const LIVE_STATUSES = ["Published", "Available"];

/** live = approved and Published/Available; awaiting = submitted for approval;
 *  draft = approval draft, or approved row still in Draft status; else other. */
export function listingBucket(l: { approval_status?: string | null; status?: string | null }): keyof ListingBuckets {
  const approval = l.approval_status ?? "approved";
  if (approval === "submitted") return "awaiting";
  if (approval === "draft") return "draft";
  if (approval === "approved") {
    if (l.status && LIVE_STATUSES.includes(l.status)) return "live";
    if (l.status === "Draft") return "draft";
  }
  return "other";
}

export function normalizeStage(v: string | null | undefined): ActivityStage {
  return (ACTIVITY_STAGES as readonly string[]).includes(v ?? "") ? (v as ActivityStage) : "New";
}

function emptyStats(): ActivityStats {
  return {
    listings: { live: 0, awaiting: 0, draft: 0, other: 0 },
    newLeads: 0,
    stages: { New: 0, Contacted: 0, Viewing: 0, Negotiating: 0, Closed: 0, Lost: 0 },
    staleLeads: [],
    followUpsSent: 0,
    followUpsFailed: 0,
    unsubscribes: 0,
  };
}

function ms(v: string | null | undefined): number {
  const t = v ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? NaN : t;
}

export function computeActivity(input: {
  specialists: ActivitySpecialist[];
  listings: ActivityListing[];
  inquiries: ActivityInquiry[];
  sends: ActivitySend[];
  rangeDays: number;
  now: Date | number;
}): ActivityOverview {
  const nowMs = typeof input.now === "number" ? input.now : input.now.getTime();
  const since = nowMs - input.rangeDays * 86_400_000;
  const staleBefore = nowMs - STALE_HOURS * 3_600_000;
  const known = new Set(input.specialists.map((s) => s.id));

  const bySpecialist: Record<string, ActivityStats> = {};
  for (const s of input.specialists) bySpecialist[s.id] = emptyStats();
  const house = emptyStats();
  const company = emptyStats();

  // Rows whose specialist is null or no longer listed count as house.
  const targets = (id: string | null): ActivityStats[] => [
    id && known.has(id) ? bySpecialist[id] : house,
    company,
  ];

  for (const l of input.listings) {
    const b = listingBucket(l);
    for (const t of targets(l.specialist_id)) t.listings[b] += 1;
  }

  for (const q of input.inquiries) {
    const created = ms(q.created_at);
    const stage = normalizeStage(q.lead_stage);
    const inRange = created >= since && created <= nowMs;
    for (const t of targets(q.specialist_id)) {
      // Stage mix and stale leads cover leads created in the range.
      if (inRange) {
        t.newLeads += 1;
        t.stages[stage] += 1;
      }
      if (stage === "New" && created < staleBefore) {
        t.staleLeads.push({ id: q.id, name: q.name?.trim() || "Unnamed lead" });
      }
      const unsub = ms(q.unsubscribed_at);
      if (unsub >= since && unsub <= nowMs) t.unsubscribes += 1;
    }
  }

  for (const s of input.sends) {
    // Sent counts by sent_at; failures have no sent_at, so use created_at.
    const when = ms(s.status === "sent" ? s.sent_at : (s.sent_at ?? s.created_at));
    if (!(when >= since && when <= nowMs)) continue;
    if (s.status !== "sent" && s.status !== "failed") continue;
    for (const t of targets(s.specialist_id)) {
      if (s.status === "sent") t.followUpsSent += 1;
      else t.followUpsFailed += 1;
    }
  }

  return { bySpecialist, house, company };
}

export { emptyStats };
