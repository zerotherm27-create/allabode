import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, FeatureItem } from "@/components/sections";
import { Faq } from "@/components/faq";
import { PropertyManagementForm } from "@/components/forms/lead-forms";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { JsonLd, serviceSchema, breadcrumbSchema } from "@/components/seo/json-ld";
import { getSettings, s } from "@/lib/settings";

const title = "Property Management Services Philippines";
const description =
  "All Abode helps owners with rent collection, maintenance coordination, cleaning, furnishing, fit-out, turnover, and property care.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
  alternates: { canonical: "/property-solutions/property-management" },
};

const helpWith = [
  { icon: "account_balance_wallet", title: "Rent Collection and Owner Remittance", body: "We assist with rent collection monitoring, payment reminders, owner remittance coordination, and rent-related updates." },
  { icon: "build", title: "Maintenance and Cleaning Coordination", body: "We coordinate maintenance, repairs, cleaning, pest control, and other property care needs with approved service providers." },
  { icon: "chair", title: "Furnishing and Fit-Out Coordination", body: "We assist with furnishing, fit-out, improvement coordination, and rental-ready setup." },
  { icon: "moving", title: "Turnover Assistance", body: "We assist with move-in, move-out, inventory checks, key coordination, access cards, meter readings, and unit condition reports." },
  { icon: "meeting_room", title: "Vacant Unit Monitoring", body: "We assist owners with periodic checks, cleaning coordination, bill monitoring, and readiness for future leasing." },
  { icon: "receipt_long", title: "Bills, Dues, and Payment Assistance", body: "We assist with payment coordination for utilities, association dues, real property tax, and other property-related payments, subject to owner authorization." },
  { icon: "support_agent", title: "Tenant Coordination", body: "We assist with tenant concerns, building requirements, maintenance requests, reminders, and communication updates." },
];

const whoFor = [
  "Property owners based outside Metro Manila",
  "OFWs and overseas owners",
  "Investors with rental units",
  "Owners with vacant properties",
  "Busy professionals",
  "Owners who want organized local support",
];

const packages = [
  {
    icon: "home_work",
    name: "Full Leasing & Property Management",
    summary: "For owners who want a hands-off property ownership experience.",
    description: "Our full-service management package covers the leasing process and ongoing tenant coordination. Ideal for owners based abroad, busy professionals, investors, or anyone who wants a reliable local team to manage the unit.",
    features: [
      "Property listing and marketing",
      "Tenant inquiries and viewing coordination",
      "Tenant screening assistance",
      "Lease documentation coordination",
      "Move-in and move-out assistance",
      "Rent collection monitoring",
      "Bills and association dues monitoring",
      "Maintenance and repair coordination",
      "Cleaning and pest control coordination",
      "Owner updates and reporting",
    ],
    featured: true,
  },
  {
    icon: "search",
    name: "Tenant Hunting: We Lease, You Manage",
    summary: "For owners who only need help finding a tenant.",
    description: "We market your property, handle inquiries, schedule viewings, assist with tenant screening, and coordinate the move-in process. Once the tenant is secured and moved in, you take over the ongoing management.",
    features: [
      "Rental pricing guidance",
      "Property listing and promotion",
      "Lead handling and viewing assistance",
      "Tenant screening assistance",
      "Lease coordination",
      "Move-in documentation support",
    ],
    featured: false,
  },
  {
    icon: "meeting_room",
    name: "Vacant Unit Management",
    summary: "For owners who want their empty unit monitored and maintained.",
    description: "A vacant unit still needs care. We monitor your property while it is unoccupied, coordinate cleaning or repairs, check bill status, and keep the unit ready for future lease, sale, or owner use.",
    features: [
      "Periodic unit checks",
      "Cleaning coordination",
      "Utility and bill monitoring",
      "Maintenance reporting",
      "Key coordination",
      "Preparation for future viewings",
    ],
    featured: false,
  },
  {
    icon: "chair",
    name: "Furnishing & Rental-Ready Setup",
    summary: "For owners who want to improve the unit's rental appeal.",
    description: "We assist with furniture sourcing, minor repairs, styling, and renovation coordination to help make your unit more attractive to potential tenants.",
    features: [
      "Furniture and appliance sourcing assistance",
      "Minor repair coordination",
      "Cleaning and turnover preparation",
      "Renovation coordination",
      "Rental-readiness recommendations",
    ],
    featured: false,
  },
  {
    icon: "support_agent",
    name: "Owner Assistance Services",
    summary: "For owners who need help with property-related admin tasks.",
    description: "We assist with selected owner errands and property-related payments: bills payment coordination, real property tax payment assistance, association dues monitoring, maintenance scheduling, and move-in and move-out documentation.",
    features: [
      "Bills payment coordination",
      "Real property tax payment assistance",
      "Association dues monitoring",
      "Maintenance scheduling",
      "Move-in / move-out documentation",
    ],
    featured: false,
  },
];

const process = [
  { n: "1", title: "Owner Consultation", body: "We discuss your property, current tenant status, goals, concerns, and preferred level of involvement." },
  { n: "2", title: "Property Assessment", body: "We review the condition of the property, documents, furnishing, repairs, building rules, and management requirements." },
  { n: "3", title: "Service Setup", body: "We prepare the scope of work, owner authorization, reporting process, payment handling, and service terms." },
  { n: "4", title: "Rental Preparation", body: "When the unit needs it, we help prepare it for listing through cleaning, maintenance coordination, furnishing recommendations, and photo-ready setup." },
  { n: "5", title: "Active Management", body: "We assist with tenant coordination, rent monitoring, maintenance, cleaning, bills, and owner updates." },
  { n: "6", title: "Regular Updates", body: "We keep records and provide updates so the owner remains informed wherever they are." },
];

const faqs = [
  { q: "What does property management include?", a: "It depends on the package: full leasing and ongoing management, tenant-hunting only, vacant-unit care, furnishing and rental-ready setup, or owner assistance with bills and documentation, scaled to how hands-on you want to be." },
  { q: "Do owners get reports?", a: "Yes. Every managed property receives transparent owner updates covering rent collection, occupancy, and unit condition, with an owner portal for live access." },
  { q: "Can you manage units for OFWs?", a: "Absolutely. Remote and overseas owners are a core focus. We handle everything on the ground and keep you updated wherever you are." },
  { q: "Who approves repairs?", a: "The property owner approves repairs unless there is a prior written agreement for small urgent items within an approved limit." },
];

export default async function PropertyManagementPage() {
  const settings = await getSettings();
  return (
    <>
      <JsonLd data={serviceSchema({ name: "Property Management Services", description: "Rent collection, maintenance coordination, cleaning, furnishing, fit-out, turnover, and property care for owners.", path: "/property-solutions/property-management" })} />
      <JsonLd data={breadcrumbSchema([{ label: "Home", href: "/" }, { label: "Services", href: "/property-solutions" }, { label: "Property Management" }])} />
      <PageHero
        eyebrow="For Owners"
        title="Property Management"
        subtitle="Owning property should not mean handling every concern alone. All Abode helps property owners manage the day-to-day needs of their units, from rent coordination and maintenance to cleaning, furnishing, turnover, and owner updates. This service is ideal for busy owners, investors, OFWs, and owners who want local support for their property."
        image={s(settings, "page_pm_image") || undefined}
        imagePosition={s(settings, "page_pm_image_position")}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Services", href: "/property-solutions" },
          { label: "Property Management" },
        ]}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href="#proposal" size="lg" variant="ghost-light">
            Get Property Management
          </Button>
          <Button href="/list-your-property" size="lg" variant="ghost-light">
            List My Property
          </Button>
        </div>
      </PageHero>

      {/* What we can help with */}
      <section className="py-section">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="What We Can Help With"
              title="Day-to-day property care, handled"
              lead="From tenant sourcing and viewings to rent coordination, bills monitoring, maintenance, move-in support, and owner updates, we handle the details so you can focus on your investment."
            />
          </Reveal>
          <StaggerGroup className="mt-12 grid grid-cols-1 gap-x-12 gap-y-9 sm:grid-cols-2">
            {helpWith.map((w) => (
              <StaggerItem key={w.title}>
                <FeatureItem {...w} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* Who this is for */}
      <section className="bg-surface-gray py-section">
        <Container className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="Who This Is For"
              title="Local support for owners who need it"
            />
          </Reveal>
          <StaggerGroup as="ul" className="flex flex-col gap-3">
            {whoFor.map((w) => (
              <StaggerItem as="li" key={w}>
                <div className="flex items-start gap-3 text-slate">
                  <Icon name="check_circle" size={20} className="mt-0.5 shrink-0 text-gold-ink" fill={1} />
                  <span>{w}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* Packages */}
      <section className="py-section">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Our Property Management Packages"
              title="Choose the level of support that fits your unit"
              lead="Every property is different. Pick the package that matches your unit, location, and how involved you want to be."
            />
          </Reveal>
          <StaggerGroup className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {packages.map((p, i) => (
              <StaggerItem
                key={p.name}
                className={i === packages.length - 1 && packages.length % 2 === 1 ? "md:col-span-2" : ""}
              >
                <div
                  className={`flex h-full flex-col border bg-surface p-7 ${
                    p.featured
                      ? "border-gold shadow-[var(--shadow-card)]"
                      : "border-line"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-navy/5 text-navy-700">
                      <Icon name={p.icon} size={24} />
                    </span>
                    {p.featured && (
                      <span className="label-caps bg-gold/15 px-3 py-1 text-gold-ink">
                        Most Popular
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-navy">{p.name}</h3>
                  <p className="mt-2 text-sm font-semibold text-gold-ink">{p.summary}</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate">{p.description}</p>
                  <p className="label-caps mt-5 text-slate">Included Services</p>
                  <ul className="mt-3 flex flex-1 flex-col gap-2.5 border-t border-line pt-4 text-sm text-slate">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Icon name="check" size={18} className="mt-0.5 shrink-0 text-gold-ink" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    href="#proposal"
                    variant={p.featured ? "primary" : "ghost"}
                    className="mt-6 w-full"
                  >
                    Get Started
                  </Button>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* Process */}
      <section className="bg-surface-gray py-section">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Our Property Management Process"
              title="From consultation to ongoing management"
            />
          </Reveal>
          <StaggerGroup
            as="ol"
            className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3"
          >
            {process.map((step) => (
              <StaggerItem as="li" key={step.n}>
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
          <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-slate">
            Property management services are subject to owner authorization,
            building rules, tenant agreements, and applicable laws. Legal
            action, tax advice, and specialized professional services are
            coordinated with duly authorized professionals when needed.
          </p>
        </Container>
      </section>

      {/* Owner portal preview */}
      <section className="bg-navy py-section text-white">
        <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="label-caps text-gold">Owner Portal Preview</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
              Your portfolio, transparent at a glance
            </h2>
            <p className="mt-6 max-w-xl text-white/70">
              Managed owners get a live view of every property: rent collected,
              occupancy, upcoming lease renewals, maintenance status, and
              downloadable monthly reports. No more chasing updates.
            </p>
            <ul className="mt-6 flex flex-col gap-3 text-sm text-white/80">
              {[
                "Real-time rental income and occupancy",
                "Maintenance requests and status",
                "Monthly financial statements",
                "Lease renewal reminders",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Icon name="check_circle" size={18} className="text-gold" fill={1} />
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-white/50">
              Owner portal access is included with Full Leasing &amp; Property Management.
            </p>
          </Reveal>
          {/* Dashboard teaser */}
          <Reveal className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-semibold text-white">
                Portfolio Overview
              </p>
              <span className="label-caps text-gold">This month</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { k: "Units", v: "12" },
                { k: "Occupancy", v: "92%" },
                { k: "Collected", v: "₱1.4M" },
              ].map((s) => (
                <div key={s.k} className="rounded-md bg-white/[0.04] p-4">
                  <p className="font-display text-xl font-bold text-white">{s.v}</p>
                  <p className="mt-1 text-xs text-white/60">{s.k}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-end gap-2">
              {[40, 62, 55, 78, 70, 92].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-gold/40 to-gold"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-white/40">
              Rental income, last 6 months (illustrative)
            </p>
          </Reveal>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-section">
        <Container>
          <SectionHeading eyebrow="Management FAQ" title="Common questions" />
          <div className="mt-12">
            <Faq items={faqs} />
          </div>
        </Container>
      </section>

      {/* Proposal form */}
      <section id="proposal" className="scroll-mt-24 bg-surface-gray py-section">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <SectionHeading
            align="left"
            eyebrow="Get Property Management"
            title="Tell us about your property"
            lead="Share a few details and our team will prepare a tailored management proposal, including recommended rent and the right service package."
          />
          <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
            <PropertyManagementForm />
          </div>
        </Container>
      </section>
    </>
  );
}
