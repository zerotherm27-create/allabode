import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { PageHero, SectionHeading, CtaBand } from "@/components/sections";
import { SpecialistCard } from "@/components/team/specialist-card";
import { getPublicSpecialists } from "@/lib/team/public-queries";
import { shuffled } from "@/lib/team/shuffle";
import { getSettings, s } from "@/lib/settings";

// Cached by the marketing layout's `revalidate = 300`: the directory order is
// reshuffled each time the page is regenerated (at most every 5 minutes, and
// right away when a specialist is added/hidden), which keeps the rotation fair
// while serving the page from the edge instead of querying the database per visit.

const title = "Our team";
const description =
  "Meet the property specialists of All Abode Property Solutions.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/team" },
  openGraph: { title: `${title} | All Abode Property Solutions`, description },
};

export default async function TeamPage() {
  const [specialists, settings] = await Promise.all([getPublicSpecialists(), getSettings()]);
  const ordered = shuffled(specialists);

  return (
    <>
      <PageHero
        eyebrow="Our team"
        title="Meet the All Abode team"
        lead="A growing group of property specialists helping you rent, buy, sell, and manage property with clarity."
        crumbs={[{ label: "Home", href: "/" }, { label: "Our team" }]}
        image={s(settings, "page_team_image") || undefined}
        imagePosition={s(settings, "page_team_image_position")}
      />

      {/* Property specialists */}
      <section className="bg-surface-gray py-section">
        <Container>
          <SectionHeading
            eyebrow="Property specialists"
            title="Find a specialist"
            lead="Each specialist has their own profile, areas of focus, and listings."
          />
          {ordered.length > 0 ? (
            <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ordered.map((specialist) => (
                <li key={specialist.id}>
                  <SpecialistCard specialist={specialist} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mx-auto mt-12 max-w-xl border border-line bg-surface p-8 text-center">
              <h3 className="font-display text-xl font-semibold text-navy">
                Our property specialists are joining soon
              </h3>
              <p className="mt-3 text-slate">
                We are welcoming new specialists to the team. In the meantime, our office can
                help with any rental, purchase, sale, or valuation question.
              </p>
              <Button href="/contact" size="lg" className="mt-6">
                Contact us
              </Button>
            </div>
          )}
        </Container>
      </section>

      <CtaBand
        title="Not sure who to talk to?"
        body="Tell us what you need and we will match you with the right person."
      >
        <Button href="/contact" size="lg">
          Contact us
        </Button>
        <Button href="/listings" variant="ghost" size="lg">
          Browse listings
        </Button>
      </CtaBand>
    </>
  );
}
