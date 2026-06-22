import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, CtaBand, FounderSection } from "@/components/sections";
import { trustPoints } from "@/lib/data";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "All Abode Property Solutions combines licensed brokerage, leasing, property management, and appraisal expertise to help clients make better property decisions in the Philippines.",
};

const values = [
  { icon: "verified_user", title: "Licensed & Compliant", body: "Every engagement is led by PRC-licensed professionals operating within the RESA Law." },
  { icon: "handshake", title: "Transparent", body: "Clear reporting, honest pricing, and no surprises — you always know where your property stands." },
  { icon: "insights", title: "Data-Driven", body: "Decisions backed by real market data and rigorous valuation, not guesswork." },
  { icon: "diversity_3", title: "Client-First", body: "A personalized approach that treats your property as if it were our own." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About All Abode"
        title="Complete property support, all under one roof."
        subtitle="We were created to provide professional, transparent, and complete property support for clients who need more than a simple listing."
      />

      {/* Story */}
      <section className="py-section">
        <Container className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <SectionHeading
            align="left"
            eyebrow="Our Story"
            title="More than a listing — a complete property partner"
          />
          <div className="flex flex-col gap-5 text-slate leading-relaxed">
            <p>
              All Abode Property Solutions was created to provide professional,
              transparent, and complete property support for clients who need more
              than a simple listing. We combine brokerage, leasing, property
              management, and appraisal expertise to help clients make better
              property decisions.
            </p>
            <p>
              Building on the trusted foundation of{" "}
              <strong className="text-navy">Properties by Chel</strong>, we bring
              institutional-grade expertise together with a personal, relationship-led
              approach — serving property owners, tenants, buyers, sellers, and
              investors across the Philippines.
            </p>
          </div>
        </Container>
      </section>

      {/* Founder credentials */}
      <FounderSection eyebrow="Founder & Licensed Professional" band />

      {/* Mission + credibility */}
      <section className="bg-navy py-section text-white">
        <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div>
            <span className="label-caps text-gold">Our Mission</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
              Property decisions backed by licensed expertise
            </h2>
            <p className="mt-6 max-w-xl text-white/70">
              We believe property decisions shouldn&apos;t be based on guesswork. Our
              team consists of PRC-Licensed Real Estate Brokers and Appraisers,
              ensuring every piece of advice we give is backed by legal compliance and
              market data.
            </p>
            <Button href="/contact" variant="secondary" size="lg" className="mt-8">
              Work With Our Team
            </Button>
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
            {trustPoints.map((point) => (
              <div key={point.title} className="flex gap-5 bg-navy p-7">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-gold/15 text-gold">
                  <Icon name={point.icon} size={24} />
                </span>
                <div>
                  <h3 className="font-semibold">{point.title}</h3>
                  <p className="mt-1.5 text-sm text-white/70">{point.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Values */}
      <section className="py-section">
        <Container>
          <SectionHeading
            eyebrow="What We Stand For"
            title="Values that guide every engagement"
          />
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="bg-surface p-8">
                <span className="flex h-12 w-12 items-center justify-center bg-navy/5 text-navy-700">
                  <Icon name={v.icon} size={28} />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-navy">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">{v.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand
        title="Let's talk about your property"
        body="Whether you're leasing, selling, managing, or valuing — our licensed team is ready to help."
      >
        <Button href="/contact" size="lg">
          Get in Touch
        </Button>
        <Button href="/list-your-property" variant="ghost" size="lg">
          List Your Property
        </Button>
      </CtaBand>
    </>
  );
}
