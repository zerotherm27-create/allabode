import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { MicrositePortrait } from "@/components/team/microsite/portrait";
import { QuickContactBar } from "@/components/team/microsite/quick-contact";
import type { ContactRow } from "@/lib/team/contact-rows";
import { accreditationLabel } from "@/lib/team/license";
import { HERO_COPY } from "@/lib/team/profile-copy";
import type { PublicSpecialist } from "@/lib/team/public-queries";

type Tone = "dark" | "light";

// Full class strings (not built from fragments) so Tailwind sees every one.
const TONES: Record<
  Tone,
  {
    base: string;
    fadeUp: string;
    fadeSide: string;
    eyebrow: string;
    name: string;
    tagline: string;
    badge: string;
    badgeIcon: string;
    secondary: "navy-glass" | "ghost";
  }
> = {
  // Navy hero, white type: the Signature layout.
  dark: {
    base: "bg-navy",
    fadeUp: "from-navy via-navy/70 to-navy/0",
    fadeSide: "from-navy via-navy/85 to-navy/0",
    eyebrow: "text-gold",
    name: "text-white",
    tagline: "text-gold-soft",
    badge: "text-white/85",
    badgeIcon: "text-gold",
    secondary: "navy-glass",
  },
  // Cream hero, navy type: the Editorial layout.
  light: {
    base: "bg-cream",
    fadeUp: "from-cream via-cream/75 to-cream/0",
    fadeSide: "from-cream via-cream/85 to-cream/0",
    eyebrow: "text-gold-ink",
    name: "text-navy",
    tagline: "text-ink",
    badge: "text-slate",
    badgeIcon: "text-gold-ink",
    secondary: "ghost",
  },
};

/**
 * The microsite's full-bleed hero, shared by the Signature (dark) and
 * Editorial (light) layouts.
 *
 * Phones: the portrait fills the whole hero edge to edge (top, sides and
 * bottom), anchored to the top so the face stays in frame, with a fade rising
 * from the bottom edge. The name, tagline and buttons sit on that fade at full
 * reading size, so the first screen is the photo with the call to action under
 * the thumb.
 *
 * md and up: the portrait bleeds off the top, right and bottom edges across the
 * right ~62% of the hero and dissolves into the hero colour on its left edge,
 * so there is no visible frame. With `quick` rows a white quick-contact bar
 * straddles the hero's bottom edge (phones get the fixed action bar instead).
 */
export function HeroFullBleed({
  specialist,
  tone,
  quick,
}: {
  specialist: PublicSpecialist;
  tone: Tone;
  quick?: ContactRow[];
}) {
  const t = TONES[tone];
  return (
    <section data-microsite-hero aria-labelledby="hero-name" className="relative bg-cream">
      <div
        className={`relative isolate flex min-h-[calc(100dvh-4.5rem)] flex-col justify-end overflow-hidden md:min-h-[min(44rem,calc(100dvh-4.5rem))] md:justify-center ${t.base}`}
      >
        {/* Portrait: whole hero on phones, right-hand bleed from md. */}
        <div className="absolute inset-0 -z-20 md:left-auto md:w-[62%]">
          <MicrositePortrait
            name={specialist.name}
            photoUrl={specialist.photoUrl}
            sizes="(min-width: 768px) 62vw, 100vw"
            priority
          />
        </div>

        {/* Fades that keep the text readable: rising from the bottom on phones,
            from the left edge of the portrait from md. The side fade reaches 2px
            past the photo so no seam shows where the two meet. */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 -z-10 bg-gradient-to-t from-[34%] via-[58%] to-[82%] md:hidden ${t.fadeUp}`}
        />
        <div
          aria-hidden="true"
          className={`absolute inset-y-0 right-0 -z-10 hidden w-[calc(62%+2px)] bg-gradient-to-r from-0% via-[12%] to-[36%] md:block ${t.fadeSide}`}
        />

        <div className="container-site relative">
          <StaggerGroup className="flex min-w-0 flex-col pb-10 pt-24 md:max-w-[34rem] md:pb-28 md:pt-16 lg:max-w-[38rem]">
            <StaggerItem>
              <p className={`label-caps ${t.eyebrow}`}>{specialist.designation ?? HERO_COPY.eyebrow}</p>
            </StaggerItem>
            <StaggerItem>
              <h1
                id="hero-name"
                className={`mt-3 break-words font-display text-[clamp(2.5rem,12vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.025em] md:mt-4 md:text-[clamp(3rem,5.2vw,4.75rem)] ${t.name}`}
              >
                {specialist.name}
              </h1>
            </StaggerItem>
            <StaggerItem>
              <p className={`mt-4 max-w-[26ch] font-display text-xl font-semibold leading-snug md:mt-5 md:text-2xl ${t.tagline}`}>
                {specialist.tagline ?? HERO_COPY.defaultTagline}
              </p>
            </StaggerItem>
            <StaggerItem>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-8">
                <Button href="#contact" variant="gold" size="lg" className="whitespace-nowrap max-sm:w-full">
                  Inquire now
                  <Icon name="arrow_forward" size={16} />
                </Button>
                <Button href="#properties" variant={t.secondary} size="lg" className="whitespace-nowrap max-sm:w-full">
                  View listings
                </Button>
              </div>
            </StaggerItem>
            <StaggerItem>
              <p className={`mt-5 inline-flex items-center gap-2 text-sm ${t.badge}`}>
                <Icon name="verified" size={18} className={`shrink-0 ${t.badgeIcon}`} />
                {accreditationLabel(specialist.accreditation)}
              </p>
            </StaggerItem>
          </StaggerGroup>
        </div>
      </div>

      {quick && (
        <div className="container-site relative z-10 -mt-10 max-md:hidden">
          <QuickContactBar rows={quick} />
        </div>
      )}
    </section>
  );
}
