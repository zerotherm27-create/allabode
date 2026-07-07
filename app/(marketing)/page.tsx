import Link from "next/link";
import { Button, Container } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PropertyCard } from "@/components/property-card";
import { Faq } from "@/components/faq";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";

import { services, trustPoints } from "@/lib/data";
import { getFeaturedListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

const heroCtas = [
  { icon: "list_alt", label: "List My Property", href: "/list-your-property", variant: "primary" as const },
  { icon: "search", label: "Find a Property", href: "/listings", variant: "secondary" as const },
  { icon: "analytics", label: "Request Valuation", href: "/valuation", variant: "ghost-light" as const },
];

const actionCards = [
  {
    icon: "sell",
    title: "List My Property",
    body: "Lease out or sell your property with licensed support from listing to closing.",
    href: "/list-your-property",
  },
  {
    icon: "search",
    title: "Find a Property",
    body: "Browse rentals, resale units, commercial spaces, offices, and parking.",
    href: "/listings",
  },
  {
    icon: "analytics",
    title: "Request Valuation",
    body: "Get professional valuation and appraisal support for better decisions.",
    href: "/valuation",
  },
  {
    icon: "corporate_fare",
    title: "Get Property Management",
    body: "Let a local team handle rent, maintenance, and day-to-day property care.",
    href: "/property-solutions/property-management",
  },
];

const audiences = [
  { icon: "home_work", title: "Property Owners", body: "Lease, manage, sell, value, or prepare your property with a team that can assist from listing to turnover." },
  { icon: "search", title: "Buyers", body: "Find properties that match your needs, budget, and preferred location." },
  { icon: "sell", title: "Sellers", body: "Market your property properly and work with licensed real estate professionals throughout the transaction." },
  { icon: "key", title: "Tenants", body: "Find available rentals and get help with viewing, requirements, lease coordination, and move-in steps." },
  { icon: "trending_up", title: "Investors", body: "Get support for leasing, valuation, management, and property-related decisions." },
];

const processSteps = [
  { n: "1", title: "Tell Us What You Need", body: "Choose whether you want to buy, sell, lease, manage, value, or request documentation assistance." },
  { n: "2", title: "Property or Requirement Review", body: "We review your property details, goals, location, documents, and preferred timeline." },
  { n: "3", title: "Recommended Solution", body: "We recommend the right service path, whether it is brokerage, leasing, management, valuation, or documentation assistance." },
  { n: "4", title: "Coordination and Updates", body: "We assist with the necessary steps, keep communication clear, and provide updates throughout the process." },
  { n: "5", title: "Completion and Next Steps", body: "We help close the loop with turnover, documentation, reports, or continued management support when needed." },
];

const homeFaqs = [
  {
    q: "What services does All Abode offer?",
    a: "All Abode provides brokerage, valuation, leasing, property management, and documentation assistance in the Philippines.",
  },
  {
    q: "Is All Abode only a listing website?",
    a: "No. Listings are part of the website, but All Abode is a complete real estate solutions company for owners, buyers, sellers, tenants, and investors.",
  },
  {
    q: "Can owners list properties for lease or sale?",
    a: "Yes. Owners can submit property details through the List My Property form and our team will guide you through pricing, marketing, and the next steps.",
  },
  {
    q: "Can I request a formal appraisal?",
    a: "Yes. Valuation and appraisal support is available, with formal appraisal reports prepared by duly licensed real estate appraisers under a formal engagement.",
  },
];

export default async function Home() {
  const [featured, settings] = await Promise.all([
    getFeaturedListings(3),
    getSettings(),
  ]);
  const heroImage = s(settings, "hero_image");
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden bg-navy">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy via-navy-800 to-navy-700" />
        {heroImage && (
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
        )}
        <div className="absolute inset-0 -z-10 opacity-60 [background:radial-gradient(80%_60%_at_85%_15%,rgba(180,151,90,0.28),transparent_60%)]" />

        <Container className="flex min-h-[72vh] flex-col justify-center py-20">
          <div className="max-w-3xl">
            <Reveal y={16}>
              <span className="label-caps inline-block bg-gold/15 px-4 py-1.5 text-gold-soft ring-1 ring-gold/30">
                Complete property solutions in the Philippines
              </span>
            </Reveal>
            <Reveal y={20} delay={0.06}>
              <h1 className="mt-6 font-display text-[2.5rem] font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
                {s(settings, "hero_heading")}
              </h1>
            </Reveal>
            <Reveal y={20} delay={0.12}>
              <p className="mt-4 max-w-2xl font-display text-xl text-gold/90">
                {s(settings, "hero_subheading")}
              </p>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
                {s(settings, "hero_body")}
              </p>
            </Reveal>
            <Reveal y={16} delay={0.18}>
              <div className="mt-10 flex flex-wrap gap-3">
                {heroCtas.map((cta) => (
                  <Button key={cta.label} href={cta.href} variant={cta.variant} size="lg">
                    <Icon name={cta.icon} size={20} />
                    {cta.label}
                  </Button>
                ))}
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ---------- Action cards ---------- */}
      <section className="border-b border-line bg-surface">
        <Container>
          <StaggerGroup className="grid grid-cols-1 gap-px overflow-hidden bg-line sm:grid-cols-2 lg:grid-cols-4">
            {actionCards.map((card) => (
              <StaggerItem key={card.title}>
                <Link
                  href={card.href}
                  className="group flex h-full flex-col bg-surface p-7 transition-colors hover:bg-surface-gray"
                >
                  <span className="flex h-12 w-12 items-center justify-center bg-navy/5 text-navy-700 transition-colors group-hover:bg-gold/15 group-hover:text-gold-bright">
                    <Icon name={card.icon} size={26} />
                  </span>
                  <h2 className="mt-4 font-display text-base font-bold text-navy">
                    {card.title}
                  </h2>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate">{card.body}</p>
                  <span className="label-caps mt-4 flex items-center gap-1 text-gold transition-all group-hover:gap-2">
                    Get Started
                    <Icon name="arrow_forward" size={16} />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* ---------- What We Do ---------- */}
      <section className="py-section">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="label-caps text-gold">What We Do</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              Complete Property Solutions in One Place
            </h2>
            <p className="mt-4 text-slate">
              All Abode brings together the real estate services that property
              owners and clients commonly need. We assist with brokerage,
              leasing, valuation, property management, and documentation
              support, so you can move forward with the right guidance and a
              clearer process.
            </p>
          </Reveal>

          <StaggerGroup className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {services.map((service, i) => (
              <StaggerItem
                key={service.slug}
                className={
                  i === services.length - 1 && services.length % 2 === 1
                    ? "sm:col-span-2 lg:col-span-1"
                    : ""
                }
              >
                <Link
                  href={service.href}
                  className="group flex h-full flex-col bg-surface p-8 transition-colors hover:bg-surface-gray"
                >
                  <span className="flex h-12 w-12 items-center justify-center bg-navy/5 text-navy-700">
                    <Icon name={service.icon} size={28} />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold text-navy">
                    {service.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate">
                    {service.blurb}
                  </p>
                  <span className="label-caps mt-5 flex items-center gap-1 text-gold transition-all group-hover:gap-2">
                    {service.cta ?? "Learn more"}
                    <Icon name="arrow_forward" size={16} />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* ---------- Who We Help ---------- */}
      <section className="bg-surface-gray py-section">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="label-caps text-gold">Who We Help</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              Built for Owners, Buyers, Sellers, Tenants, and Investors
            </h2>
            <p className="mt-4 text-slate">
              Real estate decisions can involve many moving parts. All Abode
              helps different clients move through the process with less
              confusion and better support.
            </p>
          </Reveal>
          <StaggerGroup className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {audiences.map((a, i) => (
              <StaggerItem
                key={a.title}
                className={
                  i === audiences.length - 1 && audiences.length % 2 === 1
                    ? "sm:col-span-2 lg:col-span-1"
                    : ""
                }
              >
                <div className="flex h-full flex-col bg-surface p-7">
                  <span className="flex h-11 w-11 items-center justify-center bg-navy/5 text-navy-700">
                    <Icon name={a.icon} size={24} />
                  </span>
                  <h3 className="mt-4 font-display text-base font-semibold text-navy">
                    {a.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate">{a.body}</p>
                </div>
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
              <p className="label-caps text-gold">Featured Properties</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
                Featured Properties
              </h2>
              <p className="mt-3 max-w-xl text-slate">
                Explore selected properties for rent, sale, commercial use,
                office use, industrial use, and parking. All listings are
                subject to availability and verification at the time of inquiry.
              </p>
            </div>
            <Link
              href="/listings"
              className="label-caps flex items-center gap-2 border-b-2 border-navy pb-1 text-navy transition-colors hover:border-gold hover:text-gold"
            >
              View All Listings
              <Icon name="arrow_forward" size={18} />
            </Link>
          </Reveal>

          <StaggerGroup className="mt-12 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing) => (
              <StaggerItem key={listing.id}>
                <PropertyCard listing={listing} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* ---------- Why Choose All Abode ---------- */}
      <section className="bg-navy py-section text-white">
        <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <span className="label-caps text-gold">Why Choose All Abode</span>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
              Why Work With All Abode
            </h2>
            <p className="mt-6 max-w-xl text-white/70">
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

      {/* ---------- How It Works ---------- */}
      <section className="py-section">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="label-caps text-gold">Our Process</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              How It Works
            </h2>
          </Reveal>
          <StaggerGroup
            as="ol"
            className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-5"
          >
            {processSteps.map((step, i) => (
              <StaggerItem
                as="li"
                key={step.n}
                className={
                  i === processSteps.length - 1 && processSteps.length % 2 === 1
                    ? "sm:col-span-2 lg:col-span-1"
                    : ""
                }
              >
                <div className="h-full bg-surface p-7">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                    {step.n}
                  </span>
                  <h3 className="mt-4 font-display text-base font-semibold text-navy">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate">{step.body}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* ---------- FAQ preview ---------- */}
      <section className="bg-surface-gray py-section">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="label-caps text-gold">Questions</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
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
            <p className="label-caps text-gold">Get Started</p>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
              Ready to Get Help With Your Property?
            </h2>
            <p className="mt-5 text-lg text-white/70">
              Tell us what you need and our team will guide you to the right
              service.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Button href="/contact" size="lg" variant="gold">
                Contact All Abode
              </Button>
              <Button href="/list-your-property" size="lg" variant="ghost-light">
                List My Property
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
