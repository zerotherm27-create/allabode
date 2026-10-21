import { JsonLd, organizationSchema } from "@/components/seo/json-ld";
import { SiteContentProtection } from "@/components/site-content-protection";
import { MicrositeHeader } from "@/components/team/microsite/header";
import { MicrositeFooter } from "@/components/team/microsite/footer";
import { getSettings, s } from "@/lib/settings";

// Same ISR ceiling as the marketing layout; admin mutations revalidate on demand.
export const revalidate = 300;

/**
 * Chrome for the specialist microsite (/team/<slug>, and <slug>.allabodeph.com
 * via the proxy rewrite): its own header and footer instead of the marketing
 * site's, everything else as app/(marketing)/layout.tsx.
 */
export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div id="top" className="flex min-h-dvh flex-col">
      <SiteContentProtection />
      <JsonLd
        data={organizationSchema({
          email: s(settings, "contact_email"),
          telephone: s(settings, "contact_phone"),
          areaServed: s(settings, "contact_service_area"),
          addressLocality: s(settings, "contact_location"),
          sameAs: s(settings, "social_facebook"),
        })}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <MicrositeHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <MicrositeFooter />
    </div>
  );
}
