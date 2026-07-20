import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, CtaBand } from "@/components/sections";
import { Faq } from "@/components/faq";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { JsonLd, serviceSchema, breadcrumbSchema } from "@/components/seo/json-ld";
import { faqSections } from "@/lib/faq-data";
import { getSettings, s } from "@/lib/settings";

const title = "Property Documentation Assistance Philippines";
const description =
  "All Abode assists with title transfer coordination, tax payment assistance, notarial coordination, and property document processing.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/property-solutions/documentation-assistance" },
  openGraph: { title, description },
};

const services = [
  {
    icon: "swap_horiz",
    title: "Title Transfer Assistance",
    body: "We assist with coordination and processing support for property title transfer requirements.",
  },
  {
    icon: "receipt_long",
    title: "Tax Payment Assistance",
    body: "We assist with payment coordination for property-related taxes, including real property tax and transaction-related tax steps when applicable.",
  },
  {
    icon: "approval",
    title: "Notarial Coordination",
    body: "We assist with notarial coordination through duly authorized notarial professionals.",
  },
  {
    icon: "account_balance",
    title: "LGU, BIR, and Registry Coordination",
    body: "We assist with coordination involving local government offices, the Bureau of Internal Revenue, Registry of Deeds, condominium administration, and other relevant offices when applicable.",
  },
  {
    icon: "checklist",
    title: "Document Preparation Support",
    body: "We help organize required documents, checklists, forms, and follow-up steps.",
  },
];

const whoFor = [
  "Property buyers",
  "Property sellers",
  "Property owners",
  "Heirs or family representatives",
  "Investors",
  "Landlords",
  "Clients who need help organizing property paperwork",
];

const processSteps = [
  { n: "1", title: "Requirement Review", body: "We review your property concern and identify the likely documents and offices involved." },
  { n: "2", title: "Document Checklist", body: "We provide a checklist based on the type of request." },
  { n: "3", title: "Coordination and Processing Support", body: "We assist with scheduling, follow-ups, payment coordination, and document routing." },
  { n: "4", title: "Updates", body: "We provide updates as the process moves forward." },
  { n: "5", title: "Completion", body: "We help organize final documents, proof of payment, and related records." },
];

const faqs = faqSections.find((section) => section.id === "documentation")!.items;

export default async function DocumentationAssistancePage() {
  const settings = await getSettings();
  return (
    <>
      <JsonLd data={serviceSchema({ name: "Property Documentation Assistance", description: "Title transfer coordination, tax payment assistance, notarial coordination, and property document processing.", path: "/property-solutions/documentation-assistance" })} />
      <JsonLd data={breadcrumbSchema([{ label: "Home", href: "/" }, { label: "Services", href: "/property-solutions" }, { label: "Documentation Assistance" }])} />
      <PageHero
        eyebrow="Documentation Assistance"
        title="Documentation Assistance"
        subtitle="Property transactions often require documents, payments, coordination, and follow-ups with different offices. All Abode helps clients organize and coordinate property-related documentation requirements with a clearer process."
        image={s(settings, "page_documentation_image") || undefined}
        imagePosition={s(settings, "page_documentation_image_position")}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Services", href: "/property-solutions" },
          { label: "Documentation Assistance" },
        ]}
      >
        <Button href="/contact" size="lg" variant="ghost-light">
          Get Documentation Assistance
        </Button>
      </PageHero>

      {/* Services — numbered list, not icon cards */}
      <section className="py-section">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,18rem)_1fr]">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="What We Can Assist With"
              title="Documentation support services"
              lead="The paperwork behind every property transaction, coordinated by a team that does it every week."
            />
          </Reveal>
          <StaggerGroup as="ol" className="flex flex-col divide-y divide-line border-t border-line">
            {services.map((t, i) => (
              <StaggerItem as="li" key={t.title}>
                <div className="grid grid-cols-[2.5rem_1fr] items-baseline gap-5 py-5 sm:grid-cols-[3rem_1fr]">
                  <span className="font-display text-xl font-semibold text-line-strong">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-base font-semibold text-navy">
                      {t.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate">{t.body}</p>
                  </div>
                </div>
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
              title="Help for anyone handling property paperwork"
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

      {/* Process */}
      <section className="py-section">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="The Process"
              title="Our Documentation Process"
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
          <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-slate">
            Documentation assistance is provided as administrative coordination
            and processing support. Legal advice, tax advice, and notarial acts
            are provided only by duly authorized professionals when required.
          </p>
        </Container>
      </section>

      {/* FAQ */}
      <section className="bg-surface-gray py-section">
        <Container>
          <SectionHeading eyebrow="Documentation FAQ" title="Common questions" />
          <div className="mt-12">
            <Faq items={faqs} />
          </div>
        </Container>
      </section>

      <CtaBand
        title="Need help with property documents?"
        body="Tell us about your transaction and we will confirm the requirements, costs, and timeline, usually within one business day."
      >
        <Button href="/contact" size="lg">
          Get Documentation Assistance
        </Button>
        <Button href="/property-solutions/brokerage" size="lg" variant="ghost">
          Buying or Selling?
        </Button>
      </CtaBand>
    </>
  );
}
