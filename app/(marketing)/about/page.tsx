import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, CtaBand } from "@/components/sections";
import { trustPoints } from "@/lib/data";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "About All Abode Property Solutions | Licensed Real Estate Support",
  description:
    "Learn about All Abode Property Solutions, a Philippine property services company for brokerage, leasing, property management, appraisal, and documentation.",
};

const values = [
  { icon: "verified_user", title: "Professional Integrity", body: "All Abode operates with professional integrity in every client engagement, from inquiry to completion." },
  { icon: "lightbulb", title: "Client Clarity", body: "Clear communication, honest service scope, and straightforward process at every stage." },
  { icon: "support_agent", title: "Responsive Support", body: "Inquiries are acknowledged promptly and clients are kept informed throughout the process." },
  { icon: "insights", title: "Practical Expertise", body: "Licensed expertise applied to real property decisions — not generic advice or guesswork." },
  { icon: "diversity_3", title: "Long-Term Trust", body: "Built on a commitment to professional service that clients can rely on over time." },
];

export default async function AboutPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHero
        eyebrow="About All Abode"
        title="Professional property support built on licensed expertise."
        subtitle="All Abode Property Solutions was created for clients who need more than a simple property listing — providing professional support across brokerage, leasing, property management, appraisal, and documentation."
        image={s(settings, "page_about_image") || undefined}
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
              All Abode Property Solutions was created for clients who need more
              than a simple property listing. The company provides brokerage,
              leasing, property management, appraisal, and documentation
              support for owners, investors, buyers, sellers, landlords,
              tenants, and appraisal clients in the Philippines.
            </p>
            <p>
              Led by a licensed Real Estate Broker and Real Estate Appraiser,
              All Abode combines professional guidance, organized coordination,
              and transparent service to help clients make better property
              decisions. Building on the trusted foundation of{" "}
              <strong className="text-navy">Properties by Chel</strong>, the
              company serves clients who need complete, professional property
              support in one place.
            </p>
          </div>
        </Container>
      </section>

      {/* Properties by Chel — founder's personal brand */}
      <section className="bg-surface-gray py-section">
        <Container className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-16">
          <div className="shrink-0">
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
              <p className="label-caps text-gold">Founded by Chel</p>
            </div>
          </div>
          <div className="max-w-xl">
            <p className="label-caps text-gold">About the Founder</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl">
              Properties by Chel
            </h2>
            <p className="mt-4 leading-relaxed text-slate">
              Properties by Chel is the personal real estate advisory and
              educational brand of Chel, founder of All Abode Property
              Solutions. It shares educational content and professional insights
              to help clients understand real estate topics — from leasing and
              buying, to property management and appraisal.
            </p>
            <p className="mt-3 leading-relaxed text-slate">
              All Abode Property Solutions serves as the main operating company
              for full-service property support: brokerage, leasing, property
              management, appraisal, and documentation.
            </p>
          </div>
        </Container>
      </section>

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
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
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
        title="Work with a professional property partner."
        body="Whether you are leasing, selling, managing, buying, renting, or requesting appraisal, All Abode can guide you to the right next step."
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
