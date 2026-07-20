import type { Metadata } from "next";
import Link from "next/link";
import { Button, Container } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PropertyCard } from "@/components/property-card";
import { Faq } from "@/components/faq";
import { AmbientHero, Reveal, StaggerGroup, StaggerItem } from "@/components/motion";

import { services, trustPoints, credentials, testimonials } from "@/lib/data";
import { faqSections } from "@/lib/faq-data";
import { getFeaturedListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

const homeTitle = "All Abode Property Solutions Philippines";
const homeDescription =
  "All Abode provides licensed real estate brokerage, valuation, leasing, property management, and documentation assistance in the Philippines.";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  openGraph: { title: homeTitle, description: homeDescription },
  alternates: { canonical: "/" },
};

const heroPrimaryCta = {
  icon: "list_alt",
  label: "List My Property",
  href: "/list-your-property",
};

const heroSecondaryLinks = [
  { icon: "search", label: "Find a Property", href: "/listings" },
  { icon: "analytics", label: "Request Valuation", href: "/valuation" },
];

const quickPaths = [
  { icon: "corporate_fare", title: "Get Property Management", href: "/property-solutions/property-management" },
  { icon: "history_edu", title: "Get Documentation Help", href: "/property-solutions/documentation-assistance" },
];

const audiences = [
  { title: "Property Owners", body: "Lease, manage, sell, value, or prepare your property with a team that can assist from listing to turnover." },
  { title: "Buyers", body: "Find properties that match your needs, budget, and preferred location." },
  { title: "Sellers", body: "Market your property properly and work with licensed real estate professionals throughout the transaction." },
  { title: "Tenants", body: "Find available rentals and get help with viewing, requirements, lease coordination, and move-in steps." },
  { title: "Investors", body: "Get support for leasing, valuation, management, and property-related decisions." },
];

const processSteps = [
  { n: "1", title: "Tell Us What You Need", body: "Choose whether you want to buy, sell, lease, manage, value, or request documentation assistance." },
  { n: "2", title: "Property or Requirement Review", body: "We review your property details, goals, location, documents, and preferred timeline." },
  { n: "3", title: "Recommended Path", body: "We recommend the right service path, whether it is brokerage, leasing, management, valuation, or documentation assistance." },
  { n: "4", title: "Coordination and Updates", body: "We assist with the necessary steps, keep communication clear, and provide updates throughout the process." },
  { n: "5", title: "Completion and Next Steps", body: "We help close the loop with turnover, documentation, reports, or continued management support when needed." },
];

const homeFaqs = faqSections.find((section) => section.id === "general")!.items;

export default async function Home() {
  const [featured, settings] = await Promise.all([
    getFeaturedListings(3),
    getSettings(),
  ]);
  const heroImage = s(settings, "hero_image");
  const heroImagePosition = s(settings, "hero_image_position") || "center";
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden bg-navy">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy via-navy-800 to-navy-700" />
        {heroImage && (
          <AmbientHero
            image={heroImage}
            position={heroImagePosition}
            className="absolute inset-0 -z-10 bg-no-repeat bg-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 -z-10 opacity-60 [background:radial-gradient(80%_60%_at_85%_15%,rgba(180,151,90,0.28),transparent_60%)]" />
        {heroImage && (
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy/70 via-navy/35 to-transparent sm:from-navy/60 sm:via-navy/20 sm:to-transparent" />
        )}

        <Container className="flex min-h-[72vh] flex-col justify-center pb-20 pt-32 md:pt-36">
          <div className="max-w-3xl">
            <Reveal y={16}>
              <span className="label-caps inline-block bg-gold/15 px-4 py-1.5 text-gold-soft ring-1 ring-gold/30">
                Real estate services in the Philippines
              </span>
            </Reveal>
            <Reveal y={20} delay={0.06}>
              <h1 className="mt-6 font-display text-display-sm font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-display">
                {s(settings, "hero_heading")}
              </h1>
            </Reveal>
            <Reveal y={20} delay={0.12}>
              <p className="mt-4 max-w-2xl font-display text-lg text-gold/90 sm:text-xl">
                {s(settings, "hero_subheading")}
              </p>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
                {s(settings, "hero_body")}
              </p>
            </Reveal>
            <Reveal y={16} delay={0.18}>
              <div className="mt-7 flex flex-col items-start gap-5 sm:mt-10">
                <Button
                  href={heroPrimaryCta.href}
                  variant="white"
                  size="lg"
                  className="min-h-12 w-full px-6 shadow-lg sm:w-auto sm:min-h-14"
                >
                  <Icon name={heroPrimaryCta.icon} size={20} />
                  <span className="whitespace-nowrap">{heroPrimaryCta.label}</span>
                </Button>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                  {heroSecondaryLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="group flex min-h-[44px] items-center gap-2 text-sm font-medium text-white/75 transition-colors hover:text-white"
                    >
                      <Icon name={link.icon} size={16} />
                      {link.label}
                      <Icon
                        name="arrow_forward"
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ---------- Quick paths — inline row, not a card grid ---------- */}
      <section className="border-b border-line bg-surface">
        <Container>
          <StaggerGroup
            as="ul"
            className="flex flex-col divide-y divide-line sm:flex-row sm:divide-x sm:divide-y-0"
          >
            {quickPaths.map((card) => (
              <StaggerItem as="li" key={card.title} className="flex-1">
                <Link
                  href={card.href}
                  className="group flex items-center gap-3 px-1 py-5 transition-colors hover:text-gold-ink sm:justify-center sm:px-4"
                >
                  <Icon name={card.icon} size={18} className="shrink-0 text-gold-ink" />
                  <span className="font-display text-sm font-semibold text-navy group-hover:text-gold-ink">
                    {card.title}
                  </span>
                  <Icon
                    name="arrow_forward"
                    size={14}
                    className="shrink-0 text-slate-soft transition-transform group-hover:translate-x-0.5 group-hover:text-gold-ink"
                  />
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* ---------- What We Do — a numbered list, not a card grid ---------- */}
      <section className="py-section-lg">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <Reveal>
            <p className="label-caps text-gold-ink">What We Do</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              Real estate services in one place
            </h2>
            <p className="mt-4 text-slate">
              All Abode brings together the real estate services that property
              owners and clients commonly need, so you can move forward with
              the right guidance and a clearer process.
            </p>
          </Reveal>

          <StaggerGroup as="ul" className="flex flex-col divide-y divide-line border-t border-line">
            {services.map((service) => (
              <StaggerItem as="li" key={service.slug}>
                <Link
                  href={service.href}
                  className="group grid grid-cols-[3rem_1fr_auto] items-center gap-5 py-6 transition-colors hover:bg-surface-gray sm:grid-cols-[3.5rem_1fr_auto]"
                >
                  <span className="flex h-11 w-11 items-center justify-center bg-navy/5 text-navy-700">
                    <Icon name={service.icon} size={22} />
                  </span>
                  <span>
                    <span className="font-display text-lg font-semibold text-navy sm:text-xl">
                      {service.title}
                    </span>
                    <span className="mt-1 block max-w-2xl text-sm leading-relaxed text-slate">
                      {service.blurb}
                    </span>
                  </span>
                  <Icon
                    name="arrow_forward"
                    size={20}
                    className="hidden shrink-0 text-gold-ink transition-transform group-hover:translate-x-1 sm:block"
                  />
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* ---------- Who We Help — flowing typographic list, not icon cards ---------- */}
      <section className="bg-navy py-section text-white">
        <Container>
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Built for owners, buyers, sellers, tenants, and investors
            </h2>
            <p className="mt-4 text-white/70">
              Real estate decisions can involve many moving parts. All Abode
              helps different clients move through the process with less
              confusion and better support.
            </p>
          </Reveal>
          <StaggerGroup
            as="ul"
            className="mt-12 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-5"
          >
            {audiences.map((a) => (
              <StaggerItem as="li" key={a.title} className="border-t border-white/15 pt-5">
                <h3 className="font-display text-lg font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{a.body}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* ---------- Featured Listings ---------- */}
      <section className="py-section">
        <Container>
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold text-navy sm:text-4xl">
                Featured properties
              </h2>
              <p className="mt-3 max-w-xl text-slate">
                Explore selected properties for rent, sale, commercial use,
                office use, industrial use, and parking. All listings are
                subject to availability and verification at the time of inquiry.
              </p>
            </div>
            <Link
              href="/listings"
              className="label-caps flex items-center gap-2 border-b-2 border-navy pb-1 text-navy transition-colors hover:border-gold-ink hover:text-gold-ink"
            >
              View All Listings
              <Icon name="arrow_forward" size={18} />
            </Link>
          </Reveal>

          <StaggerGroup className="mt-12 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing) => (
              <StaggerItem key={listing.id} className="h-full">
                <PropertyCard listing={listing} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* ---------- Why Choose All Abode ---------- */}
      <section className="bg-surface-gray py-section">
        <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-3xl font-bold leading-tight text-navy sm:text-4xl">
              Why work with All Abode
            </h2>
            <p className="mt-6 max-w-xl text-slate">
              All Abode combines local property experience, licensed real
              estate practice, and practical day-to-day support. We help
              clients handle real estate matters with clear communication,
              organized documentation, and a service approach built around
              real needs.
            </p>
            <Button href="/about" variant="secondary" size="lg" className="mt-8">
              Learn More About All Abode
            </Button>
          </Reveal>

          <StaggerGroup className="flex flex-col divide-y divide-line border-y border-line">
            {trustPoints.map((point) => (
              <StaggerItem key={point.title}>
                <div className="flex gap-5 py-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-navy/5 text-navy-700">
                    <Icon name={point.icon} size={22} />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-semibold text-navy">{point.title}</h3>
                    <p className="mt-1.5 text-sm text-slate">{point.body}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* ---------- Licensed & Trusted — credentials + testimonials ---------- */}
      <section className="py-section">
        <Container>
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-navy sm:text-4xl">
              Licensed and trusted
            </h2>
          </Reveal>

          <StaggerGroup
            as="ul"
            className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-y border-line py-5 text-sm text-slate"
          >
            {credentials.map((c) => (
              <StaggerItem as="li" key={c.label}>
                <span className="font-semibold text-navy">{c.label}:</span> {c.value}
              </StaggerItem>
            ))}
          </StaggerGroup>

          <StaggerGroup
            as="ul"
            className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-12 sm:divide-x sm:divide-line"
          >
            {testimonials.map((t) => (
              <StaggerItem as="li" key={t.name} className="sm:first:pr-12 sm:last:pl-12">
                <Icon name="verified_user" size={28} className="text-gold-ink" />
                <p className="mt-3 text-lg leading-relaxed text-navy">{t.quote}</p>
                <p className="label-caps mt-4 text-slate">
                  {t.name}, {t.role}
                </p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* ---------- How It Works — connected timeline, not a card grid ---------- */}
      <section className="py-section">
        <Container>
          <Reveal className="max-w-2xl">
            <p className="label-caps text-gold-ink">Our Process</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              How it works
            </h2>
          </Reveal>
          <StaggerGroup
            as="ol"
            className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5"
          >
            {processSteps.map((step) => (
              <StaggerItem as="li" key={step.n} className="relative pl-9">
                <span className="absolute left-0 top-0 font-display text-sm font-bold text-gold-ink">
                  {step.n}
                </span>
                <span className="absolute left-1.5 top-6 bottom-[-2.5rem] hidden w-px bg-line lg:block" />
                <h3 className="font-display text-base font-semibold text-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">{step.body}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* ---------- FAQ preview ---------- */}
      <section className="bg-surface-gray py-section">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-navy sm:text-4xl">
              Frequently asked questions
            </h2>
          </Reveal>
          <Reveal className="mt-12 mx-auto max-w-3xl">
            <Faq items={homeFaqs} />
            <div className="mt-8 text-center">
              <Button href="/faq" variant="ghost">
                View All FAQs
                <Icon name="arrow_forward" size={18} />
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="bg-navy py-section text-white">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to get help with your property?
            </h2>
            <p className="mt-5 text-lg text-white/70">
              Tell us what you need and our team will guide you to the right
              service.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Button href="/list-your-property" size="lg" variant="gold">
                List My Property
              </Button>
              <Button href="/contact" size="lg" variant="ghost-light">
                Contact All Abode
              </Button>
              <Button href="/valuation" size="lg" variant="ghost-light">
                Request Valuation
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
