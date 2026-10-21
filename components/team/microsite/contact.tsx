import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion";
import { MicrositeContactForm } from "@/components/team/microsite/contact-form";
import { APEX_ORIGIN } from "@/components/team/microsite/links";
import { SocialGlyph, type SocialNetwork } from "@/components/team/microsite/social-icons";
import { getSettings, s } from "@/lib/settings";
import { site } from "@/lib/site";
import { CONTACT_COPY } from "@/lib/team/profile-copy";
import type { PublicSpecialist } from "@/lib/team/public-queries";
import { telHref, viberHref } from "@/lib/team/public-contact";

type Detail = {
  key: string;
  icon: ReactNode;
  label: string;
  href: string | null;
  /** Web links open in a new tab; tel:, mailto: and viber:// do not. */
  external?: boolean;
  ariaLabel?: string;
};

const iconCls = "size-[18px] shrink-0 text-navy-700 sm:size-[22px]";
const glyph = (network: SocialNetwork) => (
  <span className={`inline-flex items-center justify-center [&>svg]:size-full ${iconCls}`}>
    <SocialGlyph network={network} size={20} />
  </span>
);

/**
 * "Contact me": the specialist's own published contact details where they
 * have filled them in, otherwise the company contact details from Admin
 * Settings, beside the message form. Mobile and email fall back per row to the
 * company values; phone and Viber show as "Call me" / "Message me on Viber"
 * links, never as printed digits; Viber, Facebook and LinkedIn rows only appear when the
 * specialist has added them (the company's socials stay in the footer).
 * Anchor target of every "Contact" / "Inquire now" / "Get in touch" link.
 * Two columns from 560px up (as the mobile mockup); narrower phones stack
 * the details above the form so the fields (and the 300px-wide Turnstile
 * check) stay full width and usable.
 */
export async function MicrositeContact({ specialist }: { specialist: PublicSpecialist }) {
  const settings = await getSettings();
  const own = specialist.contact;
  const companyPhone = s(settings, "contact_phone").trim();
  const companyEmail = s(settings, "contact_email").trim();
  const location = s(settings, "contact_location").trim();

  // The number itself is not printed on the page: it sits behind a "Call me" link that dials
  // when tapped (the digits remain in the link target, so this hides, not secures, the number).
  const phoneHref = own.public_phone ? telHref(own.public_phone) : companyPhone ? telHref(companyPhone) : null;
  const phone = phoneHref
    ? { label: "Call me", href: phoneHref, ariaLabel: `Call ${specialist.name}` }
    : null;
  const email = own.public_email ?? (companyEmail || null);

  const rows: (Detail | null)[] = [
    phone ? { key: "phone", icon: <Icon name="call" size={22} className={iconCls} />, ...phone } : null,
    own.public_viber
      ? {
          key: "viber",
          icon: glyph("viber"),
          label: "Message me on Viber",
          href: viberHref(own.public_viber),
          ariaLabel: `Message ${specialist.name} on Viber`,
        }
      : null,
    email
      ? { key: "email", icon: <Icon name="mail" size={22} className={iconCls} />, label: email, href: `mailto:${email}` }
      : null,
    own.public_facebook_url
      ? {
          key: "facebook",
          icon: glyph("facebook"),
          label: "Facebook",
          href: own.public_facebook_url,
          external: true,
          ariaLabel: `${specialist.name} on Facebook (opens in a new tab)`,
        }
      : null,
    own.public_linkedin_url
      ? {
          key: "linkedin",
          icon: glyph("linkedin"),
          label: "LinkedIn",
          href: own.public_linkedin_url,
          external: true,
          ariaLabel: `${specialist.name} on LinkedIn (opens in a new tab)`,
        }
      : null,
    { key: "web", icon: <Icon name="public" size={22} className={iconCls} />, label: site.domain, href: `${APEX_ORIGIN}/` },
    location
      ? { key: "location", icon: <Icon name="location_on" size={22} className={iconCls} />, label: location, href: null }
      : null,
  ];
  const details = rows.filter((d): d is Detail => d !== null);

  return (
    <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-20 bg-cream py-10 sm:py-14 lg:py-section">
      <div className="container-site grid grid-cols-1 gap-8 min-[560px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] min-[560px]:gap-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Reveal className="min-w-0 min-[560px]:border-r min-[560px]:border-line min-[560px]:pr-5 sm:pr-8 lg:pr-16">
          <h2 id="contact-heading" className="font-display text-2xl font-bold text-navy sm:text-4xl">
            {CONTACT_COPY.heading}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate sm:mt-3 sm:text-base">{CONTACT_COPY.sub}</p>
          <ul className="mt-5 flex flex-col sm:mt-8 sm:gap-1">
            {details.map((d) => (
              <li key={d.key}>
                {d.href ? (
                  <a
                    href={d.href}
                    {...(d.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    aria-label={d.ariaLabel}
                    className="flex min-h-[44px] items-center gap-2.5 break-all text-ink transition-colors hover:text-navy-700 max-sm:text-sm sm:gap-4"
                  >
                    {d.icon}
                    {d.label}
                  </a>
                ) : (
                  <p className="flex min-h-[44px] items-center gap-2.5 text-ink max-sm:text-sm sm:gap-4">
                    {d.icon}
                    {d.label}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.08} className="min-w-0 min-[560px]:pl-5 sm:pl-8 lg:pl-16">
          <MicrositeContactForm specialistSlug={specialist.slug} specialistName={specialist.name} />
        </Reveal>
      </div>
    </section>
  );
}
