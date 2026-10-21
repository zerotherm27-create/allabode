import Image from "next/image";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { Skyline } from "@/components/team/microsite/skyline";
import { ACCREDITATION_LABEL } from "@/lib/team/license";
import { HERO_COPY } from "@/lib/team/profile-copy";
import { initialsOf } from "@/lib/team/queries";
import type { PublicSpecialist } from "@/lib/team/public-queries";

/**
 * Full-height portrait, or (without a photo) a composed navy initials plate
 * so a sparse profile still reads as deliberate.
 */
function Portrait({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      // Overwritten in place at a fixed storage path, so it bypasses the image
      // optimizer (same reasoning as SpecialistPortrait / ListedBy).
      <Image
        src={photoUrl}
        alt={`Portrait of ${name}`}
        fill
        sizes="(min-width: 1024px) 45vw, 100vw"
        unoptimized
        priority
        className="object-cover object-top"
      />
    );
  }
  return (
    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-navy via-navy-800 to-navy-700">
      <Skyline className="absolute inset-x-0 bottom-0 h-1/2 w-full text-white/10" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-8xl font-bold tracking-tight text-gold sm:text-9xl">
          {initialsOf(name)}
        </span>
      </div>
    </div>
  );
}

/**
 * Split hero: name, tagline, paragraph and the page's one brass button on the
 * left over a faint skyline; the portrait fills the right ~45% to the edge,
 * its left edge fading into the cream. Phones: portrait band above the text.
 */
export function MicrositeHero({ specialist }: { specialist: PublicSpecialist }) {
  return (
    <section aria-labelledby="hero-name" className="relative isolate overflow-hidden bg-cream">
      <Skyline className="absolute inset-x-0 bottom-0 -z-10 h-[70%] w-full text-navy/[0.06] [mask-image:linear-gradient(to_top,black_30%,transparent)] lg:w-[60%]" />

      {/* Portrait: top band on phones/tablets, right-hand bleed on desktop. */}
      <div className="relative h-[24rem] sm:h-[30rem] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[45%]">
        <Portrait name={specialist.name} photoUrl={specialist.photoUrl} />
        {/* A photo fades into the cream; the initials plate keeps a crisp edge. */}
        {specialist.photoUrl && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cream to-transparent lg:inset-y-0 lg:left-0 lg:right-auto lg:h-auto lg:w-32 lg:bg-gradient-to-r"
          />
        )}
      </div>

      <div className="container-site">
        <StaggerGroup className="relative min-w-0 pb-16 pt-4 sm:pb-20 lg:flex lg:min-h-[min(40rem,85dvh)] lg:w-[52%] lg:flex-col lg:justify-center lg:py-24">
          <StaggerItem>
            <p className="label-caps text-gold-ink">{HERO_COPY.eyebrow}</p>
          </StaggerItem>
          <StaggerItem>
            <h1
              id="hero-name"
              className="mt-4 break-words font-display text-display-sm font-bold text-navy sm:text-display"
            >
              {specialist.name}
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-4 max-w-[30ch] font-display text-xl font-semibold leading-snug text-ink sm:text-2xl">
              {specialist.tagline ?? HERO_COPY.defaultTagline}
            </p>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-5 max-w-[46ch] leading-relaxed text-slate">{HERO_COPY.paragraph}</p>
          </StaggerItem>
          <StaggerItem>
            <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
              <Button href="#properties" variant="gold" size="lg" className="whitespace-nowrap">
                View listings
                <Icon name="arrow_forward" size={16} />
              </Button>
              <p className="inline-flex items-center gap-2 text-sm text-slate">
                <Icon name="verified" size={18} className="shrink-0 text-gold-ink" />
                {ACCREDITATION_LABEL}
              </p>
            </div>
          </StaggerItem>
        </StaggerGroup>
      </div>
    </section>
  );
}
