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
        sizes="(min-width: 1024px) 45vw, 42vw"
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
        <span className="font-display text-5xl font-bold tracking-tight text-gold sm:text-8xl lg:text-9xl">
          {initialsOf(name)}
        </span>
      </div>
    </div>
  );
}

/**
 * Split hero: name, tagline, paragraph and the page's one brass button on the
 * left over the owner's interior photo (cream wall behind the text, the window
 * and skyline towards the portrait), washed with a cream gradient so the text
 * keeps its contrast; the portrait fills the right ~45% to the edge, its left
 * edge masked so it fades into the photo rather than into a cream seam. The split holds at every width (the
 * owner asked for the desktop composition scaled down on phones): the text
 * column narrows and the name, copy and button shrink instead of stacking.
 * Phones get "Inquire now" as the brass button; desktop keeps "View listings".
 */
export function MicrositeHero({ specialist }: { specialist: PublicSpecialist }) {
  return (
    <section aria-labelledby="hero-name" className="relative isolate overflow-hidden bg-cream">
      {/* Background photo (decorative). Positioned so the cream wall and
          curtain sit behind the text and the window/skyline opens up just
          before the portrait. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <Image
          src="/microsite/hero-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          preload
          className="object-cover object-[20%_center] lg:object-[80%_center]"
        />
        {/* Cream wash: solid behind the text column, clearing towards the window. */}
        <div className="absolute inset-0 bg-gradient-to-r from-cream from-55% via-cream/90 via-65% to-cream/0 to-90% sm:from-35% sm:via-58% sm:to-85% lg:from-15% lg:via-cream/85 lg:via-38% lg:to-62%" />
      </div>

      {/* Portrait: right-hand, full-height bleed at every width. A photo is
          masked on its left edge so it melts into the background photo; the
          initials plate keeps a crisp edge. */}
      <div
        className={`absolute inset-y-0 right-0 w-[42%] lg:w-[45%] ${
          specialist.photoUrl
            ? "[mask-image:linear-gradient(to_right,transparent,black_4rem)] sm:[mask-image:linear-gradient(to_right,transparent,black_6rem)] lg:[mask-image:linear-gradient(to_right,transparent,black_8rem)]"
            : ""
        }`}
      >
        <Portrait name={specialist.name} photoUrl={specialist.photoUrl} />
      </div>

      <div className="container-site">
        <StaggerGroup className="relative flex min-h-[18.75rem] w-[60%] min-w-0 flex-col justify-center py-6 pr-2 sm:min-h-[28rem] sm:py-14 lg:min-h-[min(40rem,85dvh)] lg:w-[52%] lg:py-24 lg:pr-0">
          <StaggerItem>
            <p className="label-caps text-gold-ink max-sm:text-[0.6875rem]! max-sm:tracking-[0.1em]!">{HERO_COPY.eyebrow}</p>
          </StaggerItem>
          <StaggerItem>
            <h1
              id="hero-name"
              className="mt-2 break-words font-display text-[clamp(1.375rem,7.5vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.02em] text-navy sm:mt-4 lg:text-display"
            >
              {specialist.name}
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-2 max-w-[30ch] font-display text-[0.9375rem] font-semibold leading-snug text-ink sm:mt-4 sm:text-xl lg:text-2xl">
              {specialist.tagline ?? HERO_COPY.defaultTagline}
            </p>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-2.5 max-w-[46ch] text-xs leading-normal text-slate sm:mt-5 sm:text-base sm:leading-relaxed">{HERO_COPY.paragraph}</p>
          </StaggerItem>
          <StaggerItem>
            <div className="mt-4 flex flex-col items-start gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-6 lg:gap-6">
              {/* Phones lead with the inquiry (as the mobile mockup); desktop with the listings. */}
              <Button href="#contact" variant="gold" size="lg" className="whitespace-nowrap max-sm:px-4 lg:hidden">
                Inquire now
                <Icon name="arrow_forward" size={16} />
              </Button>
              <Button href="#properties" variant="gold" size="lg" className="whitespace-nowrap max-lg:hidden">
                View listings
                <Icon name="arrow_forward" size={16} />
              </Button>
              <p className="inline-flex items-center gap-1.5 text-xs text-slate max-sm:leading-snug sm:gap-2 sm:text-sm">
                <Icon name="verified" size={18} className="size-4 shrink-0 text-gold-ink sm:size-[18px]" />
                {ACCREDITATION_LABEL}
              </p>
            </div>
          </StaggerItem>
        </StaggerGroup>
      </div>
    </section>
  );
}
