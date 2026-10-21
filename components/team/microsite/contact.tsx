import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion";
import { MicrositeContactForm } from "@/components/team/microsite/contact-form";
import { APEX_ORIGIN } from "@/components/team/microsite/links";
import { getSettings, s } from "@/lib/settings";
import { site } from "@/lib/site";
import { CONTACT_COPY } from "@/lib/team/profile-copy";
import type { PublicSpecialist } from "@/lib/team/public-queries";

/**
 * "Contact me": company contact details from Admin Settings (the public
 * specialist view has no phone or email) beside the message form. Anchor
 * target of every "Contact" / "Inquire now" / "Get in touch" link.
 */
export async function MicrositeContact({ specialist }: { specialist: PublicSpecialist }) {
  const settings = await getSettings();
  const phone = s(settings, "contact_phone").trim();
  const email = s(settings, "contact_email").trim();
  const location = s(settings, "contact_location").trim();

  const details = [
    phone ? { icon: "call", label: phone, href: `tel:${phone.replace(/[^\d+]/g, "")}` } : null,
    email ? { icon: "mail", label: email, href: `mailto:${email}` } : null,
    { icon: "public", label: site.domain, href: `${APEX_ORIGIN}/` },
    location ? { icon: "location_on", label: location, href: null } : null,
  ].filter((d): d is { icon: string; label: string; href: string | null } => d !== null);

  return (
    <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-20 bg-cream py-section">
      <div className="container-site grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-0">
        <Reveal className="lg:border-r lg:border-line lg:pr-16">
          <h2 id="contact-heading" className="font-display text-3xl font-bold text-navy sm:text-4xl">
            {CONTACT_COPY.heading}
          </h2>
          <p className="mt-3 leading-relaxed text-slate">{CONTACT_COPY.sub}</p>
          <ul className="mt-8 flex flex-col gap-1">
            {details.map((d) => (
              <li key={d.icon}>
                {d.href ? (
                  <a
                    href={d.href}
                    className="flex min-h-[44px] items-center gap-4 break-all text-ink transition-colors hover:text-navy-700"
                  >
                    <Icon name={d.icon} size={22} className="shrink-0 text-navy-700" />
                    {d.label}
                  </a>
                ) : (
                  <p className="flex min-h-[44px] items-center gap-4 text-ink">
                    <Icon name={d.icon} size={22} className="shrink-0 text-navy-700" />
                    {d.label}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.08} className="min-w-0 lg:pl-16">
          <MicrositeContactForm specialistSlug={specialist.slug} specialistName={specialist.name} />
        </Reveal>
      </div>
    </section>
  );
}
