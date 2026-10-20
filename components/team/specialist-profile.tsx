import { ProfileHero } from "@/components/team/profile-hero";
import {
  ProfileStats,
  ProfileAbout,
  ProfileExpertise,
  ProfileListings,
} from "@/components/team/profile-sections";
import { ProfileProcess, ProfileFirmPoints, ProfileLetsTalk } from "@/components/team/profile-closing";
import { ProfileExtras, type PortfolioExtras } from "@/components/team/profile-future";
import type { PublicSpecialist } from "@/lib/team/public-queries";
import type { Listing } from "@/lib/data";

/**
 * The public specialist portfolio, top to bottom. Pure presentation: the
 * route fetches the specialist and their listings. Personal sections with no
 * data render nothing (About falls back to a composed intro); the process,
 * firm points and closing CTA are company-level and always shown.
 */
export function SpecialistProfile({
  specialist,
  listings,
  extras,
}: {
  specialist: PublicSpecialist;
  listings: Listing[];
  /** Future portfolio fields (testimonials, closed deals, ...). Unused today. */
  extras?: PortfolioExtras;
}) {
  return (
    <>
      <ProfileHero specialist={specialist} />
      <ProfileStats specialist={specialist} listingCount={listings.length} />
      <ProfileAbout specialist={specialist} />
      <ProfileExpertise specialist={specialist} />
      <ProfileListings listings={listings} />
      <ProfileExtras extras={extras} />
      <ProfileProcess />
      <ProfileFirmPoints />
      <ProfileLetsTalk />
    </>
  );
}
