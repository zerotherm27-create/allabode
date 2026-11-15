import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { MicrositePortrait } from "@/components/team/microsite/portrait";
import { HERO_COPY } from "@/lib/team/profile-copy";
import type { PublicSpecialist } from "@/lib/team/public-queries";

/**
 * Editorial hero (the default layout): the name set large on cream beside a
 * 4:5 portrait in an offset brass frame. From md up the text sits left and the
 * portrait right, both resting on the same baseline; on phones the portrait
 * leads at full width (height capped so the name and the button stay in the
 * first screen) and the text stacks under it at full reading size.
 */
export function HeroEditorial({ specialist }: { specialist: PublicSpecialist }) {
  return (
    <section data-microsite-hero aria-labelledby="hero-name" className="bg-cream">
      <div className="container-site grid grid-cols-1 gap-8 pb-10 pt-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-end md:gap-12 md:pb-16 md:pt-14 lg:gap-20 lg:pb-20 lg:pt-20">
        <div className="relative mb-3 mr-3 md:order-2 md:mb-4 md:mr-4">
          <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 border border-gold md:translate-x-4 md:translate-y-4" />
          <div className="relative aspect-[4/5] max-h-[48dvh] w-full overflow-hidden bg-surface-gray md:max-h-none">
            <MicrositePortrait
              name={specialist.name}
              photoUrl={specialist.photoUrl}
              sizes="(min-width: 1280px) 500px, (min-width: 768px) 40vw, 100vw"
              priority
            />
          </div>
        </div>

        <StaggerGroup className="min-w-0 md:order-1 md:pb-4">
          <StaggerItem>
            <p className="label-caps text-gold-ink">{specialist.designation ?? HERO_COPY.eyebrow}</p>
          </StaggerItem>
          <StaggerItem>
            <h1
              id="hero-name"
              className="mt-3 break-words font-display text-[clamp(2.25rem,10vw,3rem)] font-bold leading-[1.02] tracking-[-0.025em] text-navy md:mt-4 md:text-[clamp(3rem,6vw,5rem)]"
            >
              {specialist.name}
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-4 max-w-[28ch] font-display text-xl font-semibold leading-snug text-ink md:mt-6 md:text-2xl">
              {specialist.tagline ?? HERO_COPY.defaultTagline}
            </p>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-slate max-md:hidden">{HERO_COPY.paragraph}</p>
          </StaggerItem>
          <StaggerItem>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-8">
              <Button href="#contact" variant="gold" size="lg" className="whitespace-nowrap max-sm:w-full">
                Inquire now
                <Icon name="arrow_forward" size={16} />
              </Button>
              <Button href="#properties" variant="ghost" size="lg" className="whitespace-nowrap max-sm:w-full">
                View listings
              </Button>
            </div>
          </StaggerItem>
        </StaggerGroup>
      </div>
    </section>
  );
}
