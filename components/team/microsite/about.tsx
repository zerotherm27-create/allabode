import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion";
import { FacadeIllustration } from "@/components/team/microsite/skyline";
import { ABOUT_COPY, ABOUT_VALUES, aboutParagraphs } from "@/lib/team/profile-copy";
import type { PublicSpecialist } from "@/lib/team/public-queries";

/**
 * "About me": the specialist's bio (or the default intro + goal) with a navy
 * outline "Get to know me" on the left; on the right an illustrated facade
 * panel beside the navy values panel, bleeding to the viewport edge on desktop.
 */
export function MicrositeAbout({ specialist }: { specialist: PublicSpecialist }) {
  const paragraphs = aboutParagraphs(specialist);

  return (
    <section id="about" aria-labelledby="about-heading" className="scroll-mt-20 bg-cream">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="container-site py-section lg:ml-auto lg:mr-0 lg:max-w-[40rem] lg:pr-14">
          <Reveal>
            <p className="label-caps text-gold-ink">{ABOUT_COPY.eyebrow}</p>
            <h2
              id="about-heading"
              className="mt-4 max-w-[18ch] font-display text-3xl font-bold leading-tight text-navy sm:text-4xl"
            >
              {ABOUT_COPY.heading}
            </h2>
            <div className="mt-6 flex flex-col gap-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="max-w-[60ch] whitespace-pre-line break-words leading-relaxed text-slate">
                  {p}
                </p>
              ))}
            </div>
            <Button href="#contact" variant="ghost" size="lg" className="mt-8 whitespace-nowrap">
              {ABOUT_COPY.cta}
              <Icon name="arrow_forward" size={16} />
            </Button>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[2fr_3fr] lg:my-6">
          <div aria-hidden="true" className="relative hidden overflow-hidden bg-surface-gray sm:block">
            <FacadeIllustration className="absolute inset-0 h-full w-full text-navy/20" litClassName="text-gold" />
          </div>
          <div className="bg-navy px-6 py-12 text-white sm:px-10 lg:py-14">
            <ul className="flex flex-col">
              {ABOUT_VALUES.map((v) => (
                <li
                  key={v.title}
                  className="flex items-start gap-5 border-b border-white/10 py-7 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <Icon name={v.icon} size={32} className="shrink-0 text-gold" />
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold text-white">{v.title}</h3>
                    <p className="mt-1 max-w-[28ch] text-sm leading-relaxed text-white/70">{v.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
