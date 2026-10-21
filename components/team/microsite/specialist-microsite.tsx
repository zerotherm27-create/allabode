import { MicrositeHero } from "@/components/team/microsite/hero";
import { MicrositeAbout } from "@/components/team/microsite/about";
import { MicrositeFirm } from "@/components/team/microsite/firm";
import { MicrositeListings } from "@/components/team/microsite/listings";
import { MicrositeCtaBand } from "@/components/team/microsite/cta-band";
import { MicrositeContact } from "@/components/team/microsite/contact";
import type { PublicSpecialist } from "@/lib/team/public-queries";
import type { Listing } from "@/lib/data";

/**
 * The public specialist microsite body, top to bottom (header and footer come
 * from app/(profile)/layout.tsx). Pure presentation: the route fetches the
 * specialist and their listings.
 */
export function SpecialistMicrosite({
  specialist,
  listings,
}: {
  specialist: PublicSpecialist;
  listings: Listing[];
}) {
  return (
    <>
      <MicrositeHero specialist={specialist} />
      <MicrositeAbout specialist={specialist} />
      <MicrositeFirm />
      <MicrositeListings listings={listings} />
      <MicrositeCtaBand />
      <MicrositeContact specialist={specialist} />
    </>
  );
}
