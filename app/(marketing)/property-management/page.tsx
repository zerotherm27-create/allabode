import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, FeatureItem } from "@/components/sections";
import { Faq } from "@/components/faq";
import { PropertyManagementForm } from "@/components/forms/lead-forms";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Property Management Philippines | Rental Property Owner Support",
  description:
    "All Abode PH helps condo owners lease, maintain, and manage their units — Full Leasing & Property Management, Tenant Hunting, Vacant Unit Management, Furnishing & Rental-Ready Setup, and Owner Assistance packages.",
};

const whyChoose = [
  { icon: "location_on", title: "Local, Hands-On Support", body: "On-the-ground assistance for property owners who need a reliable team to look after their unit." },
  { icon: "hub", title: "Leasing & Management in One Place", body: "From finding a tenant to coordinating maintenance, we help simplify the entire ownership experience." },
  { icon: "tune", title: "Personalized Owner Service", body: "Every property is different — we tailor our service to your unit, location, tenant type, and preferred level of involvement." },
  { icon: "auto_awesome", title: "Better Rental Readiness", body: "We help owners prepare their units so they look presentable, functional, and competitive in the rental market." },
];

const packages = [
  {
    icon: "home_work",
    name: "Full Leasing & Property Management",
    summary: "For owners who want a hands-off property ownership experience.",
    description: "Our full-service management package covers the leasing process and ongoing tenant coordination — ideal for owners based abroad, busy professionals, investors, or anyone who wants a reliable local team to manage the unit.",
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
    description: "A vacant unit still needs care. We monitor your property while it's unoccupied, coordinate cleaning or repairs, check bill status, and keep the unit ready for future lease, sale, or owner use.",
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
    description: "We assist with selected owner errands and property-related payments — bills payment coordination, real property tax payment assistance, association dues monitoring, maintenance scheduling, and move-in/move-out documentation.",
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
  { n: "1", title: "Property Assessment", body: "We review your unit, location, condition, target tenant, and rental goals, and identify what needs repair, cleaning, furnishing, or preparation before listing." },
  { n: "2", title: "Rental Preparation", body: "We help prepare the property for listing through cleaning, maintenance coordination, furnishing recommendations, and photo-ready setup." },
  { n: "3", title: "Listing & Marketing", body: "We create and promote your property listing across relevant rental channels to attract qualified tenant inquiries." },
  { n: "4", title: "Viewings & Tenant Screening", body: "We coordinate viewing schedules, answer tenant questions, and assist with tenant screening before lease finalization." },
  { n: "5", title: "Lease & Move-In Support", body: "We assist with lease coordination, move-in documentation, turnover checks, and building requirements." },
  { n: "6", title: "Ongoing Management", body: "For full management clients, we continue to assist with rent monitoring, tenant concerns, maintenance coordination, bills tracking, and regular owner updates." },
];

const faqs = [
  { q: "What does property management include?", a: "It depends on the package: full leasing and ongoing management, tenant-hunting only, vacant-unit care, furnishing and rental-ready setup, or owner assistance with bills and documentation — scaled to how hands-on you want to be." },
  { q: "Do owners get reports?", a: "Yes. Every managed property receives transparent owner updates covering rent collection, occupancy, and unit condition, with an owner portal planned for live access." },
  { q: "Can you manage units for OFWs?", a: "Absolutely — remote and overseas owners are a core focus. We handle everything on the ground and keep you updated wherever you are." },
  { q: "Do you handle maintenance coordination?", a: "We dispatch and supervise vetted contractors for repairs, cleaning, and pest control, with your approval on significant expenses." },
];

export default async function PropertyManagementPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHero
        eyebrow="Property Management"
        title="Your property, managed with care."
        subtitle="All Abode PH helps property owners lease, maintain, and manage their condominium units with less stress and more confidence — whether your unit is occupied, vacant, newly turned over, or ready for leasing."
        image={s(settings, "page_pm_image") || undefined}
      >
        <Button href="#proposal" size="lg" variant="ghost-light">
          Request a Proposal
        </Button>
      </PageHero>

      {/* Why choose us */}
      <section className="py-section">
        <Container>
          <SectionHeading
            eyebrow="Why Choose All Abode PH"
            title="A local partner for your property, from lease to upkeep"
            lead="From tenant sourcing and viewings to rent coordination, bills monitoring, maintenance, move-in support, and owner updates, we handle the details so you can focus on your investment."
          />
          <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-9 sm:grid-cols-2">
            {whyChoose.map((w) => (
              <FeatureItem key={w.title} {...w} />
            ))}
          </div>
        </Container>
      </section>

      {/* Packages */}
      <section className="bg-surface-gray py-section">
        <Container>
          <SectionHeading
            eyebrow="Our Property Management Packages"
            title="Choose the level of support that fits your unit"
            lead="Every property is different — pick the package that matches your unit, location, and how involved you want to be."
          />
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {packages.map((p, i) => (
              <div
                key={p.name}
                className={`flex flex-col border bg-surface p-7 ${
                  p.featured
                    ? "border-gold shadow-[var(--shadow-card)]"
                    : "border-line"
                } ${i === packages.length - 1 && packages.length % 2 === 1 ? "md:col-span-2" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-navy/5 text-navy-700">
                    <Icon name={p.icon} size={24} />
                  </span>
                  {p.featured && (
                    <span className="label-caps bg-gold/15 px-3 py-1 text-gold-bright">
                      Most Popular
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-navy">{p.name}</h3>
                <p className="mt-2 text-sm font-semibold text-gold-bright">{p.summary}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate">{p.description}</p>
                <p className="label-caps mt-5 text-slate">Included Services</p>
                <ul className="mt-3 flex flex-1 flex-col gap-2.5 border-t border-line pt-4 text-sm text-slate">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Icon name="check" size={18} className="mt-0.5 shrink-0 text-gold" />
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
            ))}
          </div>
        </Container>
      </section>

      {/* Process */}
      <section className="py-section">
        <Container>
          <SectionHeading
            eyebrow="How Our Process Works"
            title="From assessment to ongoing management"
          />
          <ol className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {process.map((step) => (
              <li key={step.n} className="bg-surface p-7">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                  {step.n}
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-navy">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Owner portal preview */}
      <section className="bg-navy py-section text-white">
        <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="label-caps text-gold">Owner Portal Preview</span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
              Your portfolio, transparent at a glance
            </h2>
            <p className="mt-6 max-w-xl text-white/70">
              Managed owners get a live view of every property — rent collected,
              occupancy, upcoming lease renewals, maintenance status, and
              downloadable monthly reports. No more chasing updates.
            </p>
            <ul className="mt-6 flex flex-col gap-3 text-sm text-white/80">
              {[
                "Real-time rental income & occupancy",
                "Maintenance requests & status",
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
              Owner portal access is included with Full Leasing & Property Management.
            </p>
          </div>
          {/* Dashboard teaser */}
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
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
              Rental income — last 6 months (illustrative)
            </p>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="bg-surface-gray py-section">
        <Container>
          <SectionHeading eyebrow="Management FAQ" title="Common questions" />
          <div className="mt-12">
            <Faq items={faqs} />
          </div>
        </Container>
      </section>

      {/* Proposal form */}
      <section id="proposal" className="scroll-mt-24 py-section">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <SectionHeading
            align="left"
            eyebrow="Request a Proposal"
            title="Tell us about your property"
            lead="Share a few details and our team will prepare a tailored management proposal — including recommended rent and the right service package."
          />
          <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
            <PropertyManagementForm />
          </div>
        </Container>
      </section>
    </>
  );
}
