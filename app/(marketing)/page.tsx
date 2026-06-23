import Link from "next/link";
import { Button, Container } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PropertyCard } from "@/components/property-card";
import { Faq } from "@/components/faq";

import { services, trustPoints } from "@/lib/data";
import { getFeaturedListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

const heroCtas = [
  { icon: "list_alt", label: "List Your Property", href: "/list-your-property", variant: "primary" as const },
  { icon: "analytics", label: "Request an Appraisal", href: "/appraisal", variant: "secondary" as const },
  { icon: "search", label: "View Listings", href: "/listings", variant: "ghost-light" as const },
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

        <Container className="flex min-h-[78vh] flex-col justify-center py-20">
          <div className="max-w-3xl">
            <span className="label-caps inline-block bg-gold/15 px-4 py-1.5 text-gold-soft ring-1 ring-gold/30">
              Complete property services in the Philippines
            </span>
            <h1 className="mt-6 font-display text-[2.5rem] font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              {s(settings, "hero_heading")}
            </h1>
            <p className="mt-4 font-display text-xl text-gold/90">
              {s(settings, "hero_subheading")}
            </p>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
              {s(settings, "hero_body")}
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
                  {service.cta ?? "Learn more"}
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
            <span className="label-caps text-gold">Why All Abode</span>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
              Complete property support, not just listings.
            </h2>
            <p className="mt-6 max-w-xl text-white/70">
              All Abode is designed for clients who need professional support
              before, during, and after a property transaction. We combine
              brokerage, leasing, property management, and appraisal expertise
              so your property needs are handled through one coordinated service
              partner.
            </p>
            <Button
              href="/about"
              variant="secondary"
              size="lg"
              className="mt-8"
            >
              Learn More About All Abode
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
              <p className="label-caps text-gold">Featured Properties</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
                Featured properties
              </h2>
              <p className="mt-3 max-w-xl text-slate">
                Browse selected properties for lease or sale. Listing details
                are subject to verification and availability.
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
              Property support for owners, investors, and OFWs
            </h2>
            <p className="mt-4 text-slate">
              If you need help managing tenants, rent updates, maintenance
              coordination, or multiple properties, All Abode can provide
              structured property management support based on your needs.
            </p>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: "fact_check", label: "Tenant coordination" },
                { icon: "account_balance_wallet", label: "Rent monitoring" },
                { icon: "build", label: "Maintenance coordination" },
                { icon: "summarize", label: "Owner reports" },
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
              { icon: "apartment", title: "Property onboarding", label: "to listing-ready" },
              { icon: "people", title: "Tenant coordination", label: "inquiries handled" },
              { icon: "build", title: "Maintenance", label: "coordination support" },
              { icon: "summarize", title: "Owner reporting", label: "regular updates" },
            ].map((c) => (
              <div key={c.label} className="bg-surface p-7">
                <span className="flex h-11 w-11 items-center justify-center bg-navy/5 text-navy-700">
                  <Icon name={c.icon} size={24} />
                </span>
                <p className="mt-4 font-display text-base font-bold text-navy">
                  {c.title}
                </p>
                <p className="mt-1 text-sm text-slate">{c.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------- Appraisal preview ---------- */}
      <section className="bg-surface-gray py-section">
        <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="label-caps text-gold">Appraisal Services</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              Formal appraisal support for informed decisions
            </h2>
            <p className="mt-4 text-slate">
              A formal appraisal is different from an informal market estimate.
              All Abode helps clients clarify appraisal purpose, document
              requirements, inspection needs, and next steps.
            </p>
            <Button href="/appraisal" className="mt-8">
              Request an Appraisal
            </Button>
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {[
              { icon: "home", label: "Residential" },
              { icon: "corporate_fare", label: "Commercial" },
              { icon: "landscape", label: "Land" },
              { icon: "gavel", label: "Estate & Legal" },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-3 bg-surface p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-navy/5 text-navy-700">
                  <Icon name={c.icon} size={22} />
                </span>
                <span className="font-medium text-navy">{c.label}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="bg-navy py-section text-white">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <p className="label-caps text-gold">Get Started</p>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
              Tell us what property support you need.
            </h2>
            <p className="mt-5 text-lg text-white/70">
              Whether you are leasing, selling, managing, buying, renting, or
              requesting appraisal, All Abode can guide you to the right next
              step.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Button href="/contact" size="lg" variant="gold">
                Contact All Abode
              </Button>
              <Button href="/listings" size="lg" variant="ghost-light">
                View Listings
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="py-section">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <p className="label-caps text-gold">Questions</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <div className="mt-12 mx-auto max-w-3xl">
            <Faq items={[
              {
                q: "What services does All Abode Property Solutions offer?",
                a: "All Abode offers brokerage, leasing, property management, and appraisal support in the Philippines.",
              },
              {
                q: "Is All Abode only a listing website?",
                a: "No. Listings are part of the website, but the company is a full-service property support brand.",
              },
              {
                q: "Can owners list properties for lease or sale?",
                a: "Yes. Owners can submit property details through the List Your Property form.",
              },
              {
                q: "Can I request a formal appraisal?",
                a: "Yes. Formal appraisal support is available subject to property details, purpose, documentation, and professional scope confirmation.",
              },
            ]} />
          </div>
        </Container>
      </section>
    </>
  );
}
