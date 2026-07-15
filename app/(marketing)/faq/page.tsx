import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { PageHero, SectionHeading, CtaBand } from "@/components/sections";
import { Faq } from "@/components/faq";
import { Reveal } from "@/components/motion";
import { faqSections } from "@/lib/faq-data";
import { JsonLd, faqPageSchema, breadcrumbSchema } from "@/components/seo/json-ld";
import { getSettings, s } from "@/lib/settings";

const title = "All Abode FAQ | Real Estate Services Philippines";
const description =
  "Read frequently asked questions about All Abode brokerage, leasing, property management, valuation, listings, and documentation assistance.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/faq" },
  openGraph: { title, description },
};


export default async function FaqPage() {
  const settings = await getSettings();
  return (
    <>
      <JsonLd data={faqPageSchema(faqSections)} />
      <JsonLd data={breadcrumbSchema([{ label: "Home", href: "/" }, { label: "FAQ" }])} />
      <PageHero
        eyebrow="FAQ"
        title="Frequently Asked Questions"
        subtitle="Find answers to common questions about All Abode services, including brokerage, leasing, property management, valuation, listings, and documentation assistance."
        image={s(settings, "page_faq_image") || undefined}
        crumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
      />

      {faqSections.map((section, i) => (
        <section
          key={section.id}
          id={section.id}
          className={`scroll-mt-24 py-section ${i % 2 === 1 ? "bg-surface-gray" : ""}`}
        >
          <Container>
            <Reveal>
              <SectionHeading eyebrow={section.eyebrow} title={section.title} />
            </Reveal>
            <div className="mx-auto mt-12 max-w-3xl">
              <Faq items={section.items} />
            </div>
          </Container>
        </section>
      ))}

      <CtaBand
        title="Did not find the answer you need?"
        body="Tell us what you need help with and our team will guide you to the right property solution."
      >
        <Button href="/contact" size="lg">
          Contact All Abode
        </Button>
      </CtaBand>
    </>
  );
}
