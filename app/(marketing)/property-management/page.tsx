import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, FeatureItem } from "@/components/sections";
import { Faq } from "@/components/faq";
import { PropertyManagementForm } from "@/components/forms/lead-forms";

export const metadata: Metadata = {
  title: "Property Management",
  description:
    "Full-service property management with transparent owner access — onboarding, tenant screening, rent monitoring, maintenance coordination, and owner reporting across the Philippines.",
};

const handled = [
  { icon: "apartment", title: "Property Onboarding", body: "Inspection, documentation, and listing setup to get your unit market-ready." },
  { icon: "payments", title: "Rental Pricing Advice", body: "Data-driven rent recommendations based on current market comparables." },
  { icon: "campaign", title: "Listing & Marketing", body: "Professional listings distributed across the channels that reach qualified tenants." },
  { icon: "fact_check", title: "Tenant Screening", body: "Background, employment, and reference checks on every applicant." },
  { icon: "handshake", title: "Lease Coordination", body: "Contract preparation, signing, and renewals handled for you." },
  { icon: "account_balance_wallet", title: "Rent Monitoring", body: "Collection tracking with timely follow-up on arrears." },
  { icon: "build", title: "Maintenance Coordination", body: "Vetted contractors dispatched and supervised for repairs and upkeep." },
  { icon: "summarize", title: "Owner Reports", body: "Clear monthly statements on income, occupancy, and unit condition." },
];

const packages = [
  {
    name: "Basic Leasing Support",
    summary: "Placement-only for hands-on owners.",
    features: ["Tenant screening", "Lease documentation", "Move-in coordination"],
    featured: false,
  },
  {
    name: "Standard Management",
    summary: "Day-to-day management for a single unit.",
    features: ["Everything in Basic", "Rent collection & monitoring", "Maintenance coordination", "Monthly owner reports"],
    featured: true,
  },
  {
    name: "Full Management",
    summary: "Complete, hands-off ownership.",
    features: ["Everything in Standard", "Marketing & re-leasing", "Move-out documentation", "Priority support"],
    featured: false,
  },
  {
    name: "Investor Portfolio",
    summary: "Multi-unit and OFW investors.",
    features: ["Everything in Full", "Portfolio reporting", "Dedicated account manager", "CRM / client access"],
    featured: false,
  },
];

const faqs = [
  { q: "What does property management include?", a: "Onboarding, pricing, marketing, tenant screening, lease coordination, rent monitoring, maintenance, move-in/out documentation, and monthly owner reports — scaled to the package you choose." },
  { q: "Do owners get reports?", a: "Yes. Every managed property receives transparent monthly statements covering rent collection, occupancy, and unit condition, with an owner portal planned for live access." },
  { q: "Can you manage units for OFWs?", a: "Absolutely — remote and overseas owners are a core focus. We handle everything on the ground and keep you updated wherever you are." },
  { q: "Do you handle maintenance coordination?", a: "We dispatch and supervise vetted contractors for repairs and upkeep, with your approval on significant expenses." },
];

export default function PropertyManagementPage() {
  return (
    <>
      <PageHero
        eyebrow="Property Management"
        title="Full-service property management with transparent owner access."
        subtitle="Hand your property to a licensed team that protects your asset, places reliable tenants, and reports to you clearly — every month, without the day-to-day stress."
      >
        <Button href="#proposal" size="lg" variant="ghost-light">
          Request a Proposal
        </Button>
      </PageHero>

      {/* Why management */}
      <section className="py-section">
        <Container className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <SectionHeading
            align="left"
            eyebrow="Why Owners Choose Management"
            title="Ownership without the operational burden"
            lead="Vacancy, late rent, problem tenants, and maintenance headaches erode returns. Professional management turns your property into a genuinely passive asset — protected by licensed expertise and Philippine rental law."
          />
          <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {[
              { icon: "trending_up", stat: "Maximized", label: "occupancy & rental yield" },
              { icon: "verified_user", stat: "Compliant", label: "with RESA & rental law" },
              { icon: "schedule", stat: "Time", label: "back in your week" },
              { icon: "shield", stat: "Protected", label: "asset & income" },
            ].map((c) => (
              <div key={c.label} className="bg-surface p-7">
                <span className="flex h-11 w-11 items-center justify-center bg-navy/5 text-navy-700">
                  <Icon name={c.icon} size={24} />
                </span>
                <p className="mt-4 font-display text-xl font-bold text-navy">{c.stat}</p>
                <p className="mt-1 text-sm text-slate">{c.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* What we handle */}
      <section className="bg-surface-gray py-section">
        <Container>
          <SectionHeading
            eyebrow="What All Abode Handles"
            title="Everything your property needs, managed"
          />
          <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-9 sm:grid-cols-2">
            {handled.map((s) => (
              <FeatureItem key={s.title} {...s} />
            ))}
          </div>
        </Container>
      </section>

      {/* Packages */}
      <section className="py-section">
        <Container>
          <SectionHeading
            eyebrow="Package Comparison"
            title="Choose the level of management that fits"
            lead="From placement-only support to full portfolio management — clear tiers, no surprises."
          />
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {packages.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col border bg-surface p-7 ${
                  p.featured
                    ? "border-gold shadow-[var(--shadow-card)]"
                    : "border-line"
                }`}
              >
                {p.featured && (
                  <span className="label-caps mb-4 self-start bg-gold/15 px-3 py-1 text-gold-bright">
                    Most Popular
                  </span>
                )}
                <h3 className="font-display text-lg font-bold text-navy">{p.name}</h3>
                <p className="mt-2 text-sm text-slate">{p.summary}</p>
                <ul className="mt-5 flex flex-1 flex-col gap-3 border-t border-line pt-5 text-sm text-slate">
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
            lead="Share a few details and our team will prepare a tailored management proposal — including recommended rent and the right service tier."
          />
          <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
            <PropertyManagementForm />
          </div>
        </Container>
      </section>
    </>
  );
}
