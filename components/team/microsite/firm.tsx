import Image from "next/image";
import { Icon } from "@/components/icon";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { apexUrl } from "@/components/team/microsite/links";
import { FIRM_COPY } from "@/lib/team/profile-copy";

/**
 * "Backed by All Abode": a left-aligned statement over the owner's line-drawn
 * skyline, then the four services linking to the main site's service pages:
 * two by two on phones (each tile at full reading size), four across from md.
 * Anchor target of the header's "Our services".
 */
export function MicrositeFirm() {
  return (
    <section
      id="services"
      aria-labelledby="firm-heading"
      className="relative isolate scroll-mt-20 overflow-hidden border-y border-line bg-surface-gray py-12 sm:py-16 lg:py-section"
    >
      <Image
        src="/microsite/firm-skyline.png"
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        className="-z-10 object-cover object-bottom mix-blend-multiply"
      />
      <div className="container-site">
        <Reveal className="max-w-2xl">
          <h2 id="firm-heading" className="font-display text-3xl font-bold tracking-[-0.01em] text-navy sm:text-4xl">
            {FIRM_COPY.heading}
          </h2>
          <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-slate sm:text-lg">{FIRM_COPY.body}</p>
        </Reveal>

        <StaggerGroup as="ul" className="mt-8 grid grid-cols-2 gap-px border border-line-strong bg-line-strong md:grid-cols-4 lg:mt-12">
          {FIRM_COPY.services.map((svc) => (
            <StaggerItem as="li" key={svc.title} className="min-w-0 bg-surface-gray">
              <a
                href={apexUrl(svc.path)}
                className="group flex h-full flex-col p-4 transition-colors duration-[var(--dur-mid)] hover:bg-surface sm:p-6 lg:p-8"
              >
                <Icon name={svc.icon} size={32} className="size-7 text-gold-ink sm:size-8" />
                <span className="mt-4 hyphens-auto break-words font-display text-base font-semibold leading-snug text-navy group-hover:text-navy-700 sm:text-lg">
                  {svc.title}
                </span>
                <span className="mt-2 text-sm leading-relaxed text-slate">{svc.body}</span>
              </a>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
