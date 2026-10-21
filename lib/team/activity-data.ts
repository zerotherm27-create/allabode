import { createClient } from "@/lib/supabase/server";
import { isMissingColumn, isMissingTable } from "@/lib/team/admin-status";
import {
  computeActivity,
  type ActivityInquiry,
  type ActivityListing,
  type ActivityOverview,
  type ActivitySend,
  type ActivitySpecialist,
} from "@/lib/team/activity";

export type ActivityLoad =
  | { ok: true; overview: ActivityOverview; specialists: ActivitySpecialist[] }
  | { ok: false; message: string };

const MISSING =
  "Run the specialists and leads migrations (20261020100000_specialists.sql and 20261022100000_leads_and_nurture.sql) in the Supabase SQL editor to enable this overview.";

/** Loads activity for all specialists (or one, via onlyId) with four
 *  bounded queries and no per-specialist round trips. Staff session client. */
export async function loadActivity(rangeDays: number, onlyId?: string): Promise<ActivityLoad> {
  const supabase = await createClient();
  const now = new Date();
  const since = new Date(now.getTime() - rangeDays * 86_400_000).toISOString();

  let spQ = supabase.from("specialists").select("id,display_name").eq("status", "approved").order("display_name");
  let lsQ = supabase.from("listings").select("specialist_id,approval_status,status");
  // New leads are needed regardless of age (stale check); others only in range.
  let inQ = supabase
    .from("inquiries")
    .select("id,name,specialist_id,lead_stage,created_at,unsubscribed_at")
    .or(`created_at.gte.${since},lead_stage.eq.New,unsubscribed_at.gte.${since}`);
  let seQ = supabase
    .from("lead_email_sends")
    .select("specialist_id,status,sent_at,created_at")
    .in("status", ["sent", "failed"])
    .or(`created_at.gte.${since},sent_at.gte.${since}`);
  if (onlyId) {
    spQ = spQ.eq("id", onlyId);
    lsQ = lsQ.eq("specialist_id", onlyId);
    inQ = inQ.eq("specialist_id", onlyId);
    seQ = seQ.eq("specialist_id", onlyId);
  } else {
    lsQ = lsQ.not("specialist_id", "is", null);
  }
  const [sp, ls, inq, se] = await Promise.all([spQ, lsQ, inQ, seQ]);

  for (const r of [sp, ls, inq, se]) {
    if (r.error) {
      return {
        ok: false,
        message: isMissingTable(r.error) || isMissingColumn(r.error) ? MISSING : `Could not load activity: ${r.error.message}`,
      };
    }
  }
  const specialists = (sp.data ?? []) as ActivitySpecialist[];
  const overview = computeActivity({
    specialists,
    listings: (ls.data ?? []) as ActivityListing[],
    inquiries: (inq.data ?? []) as ActivityInquiry[],
    sends: (se.data ?? []) as ActivitySend[],
    rangeDays,
    now,
  });
  return { ok: true, overview, specialists };
}
