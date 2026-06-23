import { createClient } from "@/lib/supabase/server";

export type PortalRole = "staff" | "owner" | "tenant";

export type RoleContext = {
  role: PortalRole | null;
  userId: string | null;
  email: string | null;
  ownerId: string | null;
  tenantId: string | null;
};

/**
 * Resolves the signed-in user's role from the DB.
 * Staff → `users` (via the is_staff() RPC, which is security-definer).
 * Owner/tenant → their record's `auth_user_id` (linked at signup).
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

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (isStaff) return { role: "staff", ownerId: null, tenantId: null, ...base };

  const { data: owner } = await supabase
    .from("owners")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (owner) return { role: "owner", ownerId: owner.id as string, tenantId: null, ...base };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (tenant) return { role: "tenant", ownerId: null, tenantId: tenant.id as string, ...base };

  return { role: null, ownerId: null, tenantId: null, ...base };
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
