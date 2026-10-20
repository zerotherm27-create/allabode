"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateSubdomain } from "@/lib/team/subdomain";
import { availableActions } from "@/lib/team/admin-status";

export type SpecialistActionState = { ok: boolean; message: string };

const fail = (message: string): SpecialistActionState => ({ ok: false, message });
const done = (message: string): SpecialistActionState => ({ ok: true, message });

function field(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function refresh() {
  revalidatePath("/admin/specialists");
  revalidatePath("/team");
  revalidatePath("/listings");
}

/** Staff check via the is_staff RPC; returns the session client or an error state. */
async function staffClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: fail("Not authenticated."), supabase: null } as const;
  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) return { error: fail("Staff access required."), supabase: null } as const;
  return { error: null, supabase } as const;
}

export async function approveSpecialist(
  _prev: SpecialistActionState | null,
  fd: FormData,
): Promise<SpecialistActionState> {
  const guard = await staffClient();
  if (guard.error) return guard.error;
  const { supabase } = guard;

  const id = field(fd, "specialist_id");
  if (!id) return fail("Missing specialist.");

  const parsed = validateSubdomain(field(fd, "subdomain"));
  if (!parsed.ok) return fail(parsed.error);

  const { data: taken, error: takenErr } = await supabase
    .from("specialists")
    .select("id")
    .eq("subdomain", parsed.value)
    .neq("id", id)
    .limit(1);
  if (takenErr) return fail(takenErr.message);
  if (taken && taken.length > 0) {
    return fail(`"${parsed.value}" is already taken by another specialist. Choose a different one.`);
  }

  const { data: updated, error } = await supabase
    .from("specialists")
    .update({ status: "approved", subdomain: parsed.value })
    .eq("id", id)
    .in("status", ["pending", "rejected"])
    .select("id");
  if (error) {
    return fail(error.code === "23505"
      ? `"${parsed.value}" is already taken by another specialist.`
      : error.message);
  }
  if (!updated || updated.length === 0) {
    return fail("Only pending or rejected applications can be approved.");
  }

  refresh();
  revalidatePath(`/admin/specialists/${id}`);
  return done(`Approved. Their address is ${parsed.value}.`);
}

export async function rejectSpecialist(
  _prev: SpecialistActionState | null,
  fd: FormData,
): Promise<SpecialistActionState> {
  const guard = await staffClient();
  if (guard.error) return guard.error;
  const id = field(fd, "specialist_id");
  if (!id) return fail("Missing specialist.");

  const { data, error } = await guard.supabase
    .from("specialists")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail("Only pending applications can be rejected.");

  refresh();
  revalidatePath(`/admin/specialists/${id}`);
  return done("Application rejected.");
}

export async function suspendSpecialistAction(specialistId: string): Promise<SpecialistActionState> {
  const guard = await staffClient();
  if (guard.error) return guard.error;
  if (!specialistId) return fail("Missing specialist.");

  const { data: current, error: readErr } = await guard.supabase
    .from("specialists")
    .select("status")
    .eq("id", specialistId)
    .maybeSingle();
  if (readErr) return fail(readErr.message);
  if (!current) return fail("Specialist not found.");
  if (!availableActions(current.status).suspend) {
    return fail("Only approved specialists can be suspended.");
  }

  const { error } = await guard.supabase.rpc("suspend_specialist", { p_specialist: specialistId });
  if (error) return fail(error.message);

  refresh();
  revalidatePath(`/admin/specialists/${specialistId}`);
  return done("Suspended. Their listings are now house listings.");
}

export async function reinstateSpecialist(specialistId: string): Promise<SpecialistActionState> {
  const guard = await staffClient();
  if (guard.error) return guard.error;
  if (!specialistId) return fail("Missing specialist.");

  const { data, error } = await guard.supabase
    .from("specialists")
    .update({ status: "approved" })
    .eq("id", specialistId)
    .eq("status", "suspended")
    .select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail("Only suspended specialists can be reinstated.");

  refresh();
  revalidatePath(`/admin/specialists/${specialistId}`);
  return done("Reinstated. Their earlier listings stay as house listings.");
}

/** Staff-only: specialists cannot edit licence details once past 'pending'. */
export async function updateSpecialistLicence(
  _prev: SpecialistActionState | null,
  fd: FormData,
): Promise<SpecialistActionState> {
  const guard = await staffClient();
  if (guard.error) return guard.error;
  const id = field(fd, "specialist_id");
  if (!id) return fail("Missing specialist.");

  const mode = field(fd, "license_mode");
  if (mode !== "own" && mode !== "accredited") return fail("Choose a licence type.");
  const no = field(fd, "license_no").slice(0, 40);
  const expiry = field(fd, "license_expiry");
  if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return fail("Enter the expiry as a valid date.");
  if (mode === "own" && !no) return fail("Enter the specialist's PRC licence number.");

  const { data, error } = await guard.supabase
    .from("specialists")
    .update({ license_mode: mode, license_no: no || null, license_expiry: expiry || null })
    .eq("id", id)
    .select("id");
  if (error) return fail(error.message);
  if (!data || data.length === 0) return fail("Specialist not found.");

  refresh();
  revalidatePath(`/admin/specialists/${id}`);
  return done("Licence details saved.");
}
