import { accreditationLabel } from "@/lib/team/license";
import { joinList, otherLanguages } from "@/lib/team/profile-copy";
import type { PublicSpecialist } from "@/lib/team/public-queries";

/**
 * A plain strip of the specialist's own facts (areas, focus, experience, other
 * languages, accreditation), built only from fields they filled in. With
 * nothing but the accreditation line it renders nothing: a one-cell strip
 * would only repeat the hero.
 */
export function MicrositeFacts({ specialist }: { specialist: PublicSpecialist }) {
  const years = specialist.yearsExperience != null && specialist.yearsExperience > 0 ? specialist.yearsExperience : null;
  const facts = [
    { label: "Areas", value: joinList(specialist.areas) },
    { label: "Focus", value: joinList(specialist.specialties) },
    { label: "Experience", value: years ? `${years} ${years === 1 ? "year" : "years"} in real estate` : "" },
    { label: "Also speaks", value: joinList(otherLanguages(specialist.languages)) },
  ].filter((f) => f.value);
  if (facts.length === 0) return null;
  facts.push({ label: "Accreditation", value: accreditationLabel(specialist.accreditation) });

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line py-6 sm:py-8 md:auto-cols-fr md:grid-flow-col md:grid-cols-none md:gap-x-10">
      {facts.map((f) => (
        <div key={f.label} className="min-w-0 max-md:last:odd:col-span-2">
          <dt className="text-sm text-slate">{f.label}</dt>
          <dd className="mt-1 break-words font-display text-base font-semibold leading-snug text-navy sm:text-lg">
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
