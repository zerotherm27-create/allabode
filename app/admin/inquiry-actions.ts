"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { assignmentProblem } from "@/lib/leads/intake";

export type AssignInquiryState = { ok: boolean; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Staff only: assign an inquiry to an approved specialist, or unassign it
 * (empty specialist). Uses the staff session client, so RLS and the update
 * guard still apply; the write is checked, never silent.
 */
export async function assignInquiry(
  inquiryId: string,
  _prev: AssignInquiryState,
  fd: FormData,
): Promise<AssignInquiryState> {
  if (!UUID.test(inquiryId)) return { ok: false, message: "Invalid inquiry." };
  const raw = fd.get("specialist_id");
  const specialistId = typeof raw === "string" ? raw.trim() : "";
  if (specialistId && !UUID.test(specialistId)) return { ok: false, message: "Invalid specialist." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated." };
  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) return { ok: false, message: "Staff access required." };

  let target: { id: string; status: string | null } | null = null;
  if (specialistId) {
    const { data } = await supabase.from("specialists").select("id,status").eq("id", specialistId).maybeSingle();
    target = (data as { id: string; status: string | null } | null) ?? null;
  }
  const problem = assignmentProblem(target, Boolean(specialistId));
  if (problem) return { ok: false, message: problem };

  const { data: before } = await supabase
    .from("inquiries")
    .select("specialist_id")
    .eq("id", inquiryId)
    .maybeSingle();
  if (!before) return { ok: false, message: "Inquiry not found." };

  const { data: updated, error } = await supabase
    .from("inquiries")
    .update({ specialist_id: specialistId || null })
    .eq("id", inquiryId)
    .select("id");
  if (error) {
    console.error("[inquiry:assign]", error.message);
    return { ok: false, message: "Could not save the assignment. Has the leads migration been run?" };
  }
  if (!updated || updated.length === 0) return { ok: false, message: "Could not save the assignment." };

  await logAudit(supabase, {
    action: specialistId ? "inquiry.assign" : "inquiry.unassign",
    entityType: "inquiry",
    entityId: inquiryId,
    actorId: user.id,
    metadata: {
      from: (before as { specialist_id: string | null }).specialist_id ?? null,
      to: specialistId || null,
    },
  });

  revalidatePath("/admin/inquiries");
  return { ok: true, message: specialistId ? "Assigned." : "Unassigned." };
}
