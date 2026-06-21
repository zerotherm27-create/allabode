import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading } from "@/components/sections";
import { Faq } from "@/components/faq";
import { AppraisalForm } from "@/components/forms/lead-forms";

export const metadata: Metadata = {
  title: "Real Estate Appraisal",
  description:
    "Licensed real estate appraisal for informed property decisions — residential, commercial, land, estate, and investment valuations compliant with Philippine standards.",
};

const types = [
  { icon: "home", title: "Residential Appraisal", body: "Houses, condos, and townhouses valued for sale, loan, or estate purposes." },
  { icon: "corporate_fare", title: "Commercial Appraisal", body: "Offices, retail, and mixed-use assets assessed on income and market data." },
  { icon: "landscape", title: "Land Appraisal", body: "Vacant lots and agricultural land valued with current zoning and comparables." },
  { icon: "gavel", title: "Estate / Legal Appraisal", body: "Defensible valuations for inheritance, settlement, and legal proceedings." },
  { icon: "trending_up", title: "Investment Valuation", body: "Yield and return analysis to support confident investment decisions." },
  { icon: "sell", title: "Pre-Sale Valuation", body: "Know your property's true worth before you list, so you price it right." },
];

const faqs = [
  { q: "What is a real estate appraisal?", a: "A formal, documented estimate of a property's market value prepared by a PRC-licensed appraiser using accepted valuation methods and current market data." },
  { q: "When do I need an appraisal?", a: "Commonly for bank loans and collateral, inheritance and estate settlement, legal disputes, pre-sale pricing, and investment analysis." },
  { q: "What documents are needed?", a: "Typically the title, tax declaration, lot plan, and any prior appraisal. We'll confirm the exact list when you submit your request." },
  { q: "Is a market estimate the same as a formal appraisal?", a: "No. A general market opinion is an informal indication of value. A formal appraisal is a signed, documented report by a licensed appraiser — required for legal, tax, and lending purposes." },
];

export default function AppraisalPage() {
  return (
    <>
      <PageHero
        eyebrow="Licensed Appraisal"
        title="Licensed real estate appraisal for informed property decisions."
        subtitle="Our PRC-licensed appraisers deliver defensible, standards-compliant valuations — for lending, inheritance, legal matters, pre-sale pricing, and investment."
      >
        <Button href="#request" size="lg" variant="ghost-light">
          Request an Appraisal
        </Button>
      </PageHero>

      {/* Types */}
      <section className="py-section">
        <Container>
          <SectionHeading
            eyebrow="Appraisal Services"
            title="Valuations for every purpose"
            lead="From a single condo to a commercial portfolio, our appraisals stand up to banks, courts, and the BIR."
          />
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {types.map((t) => (
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

      {/* Request form */}
      <section id="request" className="scroll-mt-24 bg-surface-gray py-section">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Request an Appraisal"
              title="Start your valuation"
              lead="Share your property details and our licensed appraiser will follow up to confirm requirements and schedule an inspection."
            />
            <div className="mt-8 flex items-start gap-3 rounded-md border border-line bg-surface p-5 text-sm text-slate">
              <Icon name="info" size={20} className="mt-0.5 shrink-0 text-navy-700" />
              <p>
                <strong className="text-navy">Please note:</strong> a general market
                estimate is not the same as a formal appraisal. Formal, signed
                appraisal reports for legal, tax, or lending use are prepared by our
                PRC-licensed appraiser and may require an on-site inspection.
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
          <SectionHeading eyebrow="Appraisal FAQ" title="Common questions" />
          <div className="mt-12">
            <Faq items={faqs} />
          </div>
        </Container>
      </section>
    </>
  );
}
