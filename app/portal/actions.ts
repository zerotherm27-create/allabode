"use server";

import { createClient } from "@/lib/supabase/server";
import { homeForRole, type PortalRole } from "@/lib/auth/role";

/**
 * Claims the owner/tenant record matching the signed-in user's email (via the
 * `link_portal_account` security-definer RPC) and returns where to send them.
 * Idempotent — safe to call on every login.
 */
export async function linkPortalAccount(): Promise<{ role: PortalRole | null; redirect: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("link_portal_account");
  const role = (error ? null : (data as PortalRole | null)) ?? null;
  return { role, redirect: homeForRole(role) };
}
