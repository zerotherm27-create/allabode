"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateSubdomain } from "@/lib/team/subdomain";
import {
  provisionSpecialist,
  removeNeverSignedInSpecialist,
  resendSpecialistInvite,
} from "@/lib/team/provision";
import {
  availableActions,
  isMissingTable,
  specialistConflictMessage,
  validateNewSpecialist,
  APPROVABLE_FROM,
  REJECTABLE_FROM,
  canApproveListing,
  canRejectListing,
  isMissingColumn,
  normalizeRejectionNote,
  statusAfterApproval,
} from "@/lib/team/admin-status";
import { revalidatePublicListingPaths } from "@/lib/admin/revalidate";
import {
  attachSpecialistDomain,
  checkSpecialistDomain,
  detachSpecialistDomain,
} from "@/lib/team/vercel-domains";
import { subdomainState } from "@/lib/team/domain-status";

export type SpecialistActionState = { ok: boolean; message: string };

const fail = (message: string): SpecialistActionState => ({ ok: false, message });
const done = (message: string): SpecialistActionState => ({ ok: true, message });

function field(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function refresh(subdomain?: string) {
  revalidatePath("/admin/specialists");
  revalidatePath("/team");
  // Public profiles are ISR-cached (300s); invalidate every /team/<slug> page,
  // plus the concrete path when the subdomain is known.
  revalidatePath("/team/[slug]", "page");
  if (subdomain) revalidatePath(`/team/${subdomain}`);
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

export type AddSpecialistState = {
  ok: boolean;
  message: string;
  /** Per-field errors, keyed by form field name. */
  errors?: Partial<Record<"full_name" | "email" | "phone" | "subdomain" | "tagline", string>>;
  /** On failure: what was submitted, so the form can keep it (React resets the form after an action). */
  values?: Partial<Record<"full_name" | "email" | "phone" | "subdomain" | "tagline", string>>;
  /** On success: false when the account was created but the invitation email failed. */
  emailSent?: boolean;
  specialistId?: string;
};

/**
 * Staff-only: add a property specialist by email (invite-only accounts). After
 * the staff check and validation, lib/team/provision.ts creates (or safely
 * reuses) the confirmed auth user, inserts the row already linked to it
 * (approved, license_mode "accredited") through this staff session client,
 * and emails a set-password invitation.
 * Form fields: full_name, email, phone (optional), subdomain, tagline (optional).
 */
export async function addSpecialist(
  _prev: AddSpecialistState | null,
  fd: FormData,
): Promise<AddSpecialistState> {
  const guard = await staffClient();
  if (guard.error) return guard.error;
  const { supabase } = guard;

  const values = {
    full_name: field(fd, "full_name"),
    email: field(fd, "email"),
    phone: field(fd, "phone"),
    subdomain: field(fd, "subdomain"),
    tagline: field(fd, "tagline"),
  };
  const invalid = (
    errors: AddSpecialistState["errors"],
    message = "Check the highlighted fields.",
  ): AddSpecialistState => ({ ok: false, message, errors, values });

  const checked = validateNewSpecialist({
    full_name: fd.get("full_name"),
    email: fd.get("email"),
    phone: fd.get("phone"),
    tagline: fd.get("tagline"),
  });
  const sub = validateSubdomain(field(fd, "subdomain"));
  const errors = { ...(checked.ok ? {} : checked.errors), ...(sub.ok ? {} : { subdomain: sub.error }) };
  if (!checked.ok || !sub.ok) return invalid(errors);
  const v = checked.value;

  const [emailTaken, subTaken] = await Promise.all([
    // Emails are stored lower-cased; the lower(email) unique index catches any
    // other casing at insert time (mapped to the same message below).
    supabase.from("specialists").select("id").eq("email", v.email).limit(1),
    supabase.from("specialists").select("id").eq("subdomain", sub.value).limit(1),
  ]);
  const readErr = emailTaken.error ?? subTaken.error;
  if (readErr) return invalid({}, isMissingTable(readErr) ? MIGRATION_HINT : readErr.message);
  if (emailTaken.data && emailTaken.data.length > 0) {
    return invalid({ email: `${v.email} has already been added as a specialist.` });
  }
  if (subTaken.data && subTaken.data.length > 0) {
    return invalid({ subdomain: `The web address "${sub.value}" is already taken. Choose a different one.` });
  }

  const result = await provisionSpecialist(supabase, {
    email: v.email,
    displayName: v.displayName,
    phone: v.phone,
    tagline: v.tagline,
    subdomain: sub.value,
  });
  if (!result.ok) {
    const conflict = specialistConflictMessage(result.dbError, { email: v.email, subdomain: sub.value });
    if (conflict) return invalid({}, conflict);
    return invalid({}, isMissingTable(result.dbError) ? MIGRATION_HINT : result.message);
  }

  // Best effort: a Vercel failure never fails the add.
  const domain = await attachSpecialistDomain(sub.value);
  const domainWarning = domain.ok
    ? ""
    : ` Subdomain not attached automatically — ${domain.message} Open the specialist and press "Set up subdomain".`;

  refresh(sub.value);
  revalidatePath(`/admin/specialists/${result.specialistId}`);
  return {
    ok: true,
    message: (result.emailSent
      ? `Invitation sent to ${v.email}.`
      : `${v.displayName} was added, but the invitation email could not be sent (${result.emailError ?? "unknown error"}). Use "Resend sign-in link".`) + domainWarning,
    emailSent: result.emailSent,
    specialistId: result.specialistId,
  };
}

/** Staff-only: email a fresh sign-in (set/reset password) link to any approved, linked specialist. */
export async function resendSpecialistInviteAction(specialistId: string): Promise<SpecialistActionState> {
  const guard = await staffClient();
  if (guard.error) return guard.error;
  if (!specialistId) return fail("Missing specialist.");
  const r = await resendSpecialistInvite(guard.supabase, specialistId);
  revalidatePath("/admin/specialists");
  revalidatePath(`/admin/specialists/${specialistId}`);
  return r.ok ? done(r.message) : fail(r.message);
}

/** Staff-only: remove a specialist added by mistake — only while their account has never signed in. */
export async function removeSpecialistAction(specialistId: string): Promise<SpecialistActionState> {
  const guard = await staffClient();
  if (guard.error) return guard.error;
  if (!specialistId) return fail("Missing specialist.");
  const r = await removeNeverSignedInSpecialist(guard.supabase, specialistId);
  if (r.ok) {
    refresh(r.subdomain ?? undefined);
    if (r.subdomain) await detachSpecialistDomain(r.subdomain); // best effort
  }
  return r.ok ? done(r.message) : fail(r.message);
}

/** Staff-only: attach the specialist's <name>.allabodeph.com to the Vercel project, then re-check it. */
export async function attachSpecialistDomainAction(specialistId: string): Promise<SpecialistActionState> {
  const guard = await staffClient();
  if (guard.error) return guard.error;
  if (!specialistId) return fail("Missing specialist.");

  const { data, error } = await guard.supabase
    .from("specialists")
    .select("subdomain")
    .eq("id", specialistId)
    .maybeSingle();
  if (error) return fail(error.message);
  const sub = (data as { subdomain: string | null } | null)?.subdomain;
  if (!sub) return fail("This specialist has no web address.");

  const attached = await attachSpecialistDomain(sub);
  if (!attached.ok) return fail(attached.message);
  const check = await checkSpecialistDomain(sub);
  revalidatePath(`/admin/specialists/${specialistId}`);
  if (check.ok && !check.attached) {
    return fail("That address is already in use by another Vercel project.");
  }
  const state = subdomainState(check);
  return done(
    state === "live"
      ? `${sub}.allabodeph.com is live.`
      : "Subdomain attached. Waiting for DNS or the certificate; check again in a few minutes.",
  );
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

function refreshListing(id: string, slug?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${id}/edit`);
  revalidatePath("/dashboard/specialist/listings");
  revalidatePath(`/dashboard/specialist/listings/${id}/edit`);
  revalidatePublicListingPaths(slug);
}

const MIGRATION_HINT = "Run the specialists migration in the Supabase SQL editor first.";

/**
 * Staff-only: approve a submitted listing, or reinstate one that was sent back or
 * taken down (a house listing left in draft can be approved too). A Draft listing
 * goes live as Available; any other status is kept. One guarded UPDATE, so a
 * listing that changed between page load and click matches zero rows and errors.
 * Form fields: listing_id. (prevState, FormData) shape for useActionState.
 */
export async function approveListing(
  _prev: SpecialistActionState | null,
  fd: FormData,
): Promise<SpecialistActionState> {
  const guard = await staffClient();
  if (guard.error) return guard.error;
  const { supabase } = guard;

  const id = field(fd, "listing_id");
  if (!id) return fail("Missing listing.");

  const { data: current, error: readErr } = await supabase
    .from("listings")
    .select("status,approval_status,specialist_id")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return fail(isMissingColumn(readErr) ? MIGRATION_HINT : readErr.message);
  if (!current) return fail("Listing not found.");
  const house = !current.specialist_id;
  if (!canApproveListing(current.approval_status, { house })) {
    return fail("Only listings submitted for approval, sent back or taken down can be approved.");
  }
  const approvableFrom: string[] = house ? [...APPROVABLE_FROM, "draft"] : [...APPROVABLE_FROM];

  const update: { approval_status: string; rejection_note: null; status?: string } = {
    approval_status: "approved",
    rejection_note: null,
  };
  const nextStatus = statusAfterApproval(current.status);
  if (nextStatus) update.status = nextStatus;

  const { data: updated, error } = await supabase
    .from("listings")
    .update(update)
    .eq("id", id)
    .in("approval_status", approvableFrom)
    .eq("status", current.status)
    .select("id,slug");
  if (error) return fail(error.message);
  if (!updated || updated.length === 0) {
    return fail("This listing changed since you opened it. Reload the page and try again.");
  }

  refreshListing(id, (updated[0] as { slug?: string | null }).slug);
  return done(nextStatus
    ? "Approved. The listing is now live as Available."
    : "Approved. The listing keeps its current status.");
}

/**
 * Staff-only: send a submitted listing back, or take down an approved one, with a
 * required note. A takedown sticks: the specialist can only resubmit it
 * (rejected → submitted), and only staff can approve it again.
 * Form fields: listing_id, note.
 */
export async function rejectListing(
  _prev: SpecialistActionState | null,
  fd: FormData,
): Promise<SpecialistActionState> {
  const guard = await staffClient();
  if (guard.error) return guard.error;
  const { supabase } = guard;

  const id = field(fd, "listing_id");
  if (!id) return fail("Missing listing.");
  const note = normalizeRejectionNote(fd.get("note"));
  if (!note.ok) return fail(note.error);

  const { data: current, error: readErr } = await supabase
    .from("listings")
    .select("approval_status")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return fail(isMissingColumn(readErr) ? MIGRATION_HINT : readErr.message);
  if (!current) return fail("Listing not found.");
  if (!canRejectListing(current.approval_status)) {
    return fail("Only submitted or approved listings can be sent back or taken down.");
  }
  const takedown = current.approval_status === "approved";

  const { data: updated, error } = await supabase
    .from("listings")
    .update({ approval_status: "rejected", rejection_note: note.value })
    .eq("id", id)
    .in("approval_status", [...REJECTABLE_FROM])
    .select("id,slug");
  if (error) return fail(error.message);
  if (!updated || updated.length === 0) {
    return fail("This listing changed since you opened it. Reload the page and try again.");
  }

  refreshListing(id, (updated[0] as { slug?: string | null }).slug);
  return done(takedown
    ? "Taken down. The listing is hidden until you approve it again."
    : "Sent back to the specialist with your note.");
}
