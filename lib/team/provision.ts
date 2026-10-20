// Server-only: property-specialist account provisioning through the Supabase
// Admin API. This is the ONE place the specialists feature uses the
// service-role client (a narrow exception, like owner provisioning in
// app/admin/agreement-actions.ts); every specialists-table write still goes
// through the caller's staff SESSION client so RLS and the DB guards apply.
// Only import this from "use server" actions or server components.
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { sendEmailResult } from "@/lib/email";
import { getPublicSiteUrl } from "@/lib/url";
import {
  decideExistingUser,
  hasNeverSignedIn,
  INVITE_SUBJECT,
  invitationEmailHtml,
  setPasswordLink,
} from "@/lib/team/invite";

type SessionClient = Awaited<ReturnType<typeof createClient>>;
type AdminClient = ReturnType<typeof createAdminClient>;
type DbError = { code?: string; message: string; details?: string };

const LIST_PAGE = 1000;
const LIST_MAX_PAGES = 50;

function adminOrError(): { admin: AdminClient; error: null } | { admin: null; error: string } {
  try {
    return { admin: createAdminClient(), error: null };
  } catch (err) {
    console.warn("[specialists] admin client unavailable:", err instanceof Error ? err.message : err);
    return {
      admin: null,
      error: "Account setup is not configured on the server (SUPABASE_SERVICE_ROLE_KEY). Nothing was changed.",
    };
  }
}

/** Escapes LIKE wildcards so an email with "_" or "%" only matches itself in .ilike(). */
function likeExact(v: string) {
  return v.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** The auth user with this email (case-insensitive), or null. Paginates the Admin API. */
async function findAuthUserByEmail(admin: AdminClient, email: string): Promise<{ user: User | null; error: string | null }> {
  const want = email.trim().toLowerCase();
  for (let page = 1; page <= LIST_MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: LIST_PAGE });
    if (error) return { user: null, error: error.message };
    const hit = data.users.find((u) => (u.email ?? "").trim().toLowerCase() === want);
    if (hit) return { user: hit, error: null };
    if (data.users.length < LIST_PAGE) break;
  }
  return { user: null, error: null };
}

/** True when the email (or auth user) already belongs to an owner, tenant or staff record. */
async function belongsToOtherRole(
  supabase: SessionClient,
  email: string,
  authUserId: string | null,
): Promise<{ conflict: string | null; error: string | null }> {
  const pattern = likeExact(email);
  const checks = await Promise.all([
    supabase.from("owners").select("id").ilike("email", pattern).limit(1),
    supabase.from("tenants").select("id").ilike("email", pattern).limit(1),
    supabase.from("users").select("id").ilike("email", pattern).limit(1),
    authUserId
      ? supabase.from("owners").select("id").eq("auth_user_id", authUserId).limit(1)
      : Promise.resolve({ data: [], error: null }),
    authUserId
      ? supabase.from("tenants").select("id").eq("auth_user_id", authUserId).limit(1)
      : Promise.resolve({ data: [], error: null }),
    authUserId
      ? supabase.from("users").select("id").eq("id", authUserId).limit(1)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const failed = checks.find((r) => r.error);
  if (failed?.error) return { conflict: null, error: failed.error.message };
  const [ownerE, tenantE, staffE, ownerU, tenantU, staffU] = checks.map((r) => (r.data ?? []).length > 0);
  if (staffE || staffU) return { conflict: `${email} belongs to a staff account and can't be added as a specialist.`, error: null };
  if (ownerE || ownerU) return { conflict: `${email} belongs to a property owner and can't be added as a specialist. Use a different email.`, error: null };
  if (tenantE || tenantU) return { conflict: `${email} belongs to a tenant and can't be added as a specialist. Use a different email.`, error: null };
  return { conflict: null, error: null };
}

/** Generates a fresh set-password (recovery) link and emails the invitation. Never throws. */
async function emailInvitation(
  admin: AdminClient,
  email: string,
  name: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
    const hashed = data?.properties?.hashed_token;
    if (error || !hashed) {
      console.warn("[specialists] generateLink failed:", error?.message ?? "no token returned");
      return { ok: false, reason: "The sign-in link could not be created." };
    }
    const site = getPublicSiteUrl();
    return await sendEmailResult({
      to: email,
      subject: INVITE_SUBJECT,
      html: invitationEmailHtml({ name, link: setPasswordLink(site, hashed), loginUrl: `${site}/portal/login` }),
    });
  } catch (err) {
    console.warn("[specialists] invitation email failed:", err instanceof Error ? err.message : err);
    return { ok: false, reason: "The invitation could not be sent." };
  }
}

export type ProvisionInput = {
  email: string;
  displayName: string;
  phone: string | null;
  tagline: string | null;
  subdomain: string;
};

export type ProvisionResult =
  | { ok: false; message: string; dbError?: DbError }
  | { ok: true; specialistId: string; emailSent: boolean; emailError?: string };

/**
 * Creates (or safely reuses) the specialist's auth account, inserts the
 * specialists row already linked to it, and emails a set-password invitation.
 *
 *  1. refuse if the email/account belongs to an owner, tenant or staff record;
 *  2. confirmed auth user with that email → link to it;
 *     UNCONFIRMED one → delete it and create a fresh one (defeats a squatter
 *     who pre-registered the invited email);
 *     none → create one (email_confirm, metadata {full_name, phone});
 *  3. insert the row through the staff SESSION client; if that fails, delete
 *     the auth user created in step 2 (compensating cleanup);
 *  4. email the invitation. A failed send keeps the account; the caller
 *     reports it and offers "Resend invite".
 * The caller has already checked staff access and validated the fields.
 */
export async function provisionSpecialist(supabase: SessionClient, input: ProvisionInput): Promise<ProvisionResult> {
  const got = adminOrError();
  if (!got.admin) return { ok: false, message: got.error };
  const admin = got.admin;

  const found = await findAuthUserByEmail(admin, input.email);
  if (found.error) return { ok: false, message: `Could not check existing accounts: ${found.error}` };
  const existing = found.user;

  const other = await belongsToOtherRole(supabase, input.email, existing?.id ?? null);
  if (other.error) return { ok: false, message: `Could not check existing records: ${other.error}` };

  const decision = decideExistingUser({
    exists: !!existing,
    confirmed: !!existing?.email_confirmed_at,
    belongsToOtherRole: !!other.conflict,
  });
  if (decision === "refuse") return { ok: false, message: other.conflict! };

  let userId: string;
  let createdUserId: string | null = null;

  if (decision === "link") {
    userId = existing!.id;
  } else {
    if (decision === "replace") {
      const { error: delErr } = await admin.auth.admin.deleteUser(existing!.id);
      if (delErr) {
        return { ok: false, message: `An unconfirmed sign-up for ${input.email} exists and could not be removed: ${delErr.message}` };
      }
    }
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      user_metadata: { full_name: input.displayName, phone: input.phone },
    });
    if (createErr || !created.user) {
      return { ok: false, message: `The account could not be created: ${createErr?.message ?? "unknown error"}` };
    }
    userId = created.user.id;
    createdUserId = created.user.id;
  }

  const { data: row, error: insertErr } = await supabase
    .from("specialists")
    .insert({
      email: input.email,
      display_name: input.displayName,
      phone: input.phone,
      tagline: input.tagline,
      subdomain: input.subdomain,
      status: "approved",
      license_mode: "accredited",
      auth_user_id: userId,
    })
    .select("id")
    .single();

  if (insertErr || !row) {
    if (createdUserId) {
      const { error: cleanupErr } = await admin.auth.admin.deleteUser(createdUserId);
      if (cleanupErr) {
        console.warn("[specialists] cleanup of the new auth user failed:", cleanupErr.message);
        return {
          ok: false,
          message: `The specialist could not be added, and the new login for ${input.email} could not be removed (${cleanupErr.message}). Remove it in Supabase → Authentication before trying again.`,
          dbError: insertErr ?? undefined,
        };
      }
    }
    return { ok: false, message: insertErr?.message ?? "The specialist could not be added.", dbError: insertErr ?? undefined };
  }

  const sent = await emailInvitation(admin, input.email, input.displayName);
  return sent.ok
    ? { ok: true, specialistId: (row as { id: string }).id, emailSent: true }
    : { ok: true, specialistId: (row as { id: string }).id, emailSent: false, emailError: sent.reason };
}

/** Last sign-in for one auth user. `missing` when the account no longer exists. */
async function signInState(admin: AdminClient, authUserId: string): Promise<
  { ok: true; lastSignInAt: string | null } | { ok: false; missing: boolean; message: string }
> {
  const { data, error } = await admin.auth.admin.getUserById(authUserId);
  if (error || !data.user) {
    const missing = !data?.user && (error?.status === 404 || /not.?found/i.test(error?.message ?? ""));
    return { ok: false, missing, message: error?.message ?? "Account not found." };
  }
  return { ok: true, lastSignInAt: data.user.last_sign_in_at ?? null };
}

/**
 * For the admin screens: which linked auth users have never signed in.
 * Returns null when the Admin API is unavailable (the page then shows status
 * without the sign-in distinction). Never throws.
 */
export async function getNeverSignedIn(authUserIds: string[]): Promise<Set<string> | null> {
  const ids = [...new Set(authUserIds.filter(Boolean))];
  if (ids.length === 0) return new Set();
  const got = adminOrError();
  if (!got.admin) return null;
  try {
    const results = await Promise.all(ids.map(async (id) => [id, await signInState(got.admin, id)] as const));
    const out = new Set<string>();
    for (const [id, r] of results) {
      if (!r.ok) {
        if (r.missing) continue;
        return null;
      }
      if (hasNeverSignedIn(r.lastSignInAt)) out.add(id);
    }
    return out;
  } catch (err) {
    console.warn("[specialists] sign-in status lookup failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

type SpecialistAccountRow = { id: string; email: string; display_name: string; auth_user_id: string | null; status: string };

async function readRow(supabase: SessionClient, specialistId: string): Promise<{ row: SpecialistAccountRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("specialists")
    .select("id,email,display_name,auth_user_id,status")
    .eq("id", specialistId)
    .maybeSingle();
  if (error) return { row: null, error: error.message };
  return { row: (data as SpecialistAccountRow | null) ?? null, error: null };
}

export type AccountActionResult = { ok: boolean; message: string };

/** Re-sends the set-password invitation, only while the account has never signed in. */
export async function resendSpecialistInvite(supabase: SessionClient, specialistId: string): Promise<AccountActionResult> {
  const { row, error } = await readRow(supabase, specialistId);
  if (error) return { ok: false, message: error };
  if (!row) return { ok: false, message: "Specialist not found." };
  if (row.status !== "approved") return { ok: false, message: "Only active specialists can be sent an invitation." };
  if (!row.auth_user_id) return { ok: false, message: "This specialist has no login account. Remove them and add them again." };

  const got = adminOrError();
  if (!got.admin) return { ok: false, message: got.error };
  const state = await signInState(got.admin, row.auth_user_id);
  if (!state.ok) return { ok: false, message: `Could not check the account: ${state.message}` };
  if (!hasNeverSignedIn(state.lastSignInAt)) {
    return { ok: false, message: `${row.display_name} has already signed in, so there is no invitation to resend.` };
  }

  const sent = await emailInvitation(got.admin, row.email, row.display_name);
  return sent.ok
    ? { ok: true, message: `Invitation sent to ${row.email}.` }
    : { ok: false, message: `The invitation could not be sent: ${sent.reason}` };
}

/**
 * Removes a specialist added by mistake (e.g. a typo in the email) — only
 * while their account has NEVER signed in. Deletes the specialists row
 * through the staff session client (the release_specialist_listings trigger
 * houses any listings), then the auth user through the Admin API.
 */
export async function removeNeverSignedInSpecialist(
  supabase: SessionClient,
  specialistId: string,
): Promise<AccountActionResult & { subdomain?: string | null }> {
  const { data, error } = await supabase
    .from("specialists")
    .select("id,email,display_name,auth_user_id,status,subdomain")
    .eq("id", specialistId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Specialist not found." };
  const row = data as SpecialistAccountRow & { subdomain: string | null };

  const got = adminOrError();
  if (!got.admin) return { ok: false, message: got.error };
  let accountGone = !row.auth_user_id;
  if (row.auth_user_id) {
    const state = await signInState(got.admin, row.auth_user_id);
    if (!state.ok && !state.missing) return { ok: false, message: `Could not check the account: ${state.message}` };
    if (state.ok && !hasNeverSignedIn(state.lastSignInAt)) {
      return {
        ok: false,
        message: `${row.display_name} has already signed in, so they can't be removed. Suspend them instead.`,
      };
    }
    if (!state.ok) accountGone = true;
  }

  // Guarded on the same auth link we just checked, so a row that changed in
  // between matches nothing.
  let del = supabase.from("specialists").delete().eq("id", row.id);
  del = row.auth_user_id ? del.eq("auth_user_id", row.auth_user_id) : del.is("auth_user_id", null);
  const { data: deleted, error: delErr } = await del.select("id");
  if (delErr) return { ok: false, message: delErr.message };
  if (!deleted || deleted.length === 0) {
    return { ok: false, message: "This specialist changed since you opened the page. Reload and try again." };
  }

  if (row.auth_user_id && !accountGone) {
    const { error: authErr } = await got.admin.auth.admin.deleteUser(row.auth_user_id);
    if (authErr) {
      console.warn("[specialists] auth user delete after row removal failed:", authErr.message);
      return {
        ok: true,
        subdomain: row.subdomain,
        message: `${row.display_name} was removed from the team, but their login could not be deleted (${authErr.message}). Delete ${row.email} in Supabase → Authentication.`,
      };
    }
  }
  return { ok: true, subdomain: row.subdomain, message: `${row.display_name} was removed.` };
}
