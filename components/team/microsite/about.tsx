import Image from "next/image";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion";
import { ABOUT_COPY, ABOUT_VALUES, aboutParagraphs } from "@/lib/team/profile-copy";
import type { PublicSpecialist } from "@/lib/team/public-queries";

/**
 * "About me": the specialist's bio (or the default intro + goal) with a navy
 * outline "Get to know me" on the left; on the right the owner's interior photo
 * beside the navy values panel, bleeding to the viewport edge on desktop.
 * Below lg the two columns stay side by side (55/45) and the navy panel sits
 * over the lower part of the photo instead of beside it (so the crop favours
 * the top: pendant lamp, plant and city view).
 */
export function MicrositeAbout({ specialist }: { specialist: PublicSpecialist }) {
  const paragraphs = aboutParagraphs(specialist);

  return (
    <section id="about" aria-labelledby="about-heading" className="scroll-mt-20 bg-cream">
      <div className="grid grid-cols-[minmax(0,11fr)_minmax(0,9fr)] lg:grid-cols-2">
        <div className="container-site py-10 max-lg:pr-4 sm:py-14 lg:ml-auto lg:mr-0 lg:max-w-[40rem] lg:py-section lg:pr-14">
          <Reveal>
            <p className="label-caps text-gold-ink">{ABOUT_COPY.eyebrow}</p>
            <h2
              id="about-heading"
              className="mt-3 max-w-[18ch] font-display text-xl font-bold leading-tight text-navy sm:mt-4 sm:text-3xl lg:text-4xl"
            >
              {ABOUT_COPY.heading}
            </h2>
            <div className="mt-4 flex flex-col gap-3 sm:mt-6 sm:gap-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="max-w-[60ch] whitespace-pre-line break-words text-[0.8125rem] leading-relaxed text-slate sm:text-base">
                  {p}
                </p>
              ))}
            </div>
            <Button href="#contact" variant="ghost" size="lg" className="mt-6 whitespace-nowrap max-sm:px-4 sm:mt-8">
              {ABOUT_COPY.cta}
              <Icon name="arrow_forward" size={16} />
            </Button>
          </Reveal>
        </div>

        <div className="flex flex-col py-10 pr-5 sm:py-14 sm:pr-8 lg:my-6 lg:grid lg:grid-cols-[2fr_3fr] lg:p-0">
          <div aria-hidden="true" className="relative h-36 overflow-hidden bg-surface-gray sm:h-60 lg:h-auto">
            <Image
              src="/microsite/about-interior.jpg"
              alt=""
              fill
              sizes="(min-width: 1024px) 20vw, 40vw"
              className="object-cover object-[30%_20%] lg:object-[40%_center]"
            />
          </div>
          <div className="relative -mt-10 ml-3 bg-navy px-3 py-4 text-white sm:-mt-20 sm:ml-8 sm:px-6 sm:py-8 lg:m-0 lg:px-10 lg:py-14">
            <ul className="flex flex-col">
              {ABOUT_VALUES.map((v) => (
                <li
                  key={v.title}
                  className="flex items-start gap-2 border-b border-white/10 py-3 first:pt-0 last:border-b-0 last:pb-0 sm:gap-4 sm:py-5 lg:gap-5 lg:py-7"
                >
                  <Icon name={v.icon} size={32} className="size-6 shrink-0 text-gold sm:size-8" />
                  <div className="min-w-0">
                    <h3 className="font-display text-xs font-semibold text-white max-lg:leading-snug sm:text-base lg:text-lg">{v.title}</h3>
                    <p className="mt-0.5 max-w-[28ch] text-[0.6875rem] leading-snug text-white/75 sm:mt-1 sm:text-sm sm:leading-relaxed lg:text-white/70">{v.body}</p>
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
