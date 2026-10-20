import { redirect } from "next/navigation";
import { Panel } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";
import { getBroker } from "@/lib/team/broker";
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
  license_mode: "own" | "accredited";
  license_no: string | null;
  license_expiry: string | null;
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
      "display_name,tagline,bio,phone,years_experience,areas,specialties,languages,license_mode,license_no,license_expiry,photo_path,status,updated_at",
    )
    .eq("id", specialistId)
    .maybeSingle();
  const row = data as Row | null;
  if (!row) redirect(homeForRole(role));

  const broker = await getBroker();

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
    licenseMode: row.license_mode,
    licenseNo: row.license_no ?? "",
    licenseExpiry: row.license_expiry ?? "",
  };

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
          <SpecialistProfileForm
            values={values}
            licenseLocked={row.status === "approved"}
            broker={broker}
          />
        </Panel>
      </div>
    </div>
  );
}
