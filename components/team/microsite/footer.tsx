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
 * then the shared legal row with absolute links to the main site.
 */
export async function MicrositeFooter() {
  const settings = await getSettings();
  const socials = NETWORKS.map((n) => ({ ...n, href: s(settings, n.key).trim() })).filter(
    (n) => n.href.length > 0,
  );

  return (
    <footer className="bg-navy text-white">
      <div className="container-site flex flex-col gap-8 py-10 md:py-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="shrink-0">
          <Logo variant="white" className="h-12" href={`${APEX_ORIGIN}/`} />
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-2 gap-y-1 sm:gap-x-4">
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
          <ul aria-label="All Abode on social media" className="flex items-center gap-2">
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
