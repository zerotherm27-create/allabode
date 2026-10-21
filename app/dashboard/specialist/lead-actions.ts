"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/role";
import { isLeadStage, isMigrationMissing, parseNotes } from "@/lib/leads/inbox";

export type LeadActionState = { ok: boolean; message: string };

const fail = (message: string): LeadActionState => ({ ok: false, message });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Writes ONLY the given column(s) of one of the caller's own leads through the
 * session client. RLS (and the DB guard trigger) also enforce ownership; the
 * explicit specialist_id filter and the affected-row check make a blocked write
 * visible instead of silently succeeding.
 */
async function updateOwnLead(
  leadId: string,
  patch: { lead_stage: string } | { internal_notes: string | null },
): Promise<LeadActionState | null> {
  if (!UUID.test(leadId)) return fail("That lead could not be found.");
  const { role, specialistId } = await getCurrentRole();
  if (role !== "specialist" || !specialistId) return fail("You need to be signed in as a property specialist.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .update(patch)
    .eq("id", leadId)
    .eq("specialist_id", specialistId)
    .select("id");
  if (error) {
    console.error("[specialist/leads] update failed:", error);
    return fail(
      isMigrationMissing(error)
        ? "Lead tracking isn't switched on yet. Please try again later."
        : "Couldn't save that. Please try again.",
    );
  }
  if (!data || data.length === 0) return fail("That lead could not be found, or it is no longer assigned to you.");

  revalidatePath("/dashboard/specialist/leads");
  revalidatePath(`/dashboard/specialist/leads/${leadId}`);
  revalidatePath("/dashboard/specialist");
  return null;
}

export async function updateLeadStage(
  leadId: string,
  _prev: LeadActionState | null,
  formData: FormData,
): Promise<LeadActionState> {
  const stage = formData.get("stage");
  if (!isLeadStage(stage)) return fail("Choose a valid stage.");
  const err = await updateOwnLead(leadId, { lead_stage: stage });
  return err ?? { ok: true, message: `Stage set to ${stage}.` };
}

export async function saveLeadNotes(
  leadId: string,
  _prev: LeadActionState | null,
  formData: FormData,
): Promise<LeadActionState> {
  const parsed = parseNotes(formData.get("notes"));
  if (!parsed.ok) return fail(parsed.error);
  const err = await updateOwnLead(leadId, { internal_notes: parsed.value === "" ? null : parsed.value });
  return err ?? { ok: true, message: "Notes saved." };
}
