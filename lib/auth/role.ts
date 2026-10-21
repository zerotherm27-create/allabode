import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type PortalRole = "staff" | "owner" | "tenant" | "specialist";

export type RoleContext = {
  role: PortalRole | null;
  userId: string | null;
  email: string | null;
  ownerId: string | null;
  tenantId: string | null;
  specialistId: string | null;
};

function sameEmail(a?: string | null, b?: string | null) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

/**
 * Resolves the signed-in user's role from the DB.
 * Owner/tenant is checked first, but only when the linked record email matches
 * the auth email. That avoids stale/wrong auth_user_id links stealing an admin
 * session while still allowing true owner/staff dual records into the portal.
 * Specialist → `specialists` (by auth_user_id), checked after owner/tenant and
 * before the staff fallback; any specialist status still yields this role.
 * Staff → `users` (via the is_staff() RPC, which is security-definer).
 * Returns role `null` when signed in but not yet linked ("pending").
 */
async function resolveCurrentRole(): Promise<RoleContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { role: null, userId: null, email: null, ownerId: null, tenantId: null, specialistId: null };
  }
  const base = { userId: user.id, email: user.email ?? null };

  // Every lookup is independent, so run them together (one round trip to the
  // database instead of up to six in a row) and apply the priority order below.
  const [ownerRes, tenantRes, ownerByEmailRes, tenantByEmailRes, specialistRes, staffRes] = await Promise.all([
    supabase.from("owners").select("id,email").eq("auth_user_id", user.id).maybeSingle(),
    supabase.from("tenants").select("id,email").eq("auth_user_id", user.id).maybeSingle(),
    user.email
      ? supabase.from("owners").select("id").ilike("email", user.email).maybeSingle()
      : Promise.resolve({ data: null }),
    user.email
      ? supabase.from("tenants").select("id").ilike("email", user.email).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("specialists").select("id").eq("auth_user_id", user.id).maybeSingle(),
    supabase.rpc("is_staff"),
  ]);

  const owner = ownerRes.data as { id: string; email?: string | null } | null;
  if (owner && sameEmail(owner.email, user.email)) {
    return { role: "owner", ownerId: owner.id, tenantId: null, specialistId: null, ...base };
  }

  const tenant = tenantRes.data as { id: string; email?: string | null } | null;
  if (tenant && sameEmail(tenant.email, user.email)) {
    return { role: "tenant", ownerId: null, tenantId: tenant.id, specialistId: null, ...base };
  }

  // Dual-role/staff fallback: if the auth UUID is in public.users, the
  // link_portal_account RPC may intentionally leave auth_user_id unset. Staff
  // RLS can still read these rows, so preserve owner/tenant portal access by
  // matching the verified auth email before falling back to staff.
  const ownerByEmail = ownerByEmailRes.data as { id: string } | null;
  if (ownerByEmail) {
    return { role: "owner", ownerId: ownerByEmail.id, tenantId: null, specialistId: null, ...base };
  }
  const tenantByEmail = tenantByEmailRes.data as { id: string } | null;
  if (tenantByEmail) {
    return { role: "tenant", ownerId: null, tenantId: tenantByEmail.id, specialistId: null, ...base };
  }

  const specialist = specialistRes.data as { id: string } | null;
  if (specialist) {
    return { role: "specialist", ownerId: null, tenantId: null, specialistId: specialist.id, ...base };
  }

  if (staffRes.data) return { role: "staff", ownerId: null, tenantId: null, specialistId: null, ...base };

  return { role: null, ownerId: null, tenantId: null, specialistId: null, ...base };
}

/** Memoised per request, so a layout and its page share one lookup. */
export const getCurrentRole = cache(resolveCurrentRole);

/**
 * Portal-specific: links the auth account by email (via RPC side-effect), then
 * resolves the role with owner/tenant checked BEFORE staff. This prevents an
 * admin whose UUID is in `public.users` from being routed to /admin when they
 * also have an owner or tenant record, and ensures pure tenant/owner accounts
 * that were accidentally inserted into `public.users` still reach the portal.
 */
export async function linkAndGetPortalRole(): Promise<{ role: PortalRole | null; redirect: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { role: null, redirect: "/portal/login" };

  // Call the RPC for its side-effect: sets auth_user_id via email match.
  // If the user's UUID is in public.users the RPC returns 'staff' early and
  // skips the UPDATE, so auth_user_id may still be null after this call.
  await supabase.rpc("link_portal_account");

  // --- Pass 1: look up by auth_user_id (works after a successful RPC link) ---
  const { data: owner } = await supabase
    .from("owners")
    .select("id,email")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (owner && sameEmail((owner as { email?: string | null }).email, user.email)) {
    return { role: "owner", redirect: "/dashboard/owner" };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id,email")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (tenant && sameEmail((tenant as { email?: string | null }).email, user.email)) {
    return { role: "tenant", redirect: "/dashboard/tenant" };
  }

  // --- Pass 2: email fallback for the "dual-role" edge case ---
  // If the auth UUID is also in public.users, the RPC bails before setting
  // auth_user_id. Staff-level RLS allows reading all rows, so we can still
  // match by email. This covers owners/tenants whose UUID accidentally ended
  // up in public.users.
  if (user.email) {
    const { data: ownerByEmail } = await supabase
      .from("owners")
      .select("id")
      .ilike("email", user.email)
      .maybeSingle();
    if (ownerByEmail) return { role: "owner", redirect: "/dashboard/owner" };

    const { data: tenantByEmail } = await supabase
      .from("tenants")
      .select("id")
      .ilike("email", user.email)
      .maybeSingle();
    if (tenantByEmail) return { role: "tenant", redirect: "/dashboard/tenant" };
  }

  // Specialists (invite-only): staff create the row already linked to the
  // auth user (lib/team/provision.ts), so this is a plain lookup.
  const { data: specialist } = await supabase
    .from("specialists")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (specialist) return { role: "specialist", redirect: "/dashboard/specialist" };

  // Fall back to staff — they should use /admin directly, not the portal.
  const { data: isStaff } = await supabase.rpc("is_staff");
  if (isStaff) return { role: "staff", redirect: "/admin" };

  return { role: null, redirect: "/portal" };
}

/** Landing route for a role (used by post-login redirects + guards). */
export function homeForRole(role: PortalRole | null): string {
  switch (role) {
    case "staff":
      return "/admin";
    case "owner":
      return "/dashboard/owner";
    case "tenant":
      return "/dashboard/tenant";
    case "specialist":
      return "/dashboard/specialist";
    default:
      return "/portal";
  }
}
