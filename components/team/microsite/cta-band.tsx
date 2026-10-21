import Image from "next/image";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion";
import { CTA_COPY } from "@/lib/team/profile-copy";

/**
 * Closing band: the owner's dusk living-room photo beside a navy panel with "Ready to explore your options?"
 * and a brass "Get in touch" (the band's own brass button, allowed on navy).
 * The two panels stay side by side on phones too (45/55), scaled down.
 */
export function MicrositeCtaBand() {
  return (
    <section aria-labelledby="cta-heading" className="grid grid-cols-[minmax(0,9fr)_minmax(0,11fr)] bg-navy md:grid-cols-[11fr_9fr]">
      <div aria-hidden="true" className="relative min-h-[14rem] overflow-hidden bg-navy-800 sm:min-h-[18rem] md:min-h-[22rem]">
        <Image
          src="/microsite/cta-twilight.jpg"
          alt=""
          fill
          sizes="(min-width: 768px) 55vw, 45vw"
          className="object-cover object-[60%_center] md:object-center"
        />
      </div>
      <div className="flex flex-col justify-center px-4 py-8 sm:px-10 sm:py-section md:block lg:px-16">
        <Reveal className="max-w-md">
          <p className="label-caps text-gold">{CTA_COPY.eyebrow}</p>
          <h2 id="cta-heading" className="mt-3 font-display text-xl font-bold leading-tight text-white sm:mt-4 sm:text-4xl">
            {CTA_COPY.heading}
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-white/75 sm:mt-5 sm:text-base">{CTA_COPY.body}</p>
          <Button href="#contact" variant="gold" size="lg" className="mt-5 whitespace-nowrap max-sm:px-4 sm:mt-8">
            {CTA_COPY.cta}
            <Icon name="arrow_forward" size={16} />
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
