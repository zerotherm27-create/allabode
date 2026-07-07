import type { Metadata } from "next";
import Link from "next/link";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, CtaBand } from "@/components/sections";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { services } from "@/lib/data";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Property Solutions by All Abode",
  description:
    "Explore All Abode property solutions including brokerage, leasing, property management, valuation, and documentation assistance.",
  alternates: { canonical: "/property-solutions" },
};

const sectionCopy: Record<string, { audience: string }> = {
  brokerage: {
    audience:
      "For clients who want to buy, sell, or market real estate. We assist with residential, commercial, office, industrial, warehouse, and parking transactions.",
  },
  leasing: {
    audience:
      "For property owners looking for tenants and clients searching for rental spaces. We assist with residential leases, long-term leasing, short-stay coordination, bedspace, commercial leases, office spaces, industrial spaces, warehouses, and parking.",
  },
  management: {
    audience:
      "For owners who want help with ongoing property care. We assist with rent collection, maintenance, cleaning, furnishing, fit-out, turnover, and owner coordination.",
  },
  valuation: {
    audience:
      "For clients who need professional valuation or appraisal support for property decisions, transactions, reporting, or planning.",
  },
  documentation: {
    audience:
      "For clients who need help coordinating title transfer, tax payments, notarial coordination, and property-related documents.",
  },
};

export default async function PropertySolutionsPage() {
  await getSettings();
  return (
    <>
      <PageHero
        eyebrow="Property Solutions"
        title="Property Solutions"
        subtitle="All Abode Property Solutions brings together the real estate services you need to buy, sell, lease, manage, value, and process property-related documents. Whether you are a property owner, buyer, seller, tenant, investor, or business, we help you choose the right service and move through the process with confidence."
        crumbs={[{ label: "Home", href: "/" }, { label: "Property Solutions" }]}
      >
        <Button href="#services" size="lg" variant="ghost-light">
          Choose a Service
        </Button>
      </PageHero>

      {/* Service sections */}
      <section id="services" className="scroll-mt-24 py-section">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Our Services"
              title="Choose the right service for your property concern"
            />
          </Reveal>
          <StaggerGroup className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line md:grid-cols-2">
            {services.map((service, i) => (
              <StaggerItem
                key={service.slug}
                className={
                  i === services.length - 1 && services.length % 2 === 1
                    ? "md:col-span-2"
                    : ""
                }
              >
                <div className="flex h-full flex-col bg-surface p-8 sm:p-10">
                  <span className="flex h-12 w-12 items-center justify-center bg-navy/5 text-navy-700">
                    <Icon name={service.icon} size={28} />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold text-navy">
                    {service.title}
                  </h3>
                  <p className="mt-3 flex-1 leading-relaxed text-slate">
                    {sectionCopy[service.slug]?.audience ?? service.blurb}
                  </p>
                  <div className="mt-6">
                    <Link
                      href={service.href}
                      className="label-caps inline-flex items-center gap-2 border-b-2 border-navy pb-1 text-navy transition-colors hover:border-gold hover:text-gold"
                    >
                      {service.cta ?? "Learn more"}
                      <Icon name="arrow_forward" size={16} />
                    </Link>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      <CtaBand
        title="Not sure which service you need?"
        body="Tell us about your property concern and we will help you find the right path."
      >
        <Button href="/contact" size="lg">
          Contact All Abode
        </Button>
      </CtaBand>
    </>
  );
}
