import { Icon } from "@/components/icon";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { Skyline } from "@/components/team/microsite/skyline";
import { apexUrl } from "@/components/team/microsite/links";
import { FIRM_COPY } from "@/lib/team/profile-copy";

/**
 * "Part of a trusted firm": centred statement over a faint skyline, then four
 * hairline-divided service tiles linking to the main site's service pages.
 * The four tiles stay in one row at every width, with the type scaled down.
 * Anchor target of the header's "Our services".
 */
export function MicrositeFirm() {
  return (
    <section
      id="services"
      aria-labelledby="firm-heading"
      className="relative isolate scroll-mt-20 overflow-hidden border-y border-line bg-surface-gray py-10 sm:py-14 lg:py-section"
    >
      <Skyline className="absolute inset-x-0 bottom-0 -z-10 h-full w-full text-navy/[0.05]" />
      <div className="container-site">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="label-caps text-gold-ink">{FIRM_COPY.eyebrow}</p>
          <h2 id="firm-heading" className="mt-3 font-display text-2xl font-bold text-navy sm:mt-4 sm:text-3xl lg:text-4xl">
            {FIRM_COPY.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-[0.8125rem] leading-relaxed text-slate sm:mt-4 sm:text-base">{FIRM_COPY.body}</p>
        </Reveal>

        <StaggerGroup
          as="ul"
          className="mx-auto mt-8 grid max-w-5xl grid-cols-4 lg:mt-12 lg:gap-px"
        >
          {FIRM_COPY.services.map((svc, i) => (
            <StaggerItem
              as="li"
              key={svc.title}
              className={`min-w-0 ${i > 0 ? "border-l border-line-strong" : ""}`}
            >
              <a
                href={apexUrl(svc.path)}
                className="group flex h-full min-h-[44px] flex-col items-center px-1 py-2 text-center transition-colors hover:bg-surface sm:px-3 sm:py-4 lg:px-5"
              >
                <Icon name={svc.icon} size={32} className="size-6 text-navy-700 sm:size-8" />
                <span className="mt-2 break-words max-lg:hyphens-auto font-display text-xs font-semibold text-navy group-hover:text-navy-700 max-sm:leading-tight sm:mt-4 sm:text-sm lg:text-base">
                  {svc.title}
                </span>
                <span className="mt-1 max-w-[26ch] break-words max-lg:hyphens-auto text-[0.6875rem] leading-snug text-slate sm:mt-1.5 sm:text-xs sm:leading-relaxed lg:text-sm">{svc.body}</span>
              </a>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
