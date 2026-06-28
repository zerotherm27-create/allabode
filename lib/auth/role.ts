import { createClient } from "@/lib/supabase/server";

export type PortalRole = "staff" | "owner" | "tenant";

export type RoleContext = {
  role: PortalRole | null;
  userId: string | null;
  email: string | null;
  ownerId: string | null;
  tenantId: string | null;
};

function sameEmail(a?: string | null, b?: string | null) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

/**
 * Resolves the signed-in user's role from the DB.
 * Owner/tenant is checked first, but only when the linked record email matches
 * the auth email. That avoids stale/wrong auth_user_id links stealing an admin
 * session while still allowing true owner/staff dual records into the portal.
 * Staff → `users` (via the is_staff() RPC, which is security-definer).
 * Returns role `null` when signed in but not yet linked ("pending").
 */
export async function getCurrentRole(): Promise<RoleContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { role: null, userId: null, email: null, ownerId: null, tenantId: null };
  }
  const base = { userId: user.id, email: user.email ?? null };

  const { data: owner } = await supabase
    .from("owners")
    .select("id,email")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (owner && sameEmail((owner as { email?: string | null }).email, user.email)) {
    return { role: "owner", ownerId: owner.id as string, tenantId: null, ...base };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id,email")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (tenant && sameEmail((tenant as { email?: string | null }).email, user.email)) {
    return { role: "tenant", ownerId: null, tenantId: tenant.id as string, ...base };
  }

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (isStaff) return { role: "staff", ownerId: null, tenantId: null, ...base };

  return { role: null, ownerId: null, tenantId: null, ...base };
}

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
    default:
      return "/portal";
  }
}
