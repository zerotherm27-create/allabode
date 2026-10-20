import Link from "next/link";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { GRID_TEXTURE } from "@/components/team/profile-hero";
import { FIRM_POINTS, PROCESS_STEPS } from "@/lib/team/profile-copy";

/* ---- How we'll work together -------------------------------------------- */

/**
 * All Abode's standard four-step process. Company-level copy (the same for
 * every specialist), so it always renders, even on a sparse profile.
 */
export function ProfileProcess() {
  return (
    <section data-surface="light" className="bg-surface-gray py-section md:py-section-lg">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-4">
            <p className="label-caps text-gold-ink">The process</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              How we&apos;ll work together
            </h2>
            <p className="mt-4 max-w-[40ch] leading-relaxed text-slate">
              Every inquiry follows the same All Abode process, from the first conversation
              through turnover.
            </p>
          </Reveal>
          <StaggerGroup
            as="ol"
            className="grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:col-span-8"
          >
            {PROCESS_STEPS.map((step, i) => (
              <StaggerItem as="li" key={step.title} className="border-t border-line-strong pt-6">
                <span aria-hidden="true" className="font-display text-2xl font-semibold text-gold-ink">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold text-navy">{step.title}</h3>
                <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-slate">{step.body}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </Container>
    </section>
  );
}

/* ---- Why clients choose All Abode --------------------------------------- */

/** Firm-level trust strip: hairline columns, no cards, no figures. */
export function ProfileFirmPoints() {
  return (
    <section data-surface="light" aria-labelledby="why-all-abode" className="border-y border-line bg-cream py-section">
      <Container>
        <Reveal>
          <p className="label-caps text-gold-ink">All Abode Property Solutions</p>
          <h2 id="why-all-abode" className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl">
            Why clients choose All Abode
          </h2>
        </Reveal>
        <StaggerGroup
          as="ul"
          className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-line"
        >
          {FIRM_POINTS.map((p) => (
            <StaggerItem as="li" key={p.title} className="flex gap-4 lg:flex-col lg:px-8 lg:first:pl-0 lg:last:pr-0">
              <Icon name={p.icon} size={24} className="shrink-0 text-gold-ink" />
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-navy">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate">{p.body}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </section>
  );
}

/* ---- Let's talk ---------------------------------------------------------- */

const moreFromAllAbode = [
  {
    href: "/property-solutions/property-management",
    title: "Property management",
    body: "Rent collection, tenant care, and upkeep handled for owners.",
  },
  {
    href: "/valuation",
    title: "Valuation and appraisal",
    body: "A professional opinion of value for your property.",
  },
];

/**
 * Closing navy band: the inquiry CTA (the page's one brass button) plus the
 * "More from All Abode" links, since valuation and property management
 * requests are handled by the All Abode team rather than the specialist.
 * The public view has no phone or email, so the only contact path is /contact.
 */
export function ProfileLetsTalk() {
  return (
    <section data-surface="dark" className="relative isolate overflow-hidden bg-navy py-section-lg text-white">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-br from-navy via-navy-800 to-navy-700" />
      <div aria-hidden="true" className={`absolute inset-0 -z-10 opacity-[0.05] ${GRID_TEXTURE}`} />
      <Container>
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-7">
            <p className="label-caps text-gold">Work with me</p>
            <h2 className="mt-3 max-w-[20ch] font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Let&apos;s talk about your property
            </h2>
            <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-white/80">
              Renting, buying, or selling, send an inquiry with what you have in mind and the All
              Abode team will connect you with me.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button href="/contact" variant="gold" size="lg" className="whitespace-nowrap">
                Send an inquiry
                <Icon name="arrow_forward" size={16} />
              </Button>
              <Button href="/team" variant="ghost-light" size="lg" className="whitespace-nowrap">
                Meet the team
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-5">
            <h3 className="label-caps text-white/70">More from All Abode</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Valuation and property management requests are handled by the All Abode team.
            </p>
            <ul className="mt-6 border-t border-white/15">
              {moreFromAllAbode.map((item) => (
                <li key={item.href} className="border-b border-white/15">
                  <Link
                    href={item.href}
                    className="group flex min-h-[44px] items-center justify-between gap-4 py-5"
                  >
                    <span className="min-w-0">
                      <span className="block font-display text-lg font-semibold text-white transition-colors group-hover:text-gold">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-sm text-white/70">{item.body}</span>
                    </span>
                    <Icon
                      name="arrow_forward"
                      size={20}
                      className="shrink-0 text-gold transition-transform duration-[var(--dur-mid)] group-hover:translate-x-1"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
