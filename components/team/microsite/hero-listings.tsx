import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MicrositePortrait } from "@/components/team/microsite/portrait";
import { accreditationLabel } from "@/lib/team/license";
import { HERO_COPY } from "@/lib/team/profile-copy";
import type { PublicSpecialist } from "@/lib/team/public-queries";

/**
 * Listings-first hero: a compact identity band (small portrait, name, tagline,
 * accreditation and the inquiry button) so the properties start in the first
 * screen. One row from md up; on phones the portrait and name share a row and
 * the button goes full width under them.
 */
export function HeroListings({ specialist }: { specialist: PublicSpecialist }) {
  return (
    <section data-microsite-hero aria-labelledby="hero-name" className="border-b border-line bg-surface">
      <div className="container-site flex flex-col gap-5 py-6 md:flex-row md:items-center md:gap-8 md:py-8">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
          <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden bg-surface-gray sm:w-24 md:w-28">
            <MicrositePortrait name={specialist.name} photoUrl={specialist.photoUrl} sizes="112px" priority compact />
          </div>
          <div className="min-w-0">
            <p className="label-caps text-gold-ink">{specialist.designation ?? HERO_COPY.eyebrow}</p>
            <h1
              id="hero-name"
              className="mt-2 break-words font-display text-[clamp(1.625rem,7vw,2.25rem)] font-bold leading-[1.05] tracking-[-0.02em] text-navy md:text-4xl"
            >
              {specialist.name}
            </h1>
            <p className="mt-2 max-w-[44ch] text-base leading-snug text-slate">
              {specialist.tagline ?? HERO_COPY.defaultTagline}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <Button href="#contact" variant="gold" size="lg" className="whitespace-nowrap max-md:w-full">
            Inquire now
            <Icon name="arrow_forward" size={16} />
          </Button>
          <p className="inline-flex items-center gap-2 text-sm text-slate">
            <Icon name="verified" size={18} className="shrink-0 text-gold-ink" />
            {accreditationLabel(specialist.accreditation)}
          </p>
        </div>
      </div>
    </section>
  );
}
