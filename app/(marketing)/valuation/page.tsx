import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, FeatureItem } from "@/components/sections";
import { Faq } from "@/components/faq";
import { AppraisalForm } from "@/components/forms/lead-forms";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { JsonLd, serviceSchema, breadcrumbSchema } from "@/components/seo/json-ld";
import { getSettings, s } from "@/lib/settings";

const title = "Real Estate Valuation and Appraisal Philippines";
const description =
  "All Abode provides real estate valuation and appraisal support for residential, commercial, office, industrial, and investment properties.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/valuation" },
  openGraph: { title, description },
};

const types = [
  { icon: "home", title: "Residential Valuation", body: "For condominiums, houses, lots, apartments, and residential investment properties." },
  { icon: "apartment", title: "Condominium Appraisal", body: "For individual condominium units, resale units, investment units, and rental properties." },
  { icon: "storefront", title: "Commercial Valuation", body: "For retail spaces, commercial units, mixed-use properties, and income-generating real estate." },
  { icon: "corporate_fare", title: "Office Valuation", body: "For office units, office floors, and business-related property requirements." },
  { icon: "warehouse", title: "Industrial and Warehouse Valuation", body: "For industrial properties, warehouses, logistics spaces, and similar assets." },
  { icon: "payments", title: "Rental Rate Assessment", body: "For owners who want guidance on possible rental rates based on property condition, location, competition, and market activity." },
  { icon: "insights", title: "Market Value Opinion", body: "For clients who need a professional opinion of property value for decision-making." },
  { icon: "description", title: "Formal Appraisal Report", body: "For clients who require a written appraisal report prepared by a licensed real estate appraiser." },
];

const whenNeeded = [
  "Selling a property",
  "Buying a property",
  "Setting a rental rate",
  "Internal family settlement",
  "Estate planning support",
  "Loan or financing preparation",
  "Investment review",
  "Business reporting",
  "Portfolio review",
  "Property dispute support, subject to proper legal counsel",
];

const processSteps = [
  { n: "1", title: "Initial Inquiry", body: "Tell us about the property and the purpose of the valuation." },
  { n: "2", title: "Document Review", body: "We review available documents such as title, tax declaration, floor plan, photos, location details, and related records." },
  { n: "3", title: "Property Inspection or Data Review", body: "Depending on the engagement, we conduct an inspection or review available property data." },
  { n: "4", title: "Market and Property Analysis", body: "We analyze property characteristics, location, condition, comparable activity, and relevant factors." },
  { n: "5", title: "Report or Value Opinion", body: "We provide the appropriate valuation output based on the agreed engagement." },
];

const faqs = [
  { q: "Do you provide appraisal services?", a: "Yes. All Abode provides valuation and appraisal support through duly licensed real estate service practitioners." },
  { q: "What is the difference between pricing guidance and formal appraisal?", a: "Pricing guidance is informal market advice for selling or leasing decisions. A formal appraisal is a written valuation report prepared under a formal appraisal engagement." },
  { q: "What documents are needed for valuation?", a: "Common documents may include title, tax declaration, floor plan, photos, location details, building information, and other property records." },
  { q: "When do I need a valuation?", a: "Commonly for selling, buying, setting a rental rate, estate planning, loan or financing preparation, investment review, and business reporting." },
];

export default async function ValuationPage() {
  const settings = await getSettings();
  return (
    <>
      <JsonLd data={serviceSchema({ name: "Valuation and Appraisal Services", description: "Real estate valuation and appraisal support for residential, commercial, office, industrial, and investment properties.", path: "/valuation" })} />
      <JsonLd data={breadcrumbSchema([{ label: "Home", href: "/" }, { label: "Valuation" }])} />
      <PageHero
        eyebrow="Valuation & Appraisal"
        title="Real Estate Valuation"
        subtitle="Property decisions are easier when you understand value. All Abode provides valuation and appraisal support for property owners, buyers, sellers, investors, and businesses. Our valuation services help clients make more informed decisions for selling, buying, leasing, financing, planning, reporting, or internal review."
        image={s(settings, "page_appraisal_image") || undefined}
        imagePosition={s(settings, "page_appraisal_image_position")}
        crumbs={[{ label: "Home", href: "/" }, { label: "Valuation" }]}
      >
        <Button href="#request" size="lg" variant="ghost-light">
          Request Valuation
        </Button>
      </PageHero>

      {/* Types */}
      <section className="py-section">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Valuation Services"
              title="Valuation work we handle"
              lead="From a single condo unit to a commercial portfolio, we match the valuation output to the purpose of your request."
            />
          </Reveal>
          <StaggerGroup className="mt-12 grid grid-cols-1 gap-x-12 gap-y-9 sm:grid-cols-2">
            {types.map((t) => (
              <StaggerItem key={t.title}>
                <FeatureItem {...t} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* When you may need valuation */}
      <section className="bg-surface-gray py-section">
        <Container className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="When You May Need Valuation"
              title="Value clarity, when it matters"
              lead="A clear view of value protects you in negotiations, filings, and long-term planning."
            />
          </Reveal>
          <StaggerGroup as="ul" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {whenNeeded.map((w) => (
              <StaggerItem as="li" key={w}>
                <div className="flex items-start gap-3 text-sm text-slate">
                  <Icon name="check_circle" size={20} className="mt-0.5 shrink-0 text-gold-ink" fill={1} />
                  <span>{w}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* Process */}
      <section className="py-section">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="The Process"
              title="Our Valuation Process"
            />
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

      {/* Request form */}
      <section id="request" className="scroll-mt-24 bg-surface-gray py-section">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Request Valuation"
              title="Start your valuation"
              lead="Share your property details and our team will follow up to confirm requirements, scope, and schedule."
            />
            <div className="mt-8 flex items-start gap-3 rounded-md border border-line bg-surface p-5 text-sm text-slate">
              <Icon name="info" size={20} className="mt-0.5 shrink-0 text-navy-700" />
              <p>
                <strong className="text-navy">Please note:</strong> formal
                appraisal reports are prepared by duly licensed real estate
                appraisers. Informal rental pricing guidance or market
                consultation should not be treated as a formal appraisal report
                unless a formal appraisal engagement has been agreed in writing.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
            <AppraisalForm />
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-section">
        <Container>
          <SectionHeading eyebrow="Valuation FAQ" title="Common questions" />
          <div className="mt-12">
            <Faq items={faqs} />
          </div>
        </Container>
      </section>
    </>
  );
}
