import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion";
import { FacadeIllustration, Skyline } from "@/components/team/microsite/skyline";
import { CTA_COPY } from "@/lib/team/profile-copy";

/**
 * Closing band: an illustrated dusk skyline panel (in place of the mockup's
 * interior photo) beside a navy panel with "Ready to explore your options?"
 * and a brass "Get in touch" (the band's own brass button, allowed on navy).
 */
export function MicrositeCtaBand() {
  return (
    <section aria-labelledby="cta-heading" className="grid grid-cols-1 bg-navy md:grid-cols-[11fr_9fr]">
      <div aria-hidden="true" className="relative hidden min-h-[22rem] overflow-hidden bg-navy-800 md:block">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-700/60 via-navy-800 to-navy" />
        <Skyline className="absolute inset-x-0 bottom-0 h-[75%] w-full text-white/20" />
        <FacadeIllustration
          className="absolute bottom-0 left-[12%] h-[85%] w-[30%] text-white/30"
          litClassName="text-gold"
        />
      </div>
      <div className="px-5 py-section sm:px-10 lg:px-16">
        <Reveal className="max-w-md">
          <p className="label-caps text-gold">{CTA_COPY.eyebrow}</p>
          <h2 id="cta-heading" className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
            {CTA_COPY.heading}
          </h2>
          <p className="mt-5 leading-relaxed text-white/75">{CTA_COPY.body}</p>
          <Button href="#contact" variant="gold" size="lg" className="mt-8 whitespace-nowrap">
            {CTA_COPY.cta}
            <Icon name="arrow_forward" size={16} />
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
