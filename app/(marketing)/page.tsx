import Link from "next/link";
import { Button, Container } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PropertyCard } from "@/components/property-card";

import { services, trustPoints } from "@/lib/data";
import { getFeaturedListings } from "@/lib/listings";

const heroCtas = [
  { icon: "list_alt", label: "List Your Property", href: "/list-your-property", variant: "primary" as const },
  { icon: "analytics", label: "Request an Appraisal", href: "/appraisal", variant: "secondary" as const },
  { icon: "search", label: "View Listings", href: "/listings", variant: "ghost-light" as const },
];

export default async function Home() {
  const featured = await getFeaturedListings(3);
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden bg-navy">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy via-navy-800 to-navy-700" />
        <div className="absolute inset-0 -z-10 opacity-60 [background:radial-gradient(80%_60%_at_85%_15%,rgba(180,151,90,0.28),transparent_60%)]" />
        <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:64px_64px]" />

        <Container className="flex min-h-[78vh] flex-col justify-center py-20">
          <div className="max-w-3xl">
            <span className="label-caps inline-block bg-gold/15 px-4 py-1.5 text-gold-soft ring-1 ring-gold/30">
              Complete property services in the Philippines
            </span>
            <h1 className="mt-6 font-display text-[2.5rem] font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              Your property, professionally taken care of.
            </h1>
            <p className="mt-4 font-display text-xl text-gold/90">
              Brokerage, leasing, property management, and appraisal support
              through one trusted partner.
            </p>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
              All Abode Property Solutions helps owners, investors, buyers,
              sellers, tenants, and appraisal clients move through property
              decisions with clear guidance, organized coordination, and
              licensed professional expertise.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              {heroCtas.map((cta) => (
                <Button
                  key={cta.label}
                  href={cta.href}
                  variant={cta.variant}
                  size="lg"
                >
                  <Icon name={cta.icon} size={20} />
                  {cta.label}
                </Button>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- Services routing ---------- */}
      <section className="py-section">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <p className="label-caps text-gold">What we do</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              What do you need help with?
            </h2>
            <p className="mt-4 text-slate">
              Complete property support, not just listings. One coordinated
              service partner for brokerage, leasing, management, and appraisal.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <Link
                key={service.slug}
                href={service.href}
                className="group flex flex-col bg-surface p-8 transition-colors hover:bg-surface-gray"
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
                  Learn more
                  <Icon name="arrow_forward" size={16} />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------- Why Choose Us ---------- */}
      <section className="bg-navy py-section text-white">
        <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div>
            <div className="inline-flex flex-col border-l-2 border-gold pl-5">
              <span className="font-display text-4xl font-bold text-gold">
                15+
              </span>
              <span className="label-caps text-white/70">
                Years of Expertise
              </span>
            </div>
            <h2 className="mt-8 font-display text-3xl font-bold leading-tight sm:text-4xl">
              Licensed Credibility in a Competitive Market
            </h2>
            <p className="mt-6 max-w-xl text-white/70">
              At All Abode Property Solutions, we believe property decisions
              shouldn&apos;t be based on guesswork. Our team consists of
              PRC-Licensed Real Estate Brokers and Appraisers, ensuring that
              every piece of advice we give is backed by legal compliance and
              market data.
            </p>
            <Button
              href="/about"
              variant="secondary"
              size="lg"
              className="mt-8"
            >
              Learn More About Our Team
            </Button>
          </div>

          <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
            {trustPoints.map((point) => (
              <div
                key={point.title}
                className="flex gap-5 bg-navy p-7"
              >
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

      {/* ---------- Featured Listings ---------- */}
      <section className="bg-surface-gray py-section">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label-caps text-gold">Curated Selection</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
                Featured Listings
              </h2>
              <p className="mt-3 max-w-xl text-slate">
                A curated selection of premium residential and commercial
                spaces.
              </p>
            </div>
            <Link
              href="/listings"
              className="label-caps flex items-center gap-2 border-b-2 border-navy pb-1 text-navy transition-colors hover:border-gold hover:text-gold"
            >
              View All Listings
              <Icon name="arrow_forward" size={18} />
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing) => (
              <PropertyCard key={listing.id} listing={listing} />
            ))}
          </div>
        </Container>
      </section>

      {/* ---------- Property Management preview ---------- */}
      <section className="py-section">
        <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="label-caps text-gold">Property Management</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              Hands-off ownership, transparent reporting
            </h2>
            <p className="mt-4 text-slate">
              We place reliable tenants, collect rent, coordinate maintenance,
              and send you clear monthly reports — so your property earns without
              the day-to-day work. From a single condo to a full portfolio.
            </p>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: "fact_check", label: "Tenant screening" },
                { icon: "account_balance_wallet", label: "Rent monitoring" },
                { icon: "build", label: "Maintenance coordination" },
                { icon: "summarize", label: "Monthly owner reports" },
              ].map((f) => (
                <li key={f.label} className="flex items-center gap-2 text-sm text-slate">
                  <Icon name={f.icon} size={20} className="text-gold" />
                  {f.label}
                </li>
              ))}
            </ul>
            <Button href="/property-management" className="mt-8">
              Explore Property Management
            </Button>
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {[
              { icon: "apartment", stat: "Onboarding", label: "to market-ready" },
              { icon: "trending_up", stat: "Maximized", label: "occupancy & yield" },
              { icon: "verified_user", stat: "Compliant", label: "with RESA law" },
              { icon: "schedule", stat: "Time back", label: "in your week" },
            ].map((c) => (
              <div key={c.label} className="bg-surface p-7">
                <span className="flex h-11 w-11 items-center justify-center bg-navy/5 text-navy-700">
                  <Icon name={c.icon} size={24} />
                </span>
                <p className="mt-4 font-display text-xl font-bold text-navy">
                  {c.stat}
                </p>
                <p className="mt-1 text-sm text-slate">{c.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------- Appraisal CTA ---------- */}
      <section className="py-section-lg">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="flex justify-center text-navy-700">
              <Icon name="analytics" size={56} />
            </span>
            <h2 className="mt-6 font-display text-3xl font-bold text-navy sm:text-4xl">
              What is your property really worth?
            </h2>
            <p className="mt-4 text-lg text-slate">
              Get a professional, legally-compliant appraisal report from our
              licensed team of experts. Crucial for inheritance, bank loans, and
              selling at the right price.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Button href="/appraisal" size="lg">
                Start Appraisal Request
              </Button>
              <Button href="/appraisal" variant="ghost" size="lg">
                View Sample Report
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
