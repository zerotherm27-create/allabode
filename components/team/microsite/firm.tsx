import { Icon } from "@/components/icon";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { Skyline } from "@/components/team/microsite/skyline";
import { apexUrl } from "@/components/team/microsite/links";
import { FIRM_COPY } from "@/lib/team/profile-copy";

/**
 * "Part of a trusted firm": centred statement over a faint skyline, then four
 * hairline-divided service tiles linking to the main site's service pages.
 * Anchor target of the header's "Our services".
 */
export function MicrositeFirm() {
  return (
    <section
      id="services"
      aria-labelledby="firm-heading"
      className="relative isolate scroll-mt-20 overflow-hidden border-y border-line bg-surface-gray py-section"
    >
      <Skyline className="absolute inset-x-0 bottom-0 -z-10 h-full w-full text-navy/[0.05]" />
      <div className="container-site">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="label-caps text-gold-ink">{FIRM_COPY.eyebrow}</p>
          <h2 id="firm-heading" className="mt-4 font-display text-3xl font-bold text-navy sm:text-4xl">
            {FIRM_COPY.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] leading-relaxed text-slate">{FIRM_COPY.body}</p>
        </Reveal>

        <StaggerGroup
          as="ul"
          className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4 lg:border-0 lg:bg-transparent"
        >
          {FIRM_COPY.services.map((svc, i) => (
            <StaggerItem
              as="li"
              key={svc.title}
              className={`bg-surface-gray lg:bg-transparent ${i > 0 ? "lg:border-l lg:border-line-strong" : ""}`}
            >
              <a
                href={apexUrl(svc.path)}
                className="group flex h-full min-h-[44px] flex-col items-center px-5 py-7 text-center transition-colors hover:bg-surface lg:py-4"
              >
                <Icon name={svc.icon} size={32} className="text-navy-700" />
                <span className="mt-4 font-display text-base font-semibold text-navy group-hover:text-navy-700">
                  {svc.title}
                </span>
                <span className="mt-1.5 max-w-[26ch] text-sm leading-relaxed text-slate">{svc.body}</span>
              </a>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
