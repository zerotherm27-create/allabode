import { Reveal } from "@/components/motion";
import { MicrositeContactForm } from "@/components/team/microsite/contact-form";
import { ContactRowIcon } from "@/components/team/microsite/quick-contact";
import type { ContactRow } from "@/lib/team/contact-rows";
import { CONTACT_COPY, CTA_COPY } from "@/lib/team/profile-copy";
import type { PublicSpecialist } from "@/lib/team/public-queries";

/**
 * The closing contact section (one block instead of a call-to-action band
 * followed by a contact section): a navy panel with the invitation and the
 * specialist's contact links, joined to the message form on a white panel.
 * Side by side from lg, stacked below it with the form at full width (so the
 * fields and the 300px-wide Turnstile check stay usable on a 320px phone).
 * Anchor target of every "Inquire now" / "Contact" link.
 */
export function MicrositeClosing({ specialist, rows }: { specialist: PublicSpecialist; rows: ContactRow[] }) {
  return (
    <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-20 bg-cream py-12 sm:py-16 lg:py-section">
      <div className="container-site">
        <div className="grid grid-cols-1 border border-line lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Reveal className="min-w-0 bg-navy px-5 py-8 text-white sm:p-10 lg:p-14">
            <h2 id="contact-heading" className="max-w-[16ch] font-display text-3xl font-bold leading-tight tracking-[-0.01em] text-white sm:text-4xl">
              {CTA_COPY.heading}
            </h2>
            <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-white/80">{CTA_COPY.body}</p>
            <ul className="mt-6 flex flex-col border-t border-white/15 sm:mt-8">
              {rows.map((r) => (
                <li key={r.key} className="border-b border-white/15">
                  {r.href ? (
                    <a
                      href={r.href}
                      {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      aria-label={r.key === "email" ? undefined : r.ariaLabel}
                      className="flex min-h-[52px] items-center gap-4 break-all text-base text-white transition-colors hover:text-gold focus-visible:outline-gold!"
                    >
                      <ContactRowIcon rowKey={r.key} className="text-gold" />
                      {r.label}
                    </a>
                  ) : (
                    <p className="flex min-h-[52px] items-center gap-4 text-base text-white">
                      <ContactRowIcon rowKey={r.key} className="text-gold" />
                      {r.label}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.08} className="min-w-0 bg-surface px-5 py-8 sm:p-10 lg:p-14">
            <h3 className="font-display text-2xl font-bold text-navy">{CONTACT_COPY.heading}</h3>
            <p className="mb-6 mt-2 text-base leading-relaxed text-slate">{CONTACT_COPY.sub}</p>
            <MicrositeContactForm specialistSlug={specialist.slug} specialistName={specialist.name} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
