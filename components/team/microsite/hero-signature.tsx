import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { MicrositePortrait } from "@/components/team/microsite/portrait";
import { QuickContactBar } from "@/components/team/microsite/quick-contact";
import type { ContactRow } from "@/lib/team/contact-rows";
import { accreditationLabel } from "@/lib/team/license";
import { HERO_COPY } from "@/lib/team/profile-copy";
import type { PublicSpecialist } from "@/lib/team/public-queries";

/**
 * Signature hero: a navy opening with the name in white and the portrait
 * bleeding to the right edge at full height. From md up a white quick-contact
 * bar straddles the hero's bottom edge; on phones the portrait leads, the text
 * stacks under it, and the fixed phone action bar does the bar's job.
 */
export function HeroSignature({ specialist, quick }: { specialist: PublicSpecialist; quick: ContactRow[] }) {
  return (
    <section data-microsite-hero aria-labelledby="hero-name" className="relative bg-cream">
      <div className="relative isolate overflow-hidden bg-navy">
        <div className="relative aspect-[4/5] max-h-[48dvh] w-full overflow-hidden md:absolute md:inset-y-0 md:right-0 md:aspect-auto md:max-h-none md:w-[44%]">
          <MicrositePortrait
            name={specialist.name}
            photoUrl={specialist.photoUrl}
            sizes="(min-width: 768px) 44vw, 100vw"
            priority
          />
        </div>

        <div className="container-site">
          <StaggerGroup className="flex min-w-0 flex-col justify-center pb-10 pt-8 md:min-h-[min(38rem,80dvh)] md:w-[52%] md:pb-28 md:pt-20">
            <StaggerItem>
              <p className="label-caps text-gold">{specialist.designation ?? HERO_COPY.eyebrow}</p>
            </StaggerItem>
            <StaggerItem>
              <h1
                id="hero-name"
                className="mt-3 break-words font-display text-[clamp(2.25rem,10vw,3rem)] font-bold leading-[1.02] tracking-[-0.025em] text-white md:mt-4 md:text-[clamp(2.75rem,5.5vw,4.5rem)]"
              >
                {specialist.name}
              </h1>
            </StaggerItem>
            <StaggerItem>
              <p className="mt-4 max-w-[28ch] font-display text-xl font-semibold leading-snug text-gold-soft md:mt-6 md:text-2xl">
                {specialist.tagline ?? HERO_COPY.defaultTagline}
              </p>
            </StaggerItem>
            <StaggerItem>
              <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-white/80 max-md:hidden">{HERO_COPY.paragraph}</p>
            </StaggerItem>
            <StaggerItem>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-8">
                <Button href="#contact" variant="gold" size="lg" className="whitespace-nowrap max-sm:w-full">
                  Inquire now
                  <Icon name="arrow_forward" size={16} />
                </Button>
                <Button href="#properties" variant="ghost-light" size="lg" className="whitespace-nowrap max-sm:w-full">
                  View listings
                </Button>
              </div>
            </StaggerItem>
            <StaggerItem>
              <p className="mt-6 inline-flex items-center gap-2 text-sm text-white/80">
                <Icon name="verified" size={18} className="shrink-0 text-gold" />
                {accreditationLabel(specialist.accreditation)}
              </p>
            </StaggerItem>
          </StaggerGroup>
        </div>
      </div>

      <div className="container-site relative z-10 -mt-10 max-md:hidden">
        <QuickContactBar rows={quick} />
      </div>
    </section>
  );
}
