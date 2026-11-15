import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion";
import { MicrositeFacts } from "@/components/team/microsite/facts";
import { ABOUT_COPY, ABOUT_VALUES, aboutParagraphs } from "@/lib/team/profile-copy";
import type { PublicSpecialist } from "@/lib/team/public-queries";

/**
 * "About me": the facts strip, then the specialist's bio (or the default
 * intro + goal) in one readable column with the three working values listed
 * beside it on desktop and beneath it on phones. No photo: the hero carries
 * the portrait, and this section is for reading.
 */
export function MicrositeAbout({ specialist }: { specialist: PublicSpecialist }) {
  const paragraphs = aboutParagraphs(specialist);

  return (
    <section id="about" aria-labelledby="about-heading" className="scroll-mt-20 bg-cream pb-14 sm:pb-16 lg:pb-section">
      <div className="container-site">
        <MicrositeFacts specialist={specialist} />
        <div className="grid grid-cols-1 gap-10 pt-12 sm:pt-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20 lg:pt-section">
          <Reveal>
            <h2
              id="about-heading"
              className="max-w-[20ch] font-display text-3xl font-bold leading-tight tracking-[-0.01em] text-navy sm:text-4xl"
            >
              {ABOUT_COPY.heading}
            </h2>
            <div className="mt-6 flex flex-col gap-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="max-w-[62ch] whitespace-pre-line break-words text-base leading-relaxed text-slate sm:text-lg">
                  {p}
                </p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <ul className="flex flex-col border-t border-line-strong">
              {ABOUT_VALUES.map((v) => (
                <li key={v.title} className="flex items-start gap-4 border-b border-line py-5">
                  <Icon name={v.icon} size={28} className="mt-0.5 shrink-0 text-gold-ink" />
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold text-navy">{v.title}</h3>
                    <p className="mt-1 text-base leading-relaxed text-slate">{v.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
