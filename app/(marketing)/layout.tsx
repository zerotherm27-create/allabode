import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { JsonLd, organizationSchema } from "@/components/seo/json-ld";
import { getSettings, s } from "@/lib/settings";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  return (
    <div className="flex min-h-dvh flex-col">
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
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <ChatWidget />
    </div>
  );
}
