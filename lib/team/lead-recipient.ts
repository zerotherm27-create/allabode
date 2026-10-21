// Server-only: the email address a specialist-page inquiry is forwarded to.
// The public_specialists view deliberately has no email, so this reads ONE
// column through the service-role client — the same narrow exception as
// lib/team/provision.ts. Keep createAdminClient confined to this helper;
// never import it from client code.
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidSpecialistSlug } from "@/lib/team/queries";

/** The approved specialist's email for `slug`, or null (unknown, unconfigured, or any failure). Never throws. */
export async function getSpecialistLeadEmail(slug: string): Promise<string | null> {
  if (!isValidSpecialistSlug(slug)) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("specialists")
      .select("email")
      .eq("subdomain", slug)
      .eq("status", "approved")
      .maybeSingle();
    if (error || !data) return null;
    const email = (data as { email: string | null }).email?.trim();
    return email || null;
  } catch {
    console.warn("[lead:notify] specialist email lookup unavailable");
    return null;
  }
}
