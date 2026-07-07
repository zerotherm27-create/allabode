import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, CtaBand } from "@/components/sections";
import { Faq } from "@/components/faq";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Title Transfer, Notarial & Tax Documentation Services Philippines",
  description:
    "Property documentation support in the Philippines — title transfer processing, notarial services, and capital gains, documentary stamp, transfer, and real property tax payments.",
};

const services = [
  {
    icon: "swap_horiz",
    title: "Title Transfer",
    body: "End-to-end processing of deeds and titles with the BIR, Registry of Deeds, and city assessor — from document preparation to release of the new title.",
  },
  {
    icon: "approval",
    title: "Notarial Services",
    body: "Coordination of notarization for deeds of sale, lease agreements, special powers of attorney, and other property documents.",
  },
  {
    icon: "receipt_long",
    title: "Tax Payments",
    body: "Computation and payment assistance for capital gains tax, documentary stamp tax, transfer tax, and real property tax — filed on time, every time.",
  },
];

const faqs = [
  {
    q: "How long does a title transfer take?",
    a: "Timelines vary by city and the completeness of your documents, but most straightforward transfers complete within 2–4 months. We track every step and keep you updated so nothing stalls unnoticed.",
  },
  {
    q: "What documents do I need to start?",
    a: "Typically the owner's duplicate title, notarized deed of sale, tax declaration, latest real property tax receipts, and valid IDs of both parties. We'll confirm the exact list for your transaction when you inquire.",
  },
  {
    q: "Can you handle just the tax payments?",
    a: "Yes — we can compute and process capital gains, documentary stamp, transfer, or real property tax payments as a standalone service, even if the rest of the transaction is handled elsewhere.",
  },
  {
    q: "Do I need to be in the Philippines?",
    a: "No. With a Special Power of Attorney (which we can help prepare and have notarized or consularized), we regularly process documentation for owners who are abroad, including OFWs.",
  },
];

export default async function DocumentationPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHero
        eyebrow="Documentation Support"
        title="Property paperwork, processed properly."
        subtitle="Title transfer, notarial services, and property tax payments — handled end-to-end so your transaction never stalls on documents."
        image={s(settings, "page_documentation_image") || undefined}
      >
        <Button href="/contact" size="lg" variant="ghost-light">
          Get Documentation Help
        </Button>
      </PageHero>

      {/* Services */}
      <section className="py-section">
        <Container>
          <SectionHeading
            eyebrow="What We Handle"
            title="Documentation services"
            lead="The unglamorous — but critical — paperwork behind every property transaction, handled by a team that does it every week."
          />
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
            {services.map((t) => (
              <div key={t.title} className="bg-surface p-8">
                <span className="flex h-12 w-12 items-center justify-center bg-navy/5 text-navy-700">
                  <Icon name={t.icon} size={28} />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-navy">
                  {t.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">{t.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Process */}
      <section className="bg-surface-gray py-section">
        <Container>
          <SectionHeading
            eyebrow="The Process"
            title="How documentation support works"
          />
          <ol className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "1", title: "Submit your documents", body: "Share the transaction details and copies of your documents for review." },
              { n: "2", title: "Assessment & quote", body: "We confirm what's needed, the taxes and fees involved, and the timeline." },
              { n: "3", title: "Processing & follow-through", body: "We file, pay, and follow up with the BIR, Registry of Deeds, and assessor." },
              { n: "4", title: "Release & turnover", body: "You receive the new title, receipts, and a complete file of the paper trail." },
            ].map((step) => (
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

      {/* FAQ */}
      <section className="py-section">
        <Container>
          <SectionHeading eyebrow="Documentation FAQ" title="Common questions" />
          <div className="mt-12">
            <Faq items={faqs} />
          </div>
        </Container>
      </section>

      <CtaBand
        title="Have paperwork that needs processing?"
        body="Tell us about your transaction and we'll confirm the requirements, costs, and timeline — usually within one business day."
      >
        <Button href="/contact" size="lg">
          Contact Us
        </Button>
        <Button href="/buy-sell" size="lg" variant="ghost">
          Buying or Selling?
        </Button>
      </CtaBand>
    </>
  );
}
