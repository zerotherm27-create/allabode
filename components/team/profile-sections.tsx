import Link from "next/link";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PropertyCard } from "@/components/property-card";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { GRID_TEXTURE } from "@/components/team/profile-hero";
import type { PublicSpecialist } from "@/lib/team/public-queries";
import type { Listing } from "@/lib/data";
import { composeIntro, firstNameOf } from "@/lib/team/profile-copy";

/* ---- Stat strip ---------------------------------------------------------- */

// Literal class names so Tailwind can see them.
const STAT_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

/**
 * Trust strip under the hero: hairline-divided figures, no boxed cards. Only
 * real values are shown — a missing or zero figure drops out, and the whole
 * strip is omitted when fewer than two are left.
 */
export function ProfileStats({
  specialist,
  listingCount,
}: {
  specialist: PublicSpecialist;
  listingCount: number;
}) {
  const years = specialist.yearsExperience;
  const stats = [
    years != null && years > 0
      ? { value: String(years), label: years === 1 ? "Year of experience" : "Years of experience" }
      : null,
    // A count of one reads as filler next to the other figures; the hero's
    // "at a glance" row already names a single area/language.
    specialist.areas.length > 1
      ? { value: String(specialist.areas.length), label: "Areas served" }
      : null,
    specialist.languages.length > 1
      ? { value: String(specialist.languages.length), label: "Languages" }
      : null,
    listingCount > 0
      ? { value: String(listingCount), label: listingCount === 1 ? "Active listing" : "Active listings" }
      : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  // A lone figure is better left to the hero's fact row than a near-empty strip.
  if (stats.length < 2) return null;

  return (
    <section data-surface="light" aria-label="At a glance" className="border-y border-line bg-surface">
      <Container>
        <StaggerGroup
          as="ul"
          className={`grid grid-cols-2 ${STAT_COLS[stats.length]}`}
        >
          {stats.map((s, i) => (
            <StaggerItem
              as="li"
              key={s.label}
              // 2-up grid on phones (left rule on the right column, top rule on
              // the second row); one row with left rules between items on desktop.
              className={`border-line py-8 sm:py-10 ${i % 2 === 1 ? "border-l pl-5 sm:pl-8" : ""} ${
                i >= 2 ? "border-t lg:border-t-0" : ""
              } ${i > 0 ? "lg:border-l lg:pl-10" : ""}`}
            >
              <p className="font-display text-4xl font-bold tracking-tight text-navy sm:text-5xl">
                {s.value}
              </p>
              <p className="label-caps mt-3 text-slate">{s.label}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </section>
  );
}

/* ---- About --------------------------------------------------------------- */

/**
 * Editorial two-column "About me". The bio is plain text: split on blank lines
 * into paragraphs, single newlines preserved. A short opening paragraph is set
 * as a display-type lead; a long one stays body text so it never shouts.
 * Without a bio, a one-or-two sentence intro is composed from the
 * specialist's own fields (composeIntro) and set as the lead; with no fields
 * either, the section is omitted.
 */
export function ProfileAbout({ specialist }: { specialist: PublicSpecialist }) {
  const composed = !specialist.bio;
  // A name-only intro would just repeat the hero, so leave the section out.
  const { areas, specialties, languages, yearsExperience } = specialist;
  const hasFacts =
    areas.length + specialties.length + languages.length > 0 || (yearsExperience ?? 0) > 0;
  if (composed && !hasFacts) return null;
  const paragraphs = composed
    ? [composeIntro(specialist)]
    : specialist.bio!.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const hasLead = composed || (paragraphs.length > 1 && paragraphs[0].length <= 280);
  const [lead, ...rest] = hasLead ? paragraphs : [null, ...paragraphs];

  return (
    <section data-surface="light" className="bg-cream py-section md:py-section-lg">
      <Container>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          <Reveal className="lg:col-span-4">
            <p className="label-caps text-gold-ink">Meet {firstNameOf(specialist.name)}</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">About me</h2>
            <div aria-hidden="true" className="mt-6 h-px w-16 bg-gold-ink" />
          </Reveal>
          <Reveal delay={0.08} className="min-w-0 lg:col-span-7 lg:col-start-6">
            {lead && (
              <p className="mb-6 max-w-[48ch] whitespace-pre-line break-words font-display text-xl font-semibold leading-relaxed text-navy sm:text-2xl sm:leading-snug">
                {lead}
              </p>
            )}
            {rest.map((p, i) => (
              <p key={i} className="mt-5 max-w-[65ch] first:mt-0 whitespace-pre-line break-words leading-relaxed text-slate">
                {p}
              </p>
            ))}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/* ---- Expertise ----------------------------------------------------------- */

/** Free-text specialty → Material Symbol from the icon map; generic fallback. */
function specialtyIcon(label: string): string {
  const t = label.toLowerCase();
  if (/manag/.test(t)) return "home_work";
  if (/apprais|valu/.test(t)) return "request_quote";
  if (/short[- ]?term|vacation|staycation|airbnb/.test(t)) return "event_available";
  if (/leas|rent|tenan/.test(t)) return "key";
  if (/sell|sale|listing/.test(t)) return "sell";
  if (/buy|purchas|acqui/.test(t)) return "real_estate_agent";
  if (/commerc|office|retail|warehouse/.test(t)) return "business";
  if (/condo|apartment|residential|house|home/.test(t)) return "apartment";
  if (/land|lot|farm/.test(t)) return "landscape";
  if (/invest/.test(t)) return "trending_up";
  if (/pre-?selling|develop/.test(t)) return "corporate_fare";
  if (/reloc|expat|moving/.test(t)) return "moving";
  return "handshake";
}

function AreasBlock({ areas }: { areas: string[] }) {
  return (
    <div>
      <h3 className="label-caps text-gold-ink">Areas served</h3>
      <ul className="mt-5 border-t border-line-strong">
        {areas.map((a) => (
          <li key={a} className="flex items-center gap-4 border-b border-line py-4">
            <Icon name="location_on" size={20} className="shrink-0 text-gold-ink" />
            <span className="min-w-0 break-words font-display text-lg font-semibold text-navy">{a}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpecialtiesBlock({ specialties }: { specialties: string[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
      {specialties.map((s) => (
        <li key={s} className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-line bg-surface text-navy-700">
            <Icon name={specialtyIcon(s)} size={22} />
          </span>
          <span className="min-w-0 break-words font-medium text-ink">{s}</span>
        </li>
      ))}
    </ul>
  );
}

function LanguagesBlock({ languages }: { languages: string[] }) {
  return (
    <div>
      <h3 className="label-caps text-gold-ink">Languages</h3>
      <ul className="mt-4 flex flex-wrap gap-2">
        {languages.map((l) => (
          <li key={l} className="border border-line bg-surface px-3 py-1.5 text-sm text-navy">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ColumnHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <p className="label-caps text-gold-ink">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">{title}</h2>
    </>
  );
}

/**
 * "Where I work" (areas + languages) beside "What I can help you with"
 * (specialties): an asymmetric split rather than equal cards, the wider right
 * column dropped lower on desktop for a zig-zag rhythm. Empty lists are
 * omitted; a side with nothing in it disappears, and so does the section.
 */
export function ProfileExpertise({ specialist }: { specialist: PublicSpecialist }) {
  const { areas, specialties, languages } = specialist;
  const hasWhere = areas.length > 0 || languages.length > 0;
  const hasWhat = specialties.length > 0;
  if (!hasWhere && !hasWhat) return null;
  const split = hasWhere && hasWhat;

  return (
    <section data-surface="light" className="bg-surface-gray py-section md:py-section-lg">
      <Container>
        <div className={`grid grid-cols-1 gap-16 ${split ? "lg:grid-cols-12" : ""}`}>
          {hasWhere && (
            <Reveal className={split ? "lg:col-span-5" : "max-w-3xl"}>
              <ColumnHeading eyebrow="Expertise" title="Where I work" />
              <div className="mt-10 flex flex-col gap-10">
                {areas.length > 0 && <AreasBlock areas={areas} />}
                {languages.length > 0 && <LanguagesBlock languages={languages} />}
              </div>
            </Reveal>
          )}
          {hasWhat && (
            <Reveal
              delay={split ? 0.08 : 0}
              className={split ? "min-w-0 lg:col-span-6 lg:col-start-7 lg:pt-24" : "max-w-3xl"}
            >
              <ColumnHeading eyebrow="Specialties" title="What I can help you with" />
              <div className="mt-10">
                <SpecialtiesBlock specialties={specialties} />
              </div>
            </Reveal>
          )}
        </div>
      </Container>
    </section>
  );
}

/* ---- Listings ------------------------------------------------------------ */

/** "My listings" grid with a proper empty state. Anchor target of the hero's "View listings". */
export function ProfileListings({ listings }: { listings: Listing[] }) {
  return (
    <section data-surface="light" id="listings" className="scroll-mt-24 bg-cream py-section md:py-section-lg">
      <Container>
        <Reveal className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps text-gold-ink">Portfolio</p>
            <h2 className="mt-3 flex items-baseline gap-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              My listings
              {listings.length > 0 && (
                <span className="font-body text-lg font-medium text-slate">({listings.length})</span>
              )}
            </h2>
          </div>
          <Link
            href="/listings"
            className="label-caps inline-flex min-h-[44px] items-center gap-2 self-start text-navy transition-colors hover:text-gold-ink sm:self-auto"
          >
            Browse all listings
            <Icon name="arrow_forward" size={16} />
          </Link>
        </Reveal>

        {listings.length > 0 ? (
          <StaggerGroup as="ul" className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <StaggerItem as="li" key={listing.id}>
                <PropertyCard listing={listing} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        ) : (
          <Reveal className="mt-10 grid grid-cols-1 border border-line bg-surface md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <div aria-hidden="true" className="relative hidden overflow-hidden bg-navy md:block">
              <div className={`absolute inset-0 opacity-[0.08] ${GRID_TEXTURE}`} />
              <div className="absolute inset-0 flex items-center justify-center text-gold">
                <Icon name="home_work" size={56} />
              </div>
            </div>
            <div className="p-6 sm:p-10">
              <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center bg-navy text-gold md:hidden">
                <Icon name="home_work" size={26} />
              </span>
              <h3 className="mt-5 font-display text-2xl font-semibold text-navy md:mt-0">
                No active listings right now
              </h3>
              <p className="mt-3 max-w-[56ch] leading-relaxed text-slate">
                New properties come in all the time. Tell me what you&apos;re looking for, whether
                a place to rent, a home to buy, or a space for your business, and I&apos;ll send
                you matching properties.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button href="/contact" size="lg" className="whitespace-nowrap">
                  Send an inquiry
                </Button>
                <Button href="/listings" variant="ghost" size="lg" className="whitespace-nowrap">
                  Browse all listings
                </Button>
              </div>
            </div>
          </Reveal>
        )}
      </Container>
    </section>
  );
}
