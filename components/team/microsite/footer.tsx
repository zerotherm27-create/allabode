import { Logo } from "@/components/logo";
import { FooterLegal } from "@/components/footer-legal";
import {
  SocialGlyph,
  SOCIAL_LABELS,
  type SocialNetwork,
} from "@/components/team/microsite/social-icons";
import {
  APEX_ORIGIN,
  MICROSITE_LEGAL_LINKS,
  MICROSITE_NAV,
} from "@/components/team/microsite/links";
import { getSettings, s } from "@/lib/settings";

const NETWORKS: { network: SocialNetwork; key: string }[] = [
  { network: "facebook", key: "social_facebook" },
  { network: "messenger", key: "social_messenger" },
  { network: "viber", key: "social_viber" },
  { network: "whatsapp", key: "social_whatsapp" },
];

/**
 * Navy microsite footer: logo, the same anchor nav as the header, the
 * company's social links from Admin Settings (any without a URL is skipped),
 * then the shared legal row with absolute links to the main site. Phones:
 * logo and socials share the first row, the nav wraps underneath.
 */
export async function MicrositeFooter() {
  const settings = await getSettings();
  const socials = NETWORKS.map((n) => ({ ...n, href: s(settings, n.key).trim() })).filter(
    (n) => n.href.length > 0,
  );

  return (
    <footer className="bg-navy text-white">
      <div className="container-site flex flex-wrap items-center justify-between gap-x-3 gap-y-3 py-6 md:py-12 lg:flex-nowrap lg:gap-8">
        <div className="flex shrink-0 lg:block [&>a]:min-h-11">
          <Logo variant="white" className="h-8 sm:h-10 lg:h-12" href={`${APEX_ORIGIN}/`} />
        </div>

        <nav aria-label="Footer" className="order-last w-full lg:order-none lg:w-auto">
          <ul className="-ml-1 flex flex-wrap gap-x-2 sm:gap-x-4 lg:ml-0 lg:gap-y-1">
            {MICROSITE_NAV.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="inline-flex min-h-[44px] items-center px-1 text-sm text-white/75 transition-colors hover:text-gold"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {socials.length > 0 && (
          <ul aria-label="All Abode on social media" className="flex items-center gap-1 sm:gap-2">
            {socials.map(({ network, href }) => (
              <li key={network}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`All Abode on ${SOCIAL_LABELS[network]} (opens in a new tab)`}
                  className="inline-flex h-11 w-11 items-center justify-center border border-white/15 text-white/80 transition-colors hover:border-gold hover:text-gold focus-visible:outline-gold!"
                >
                  <SocialGlyph network={network} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FooterLegal links={MICROSITE_LEGAL_LINKS} />
    </footer>
  );
}
