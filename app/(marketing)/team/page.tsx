import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, CtaBand } from "@/components/sections";
import { Reveal } from "@/components/motion";
import { SpecialistCard } from "@/components/team/specialist-card";
import { getPublicSpecialists } from "@/lib/team/public-queries";
import { getBrokerProfile } from "@/lib/team/broker";
import { shuffled } from "@/lib/team/shuffle";

// The marketing layout sets `revalidate = 300`. The directory is shuffled on
// every request, so it opts out of static caching entirely.
export const dynamic = "force-dynamic";

const title = "Our team";
const description =
  "Meet the licensed broker and the property specialists accredited under All Abode Property Solutions.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/team" },
  openGraph: { title: `${title} | All Abode Property Solutions`, description },
};

export default async function TeamPage() {
  const [broker, specialists] = await Promise.all([getBrokerProfile(), getPublicSpecialists()]);
  const ordered = shuffled(specialists);

  return (
    <>
      <PageHero
        eyebrow="Our team"
        title="Meet the All Abode team"
        lead="A licensed broker and a growing group of property specialists, working together to help you rent, buy, sell, and manage property with clarity."
        crumbs={[{ label: "Home", href: "/" }, { label: "Our team" }]}
      />

      {/* Licensed broker — pinned first */}
      <section className="py-section">
        <Container>
          <Reveal>
            <div className="flex flex-col gap-5 border border-line bg-surface p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-navy/5 text-navy-700">
                <Icon name="verified" size={28} />
              </span>
              <div className="min-w-0">
                <p className="label-caps text-gold-ink">Licensed broker</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-navy sm:text-3xl">
                  {broker.name}
                </h2>
                {broker.licenseNo && (
                  <p className="mt-2 text-sm text-slate">PRC License No. {broker.licenseNo}</p>
                )}
                <p className="mt-3 max-w-2xl text-slate">
                  Every property specialist below is accredited under our licensed broker, so
                  your transaction is backed by licensed practice.
                </p>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

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
