import Image from "next/image";
import Link from "next/link";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { ACCREDITATION_LABEL } from "@/lib/team/license";
import { initialsOf } from "@/lib/team/queries";
import type { PublicSpecialist } from "@/lib/team/public-queries";
import { site } from "@/lib/site";

/** Shown under the name when the specialist has not written a tagline yet. */
const FALLBACK_LEAD = "Your property specialist at All Abode Property Solutions.";

/** Faint architectural grid in brass hairlines, laid over the navy panels. */
export const GRID_TEXTURE =
  "[background-image:linear-gradient(to_right,var(--color-gold)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-gold)_1px,transparent_1px)] [background-size:56px_56px]";

function firstFew(items: string[], n: number) {
  const shown = items.slice(0, n).join(", ");
  const rest = items.length - n;
  return rest > 0 ? `${shown} +${rest} more` : shown;
}

/**
 * Tall 4:5 portrait with the brass offset outline. Without a photo it renders
 * a composed initials plate (navy, hairline grid, brass monogram) so a sparse
 * profile still reads as deliberate rather than missing.
 */
function HeroPortrait({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  return (
    <div data-surface="dark" className="relative pb-3 pr-3 sm:pb-4 sm:pr-4">
      <div aria-hidden="true" className="absolute inset-0 left-3 top-3 border border-gold sm:left-4 sm:top-4" />
      <div className="relative aspect-[4/5] overflow-hidden bg-navy-800 ring-1 ring-white/10">
        {photoUrl ? (
          // Overwritten in place at a fixed storage path, so it bypasses the
          // image optimizer (same reasoning as SpecialistPortrait).
          <Image
            src={photoUrl}
            alt={`Portrait of ${name}`}
            fill
            sizes="(min-width: 1024px) 384px, 256px"
            unoptimized
            priority
            className="object-cover object-top"
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-navy-800 via-navy to-navy-800">
            <div className={`absolute inset-0 opacity-[0.08] ${GRID_TEXTURE}`} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-7xl font-bold tracking-tight text-gold sm:text-8xl">
                {initialsOf(name)}
              </span>
            </div>
            <div className="absolute inset-x-6 bottom-6 border-t border-white/15 pt-3">
              <span className="label-caps block text-white/60">{site.name}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Breadcrumb; the Home link is absolute because on <name>.allabodeph.com "/" is rewritten back to this profile. */
function Breadcrumb({ name, tone }: { name: string; tone: "dark" | "light" }) {
  const dark = tone === "dark";
  const link = `inline-flex min-h-[44px] items-center ${dark ? "hover:text-white" : "hover:text-navy-700"}`;
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center gap-x-2 text-sm ${dark ? "text-white/70" : "text-slate"}`}
    >
      <a href={`https://${site.domain}/`} className={link}>
        Home
      </a>
      <Icon name="chevron_right" size={16} />
      <Link href="/team" className={link}>
        Our team
      </Link>
      <Icon name="chevron_right" size={16} />
      <span aria-current="page" className={`min-w-0 break-words ${dark ? "text-white" : "text-navy"}`}>
        {name}
      </span>
    </nav>
  );
}

/** Small fact with an icon, used in the hero's "at a glance" row. */
function GlanceFact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Icon name={icon} size={20} className="mt-0.5 shrink-0 text-gold-ink" />
      <div className="min-w-0">
        <dt className="label-caps text-slate">{label}</dt>
        <dd className="mt-1.5 break-words text-sm font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}

/**
 * Asymmetric profile hero: text on cream at the left, the portrait on a deep
 * navy panel that bleeds off the right edge. On phones the panel becomes a
 * top band and the portrait sits above the text, overlapping the band's edge.
 */
export function ProfileHero({ specialist }: { specialist: PublicSpecialist }) {
  const years = specialist.yearsExperience;
  const facts = [
    years != null && years > 0
      ? { icon: "work", label: "Experience", value: `${years} ${years === 1 ? "year" : "years"}` }
      : null,
    specialist.areas.length > 0
      ? { icon: "location_on", label: "Areas served", value: firstFew(specialist.areas, 2) }
      : null,
    specialist.languages.length > 0
      ? { icon: "forum", label: "Languages", value: specialist.languages.join(", ") }
      : null,
  ].filter((f): f is { icon: string; label: string; value: string } => f !== null);

  return (
    // Top padding lives on the section (not the Container) so the strip under
    // the fixed header hits the navy band on phones and cream on desktop; the
    // header reads data-surface to pick its light or dark variant.
    <section data-surface="light" className="relative isolate overflow-hidden bg-cream pt-28 md:pt-32 lg:pt-36">
      {/* Navy panel: top band on phones/tablets, right-hand column on desktop. */}
      <div
        aria-hidden="true"
        data-surface="dark"
        className="absolute inset-x-0 top-0 -z-10 h-[20rem] bg-gradient-to-br from-navy via-navy-800 to-navy-700 sm:h-[22rem] md:h-[24rem] lg:inset-x-auto lg:right-0 lg:h-full lg:w-[40%]"
      >
        <div className={`absolute inset-0 opacity-[0.06] ${GRID_TEXTURE}`} />
        <div className="absolute inset-0 [background:radial-gradient(60%_45%_at_75%_15%,color-mix(in_oklab,var(--color-gold)_20%,transparent),transparent_70%)]" />
      </div>

      <Container className="pb-16 md:pb-20 lg:min-h-[min(37rem,82dvh)] lg:pb-24">
        {/* Rendered per breakpoint so each copy can declare the surface it sits
            on (navy band on phones/tablets, cream on desktop) for the header. */}
        <div data-surface="dark" className="pb-6 lg:hidden">
          <Breadcrumb name={specialist.name} tone="dark" />
        </div>
        <div data-surface="light" className="hidden pb-10 lg:block">
          <Breadcrumb name={specialist.name} tone="light" />
        </div>

        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <Reveal
            y={16}
            delay={0.1}
            className="order-1 mx-auto w-full max-w-[14rem] sm:max-w-[16rem] lg:order-2 lg:col-span-5 lg:col-start-8 lg:mr-0 lg:max-w-[24rem]"
          >
            <HeroPortrait name={specialist.name} photoUrl={specialist.photoUrl} />
          </Reveal>

          <StaggerGroup className="order-2 min-w-0 lg:order-1 lg:col-span-7 lg:row-start-1 lg:pr-6">
            <StaggerItem>
              <p className="label-caps text-gold-ink">Property specialist</p>
            </StaggerItem>
            <StaggerItem>
              <h1 className="mt-4 break-words font-display text-display-sm font-bold text-navy sm:text-h1">
                {specialist.name}
              </h1>
            </StaggerItem>
            <StaggerItem>
              <p className="mt-4 inline-flex items-center gap-2 border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink">
                <Icon name="verified" size={18} className="shrink-0 text-gold-ink" />
                {ACCREDITATION_LABEL}
              </p>
            </StaggerItem>
            <StaggerItem>
              <p className="mt-6 max-w-[42ch] text-lead text-slate">
                {specialist.tagline ?? FALLBACK_LEAD}
              </p>
            </StaggerItem>
            {facts.length > 0 && (
              <StaggerItem>
                <dl className="mt-8 grid max-w-2xl grid-cols-1 gap-5 border-t border-line pt-6 sm:grid-cols-3">
                  {facts.map((f) => (
                    <GlanceFact key={f.label} {...f} />
                  ))}
                </dl>
              </StaggerItem>
            )}
            <StaggerItem>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button href="/contact" size="lg" className="whitespace-nowrap">
                  Send an inquiry
                  <Icon name="arrow_forward" size={16} />
                </Button>
                <Button href="#listings" variant="ghost" size="lg" className="whitespace-nowrap">
                  View listings
                </Button>
              </div>
            </StaggerItem>
          </StaggerGroup>
        </div>
      </Container>
    </section>
  );
}
