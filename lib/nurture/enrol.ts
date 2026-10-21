// Server-only: enrols a just-stored lead into the follow-up sequence.
//
// Called ONLY from /api/leads, inside after(), once the lead has passed the
// route's origin / Turnstile / rate-limit / validation checks and was stored
// by a service-role intake function. Never call it from the cron or for a
// lead just because consent_followup is true: anyone can insert rows through
// PostgREST, so the app's checks are what make a lead real.
import { createServiceClient } from "@/lib/supabase/server";
import { canEnrol, planEnrolment, type EnrolTemplate, type LeadFacts } from "@/lib/nurture/schedule";
import { sendQueued } from "@/lib/nurture/send";

/** Queues one send per active template (idempotent) and sends the day-0 ones now. Never throws. */
export async function enrolLead(inquiryId: string): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  try {
    const service = createServiceClient();

    const { data: leadData, error: leadErr } = await service
      .from("inquiries")
      .select("id,specialist_id,lead_stage,consent_followup,unsubscribed_at,email,created_at")
      .eq("id", inquiryId)
      .maybeSingle();
    if (leadErr) {
      console.warn("[nurture:enrol] lead lookup failed:", leadErr.message);
      return;
    }
    const lead = leadData as (LeadFacts & { id: string; created_at: string | null }) | null;
    if (!canEnrol(lead).ok || !lead?.specialist_id) return;

    const { data: tpls, error: tErr } = await service
      .from("email_templates")
      .select("id,delay_days,is_active")
      .eq("is_active", true);
    if (tErr) {
      console.warn("[nurture:enrol] template lookup failed:", tErr.message);
      return;
    }
    const rows = planEnrolment(
      { id: lead.id, specialist_id: lead.specialist_id, created_at: lead.created_at },
      (tpls ?? []) as EnrolTemplate[],
    );
    if (rows.length === 0) return;

    // unique (inquiry_id, template_id): a repeat enrolment inserts nothing.
    const { data: inserted, error: insErr } = await service
      .from("lead_email_sends")
      .upsert(rows, { onConflict: "inquiry_id,template_id", ignoreDuplicates: true })
      .select("id,due_at");
    if (insErr) {
      console.warn("[nurture:enrol] queue insert failed:", insErr.message);
      return;
    }

    // Day-0 emails go out now through the same path (flags and stop rules apply).
    const now = Date.now();
    const dueNow = ((inserted ?? []) as { id: string; due_at: string }[])
      .filter((r) => new Date(r.due_at).getTime() <= now)
      .map((r) => r.id);
    if (dueNow.length) {
      const summary = await sendQueued(service, { ids: dueNow });
      if (summary.errors.length) console.warn("[nurture:enrol] day-0 send errors:", summary.errors.length);
    }
  } catch {
    console.warn("[nurture:enrol] unexpected failure");
  }
}
