import { Icon } from "@/components/icon";
import { HeroFullBleed } from "@/components/team/microsite/hero-full-bleed";
import { HeroListings } from "@/components/team/microsite/hero-listings";
import { MicrositeAbout } from "@/components/team/microsite/about";
import { MicrositeFirm } from "@/components/team/microsite/firm";
import { MicrositeListings } from "@/components/team/microsite/listings";
import { MicrositeClosing } from "@/components/team/microsite/closing";
import { MicrositeContactCard } from "@/components/team/microsite/contact-card";
import { MobileContactBar, type MobileBarItem } from "@/components/team/microsite/mobile-contact-bar";
import { ContactRowIcon } from "@/components/team/microsite/quick-contact";
import { APEX_ORIGIN } from "@/components/team/microsite/links";
import { buildContactRows, quickContactRows } from "@/lib/team/contact-rows";
import type { MicrositeLayout } from "@/lib/team/layout";
import type { PublicSpecialist } from "@/lib/team/public-queries";
import { getSettings, s } from "@/lib/settings";
import { site } from "@/lib/site";
import type { Listing } from "@/lib/data";

/**
 * The public specialist microsite body, top to bottom (header and footer come
 * from app/(profile)/layout.tsx). The layout picks the hero and the order of
 * the sections under it; the sections themselves are the same in all three.
 * The route fetches the specialist and their listings; `layout` defaults to
 * the specialist's own choice and is only passed by the preview route.
 */
export async function SpecialistMicrosite({
  specialist,
  listings,
  layout = specialist.layout,
}: {
  specialist: PublicSpecialist;
  listings: Listing[];
  layout?: MicrositeLayout;
}) {
  const settings = await getSettings();
  const rows = buildContactRows({
    name: specialist.name,
    contact: specialist.contact,
    hideCallLink: specialist.hideCallLink,
    companyPhone: s(settings, "contact_phone").trim(),
    companyEmail: s(settings, "contact_email").trim(),
    location: s(settings, "contact_location").trim(),
    domain: site.domain,
    apexOrigin: APEX_ORIGIN,
  });
  const quick = quickContactRows(rows);

  // Phone action bar: at most two direct links (call first, then Viber or email) plus the form.
  const barItems: MobileBarItem[] = [
    ...quick.slice(0, 2).map((r) => ({
      key: r.key,
      label: r.short,
      href: r.href!,
      ariaLabel: r.ariaLabel,
      icon: <ContactRowIcon rowKey={r.key} className="text-gold-ink" />,
    })),
    {
      key: "inquire",
      label: "Inquire now",
      href: "#contact",
      icon: <Icon name="chat" size={20} className="shrink-0" />,
      primary: true,
    },
  ];

  const about = <MicrositeAbout specialist={specialist} />;
  const firm = <MicrositeFirm />;
  const closing = <MicrositeClosing specialist={specialist} rows={rows} />;
  const bar = <MobileContactBar items={barItems} />;

  if (layout === "signature") {
    return (
      <>
        <HeroFullBleed specialist={specialist} tone="dark" quick={quick} />
        <MicrositeListings listings={listings} />
        {about}
        {firm}
        {closing}
        {bar}
      </>
    );
  }
  if (layout === "listings") {
    return (
      <>
        <HeroListings specialist={specialist} />
        <MicrositeListings
          listings={listings}
          aside={<MicrositeContactCard name={specialist.name} rows={quick} />}
        />
        {about}
        {firm}
        {closing}
        {bar}
      </>
    );
  }
  return (
    <>
      <HeroFullBleed specialist={specialist} tone="light" />
      {about}
      <MicrositeListings listings={listings} />
      {firm}
      {closing}
      {bar}
    </>
  );
}
