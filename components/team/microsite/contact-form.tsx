"use client";

import { SpecialistContactForm } from "@/components/forms/lead-forms";
import { apexUrl } from "@/components/team/microsite/links";

/**
 * The microsite "Contact me" form: a real inquiry to /api/leads (same-origin;
 * the proxy lets exactly that path through on specialist hosts), tagged with
 * the specialist once the server has verified the slug.
 */
export function MicrositeContactForm({
  specialistSlug,
  specialistName,
}: {
  specialistSlug: string;
  specialistName: string;
}) {
  return (
    <div aria-label={`Send ${specialistName} a message`} role="group" data-specialist={specialistSlug}>
      <SpecialistContactForm
        specialistSlug={specialistSlug}
        specialistName={specialistName}
        privacyHref={apexUrl("/privacy-policy")}
      />
    </div>
  );
}
