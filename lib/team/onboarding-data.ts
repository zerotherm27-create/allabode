import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildOnboarding, type OnboardingGuide } from "@/lib/team/onboarding";

type Core = {
  photo_path: string | null;
  tagline: string | null;
  bio: string | null;
  areas: string[] | null;
  specialties: string[] | null;
  languages: string[] | null;
  years_experience: number | null;
  subdomain: string | null;
  status: string | null;
};

/**
 * Loads the onboarding guide for one specialist with the signed-in session
 * client. Every read is tolerant: a missing table or column (migrations not
 * run yet) is treated as "unknown", which shows as to-do, and never throws.
 * Cached per request so the layout/page/overview share one set of reads.
 */
export const loadOnboarding = cache(async (specialistId: string): Promise<OnboardingGuide | null> => {
  try {
    const supabase = await createClient();
    const [coreRes, contactRes, settingsRes, listingsRes] = await Promise.all([
      supabase
        .from("specialists")
        .select("photo_path,tagline,bio,areas,specialties,languages,years_experience,subdomain,status")
        .eq("id", specialistId)
        .maybeSingle(),
      supabase
        .from("specialists")
        .select("public_phone,public_viber,public_facebook_url,public_linkedin_url,public_email")
        .eq("id", specialistId)
        .maybeSingle(),
      supabase.from("specialist_email_settings").select("specialist_id").eq("specialist_id", specialistId).maybeSingle(),
      supabase.from("listings").select("approval_status").eq("specialist_id", specialistId),
    ]);
    if (coreRes.error || !coreRes.data) return null;
    const core = coreRes.data as Core;

    const c = (contactRes.error ? null : contactRes.data) as Record<string, string | null> | null;
    const hasPublicContact = !!c && Object.values(c).some((v) => typeof v === "string" && v.trim().length > 0);
    const hasFollowUpSettings = !settingsRes.error && !!settingsRes.data;

    const rows = (listingsRes.error ? [] : (listingsRes.data ?? [])) as { approval_status: string | null }[];
    const sent = rows.filter((r) => r.approval_status === "submitted" || r.approval_status === "approved").length;

    return buildOnboarding({
      photoPath: core.photo_path,
      tagline: core.tagline,
      bio: core.bio,
      areas: core.areas,
      specialties: core.specialties,
      languages: core.languages,
      yearsExperience: core.years_experience,
      hasPublicContact,
      hasFollowUpSettings,
      listingCount: rows.length,
      submittedOrApprovedListingCount: sent,
      subdomain: core.subdomain,
      status: core.status,
    });
  } catch {
    return null;
  }
});
