import { redirect } from "next/navigation";
import { Panel } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";
import { specialistTitleLine } from "@/lib/team/license";
import { SpecialistProfileForm, type ProfileValues } from "@/components/team/profile-form";
import { PhotoUploader } from "@/components/team/photo-uploader";

type Row = {
  display_name: string;
  tagline: string | null;
  bio: string | null;
  phone: string | null;
  years_experience: number | null;
  areas: string[] | null;
  specialties: string[] | null;
  languages: string[] | null;
  photo_path: string | null;
  status: string;
  updated_at: string;
};

export default async function SpecialistProfilePage() {
  const { role, specialistId } = await getCurrentRole();
  if (role !== "specialist" || !specialistId) redirect(homeForRole(role));

  const supabase = await createClient();
  const { data } = await supabase
    .from("specialists")
    .select(
      "display_name,tagline,bio,phone,years_experience,areas,specialties,languages,photo_path,status,updated_at",
    )
    .eq("id", specialistId)
    .maybeSingle();
  const row = data as Row | null;
  if (!row) redirect(homeForRole(role));

  // Separate, tolerant read: before 20261023100000_specialist_public_contact.sql
  // is run these columns don't exist, and the page must still load.
  const { data: pc } = await supabase
    .from("specialists")
    .select("public_phone,public_viber,public_facebook_url,public_linkedin_url,public_email")
    .eq("id", specialistId)
    .maybeSingle();
  const contact = (pc ?? {}) as Partial<Record<string, string | null>>;

  let photoUrl: string | null = null;
  if (row.photo_path) {
    const { data: pub } = supabase.storage.from("specialist-photos").getPublicUrl(row.photo_path);
    photoUrl = `${pub.publicUrl}?v=${Date.parse(row.updated_at) || 0}`;
  }

  const values: ProfileValues = {
    displayName: row.display_name,
    tagline: row.tagline ?? "",
    bio: row.bio ?? "",
    phone: row.phone ?? "",
    yearsExperience: row.years_experience == null ? "" : String(row.years_experience),
    areas: (row.areas ?? []).join(", "),
    specialties: (row.specialties ?? []).join(", "),
    languages: (row.languages ?? []).join(", "),
    publicPhone: contact.public_phone ?? "",
    publicViber: contact.public_viber ?? "",
    publicFacebook: contact.public_facebook_url ?? "",
    publicLinkedIn: contact.public_linkedin_url ?? "",
    publicEmail: contact.public_email ?? "",
  };
  // Read-only: the same fixed label every specialist shows publicly.
  const licence = specialistTitleLine();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy">Profile</h1>
      <p className="mt-1 text-sm text-slate">
        This is what buyers see on your public page. Changes go live as soon as you save.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <Panel title="Portrait photo">
          <PhotoUploader currentUrl={photoUrl} />
        </Panel>
        <Panel title="Your details">
          <SpecialistProfileForm values={values} licenceLine={licence} />
        </Panel>
      </div>
    </div>
  );
}
