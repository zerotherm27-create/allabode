import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, CtaBand } from "@/components/sections";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { trustPoints } from "@/lib/data";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "About All Abode Property Solutions",
  description:
    "Learn about All Abode, operated by All Abode Brokerage and Valuation OPC, providing brokerage, valuation, leasing, property management, and documentation assistance.",
  alternates: { canonical: "/about" },
};

const whoWeServe = [
  "Property owners",
  "Buyers",
  "Sellers",
  "Tenants",
  "Investors",
  "Businesses",
  "OFWs and overseas property owners",
  "Families managing property concerns",
];

export default async function AboutPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHero
        eyebrow="About All Abode"
        title="About All Abode"
        subtitle="All Abode is a real estate service brand focused on practical support for owners, buyers, sellers, tenants, investors, and businesses. All Abode is operated by All Abode Brokerage and Valuation OPC, a Philippine real estate service company providing brokerage, valuation, leasing, property management, and documentation assistance services."
        image={s(settings, "page_about_image") || undefined}
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      {/* What we do + our approach */}
      <section className="py-section">
        <Container className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="What We Do"
              title="More than listings, a complete property partner"
            />
          </Reveal>
          <Reveal className="flex flex-col gap-5 text-slate leading-relaxed">
            <p>
              We help clients with real estate needs across different stages of
              property ownership and transactions. Our services include
              brokerage, leasing, valuation, property management, and
              documentation assistance.
            </p>
            <p>
              We believe real estate service should be clear, organized, and
              responsive. Clients should understand what is happening, what
              documents are needed, what the next step is, and who is
              responsible for each part of the process.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* Properties by Chel — founder's personal brand */}
      <section className="bg-surface-gray py-section">
        <Container className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-16">
          <Reveal className="shrink-0">
            <div className="flex w-56 flex-col items-center gap-4 rounded-lg border border-line bg-surface p-6 text-center shadow-sm">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy/5 text-navy-700">
                <Icon name="home_work" size={28} />
              </span>
              <div>
                <p className="font-display text-base font-bold text-navy">
                  Properties by Chel
                </p>
                <p className="mt-1 text-xs text-slate">
                  Personal real estate advisory &amp; education
                </p>
              </div>
              <div className="h-px w-full bg-line" />
              <p className="label-caps text-gold-ink">Founded by Chel</p>
            </div>
          </Reveal>
          <Reveal className="max-w-xl">
            <p className="label-caps text-gold-ink">About the Founder</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl">
              Properties by Chel
            </h2>
            <p className="mt-4 leading-relaxed text-slate">
              Properties by Chel is the personal real estate advisory and
              educational brand of Chel, founder of All Abode. It shares
              educational content and professional insights to help clients
              understand real estate topics, from leasing and buying to
              property management and valuation.
            </p>
            <p className="mt-3 leading-relaxed text-slate">
              All Abode, operated by All Abode Brokerage and Valuation OPC,
              serves as the main operating company for full-service property
              support: brokerage, valuation, leasing, property management, and
              documentation assistance.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* Licensed support + trust points */}
      <section className="bg-navy py-section text-white">
        <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <span className="label-caps text-gold">Licensed Real Estate Support</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
              Property decisions backed by licensed practice
            </h2>
            <p className="mt-6 max-w-xl text-white/70">
              Brokerage and valuation services are performed under the
              supervision of duly licensed real estate service practitioners.
              Every piece of advice we give is grounded in professional
              standards, legal compliance, and market data.
            </p>
            <Button
              href="/contact"
              variant="secondary"
              size="lg"
              className="mt-8 !border-gold !text-gold hover:!bg-gold hover:!text-navy"
            >
              Work With Our Team
            </Button>
          </Reveal>
          <StaggerGroup className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
            {trustPoints.map((point) => (
              <StaggerItem key={point.title}>
                <div className="flex h-full gap-5 bg-navy p-7">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-gold/15 text-gold">
                    <Icon name={point.icon} size={24} />
                  </span>
                  <div>
                    <h3 className="font-semibold">{point.title}</h3>
                    <p className="mt-1.5 text-sm text-white/70">{point.body}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* Who we serve + why clients work with us */}
      <section className="py-section">
        <Container className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <div>
            <Reveal>
              <SectionHeading
                align="left"
                eyebrow="Who We Serve"
                title="Support for every kind of client"
              />
            </Reveal>
            <StaggerGroup as="ul" className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {whoWeServe.map((w) => (
                <StaggerItem as="li" key={w}>
                  <div className="flex items-start gap-3 text-sm text-slate">
                    <Icon name="check_circle" size={20} className="mt-0.5 shrink-0 text-gold-ink" fill={1} />
                    <span>{w}</span>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="Why Clients Work With Us"
              title="Structure, not stress"
            />
            <p className="mt-6 leading-relaxed text-slate">
              We provide more than listings. We help clients understand their
              options, prepare requirements, coordinate next steps, and manage
              property-related concerns with better structure.
            </p>
          </Reveal>
        </Container>
      </section>

      <CtaBand
        title="Need help with your property?"
        body="Whether you are leasing, selling, managing, buying, renting, or requesting valuation, All Abode can guide you to the right next step."
      >
        <Button href="/contact" size="lg">
          Contact All Abode
        </Button>
        <Button href="/list-your-property" variant="ghost" size="lg">
          List My Property
        </Button>
      </CtaBand>
    </>
  );
}
