import type { Metadata } from "next";
import Link from "next/link";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, CtaBand } from "@/components/sections";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { services } from "@/lib/data";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Real Estate Services by All Abode",
  description:
    "Explore All Abode real estate services including brokerage, leasing, property management, valuation, and documentation assistance.",
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
  const settings = await getSettings();
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Real Estate Services"
        subtitle="All Abode brings together the services you need to buy, sell, lease, manage, value, and process property-related documents. Whether you are a property owner, buyer, seller, tenant, investor, or business, we help you choose the right path and move through the process with confidence."
        image={s(settings, "page_property_solutions_image") || undefined}
        crumbs={[{ label: "Home", href: "/" }, { label: "Services" }]}
      >
        <Button href="#services" size="lg" variant="ghost-light">
          Choose a Service
        </Button>
      </PageHero>

      {/* Service index */}
      <section id="services" className="scroll-mt-24 py-section">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Our Services"
              title="Choose the right service for your property concern"
            />
          </Reveal>
          <StaggerGroup as="ul" className="mt-12 flex flex-col divide-y divide-line border-t border-line">
            {services.map((service, i) => (
              <StaggerItem as="li" key={service.slug}>
                <Link
                  href={service.href}
                  className="group grid grid-cols-[2.5rem_1fr_auto] items-start gap-5 py-7 transition-colors sm:grid-cols-[3.5rem_1fr_auto] sm:items-center sm:py-9"
                >
                  <span className="font-display text-xl font-semibold text-line-strong sm:text-2xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-bold text-navy transition-colors group-hover:text-gold-ink sm:text-2xl">
                      {service.title}
                    </h3>
                    <p className="mt-2 max-w-2xl leading-relaxed text-slate">
                      {sectionCopy[service.slug]?.audience ?? service.blurb}
                    </p>
                  </div>
                  <Icon
                    name="arrow_forward"
                    size={22}
                    className="mt-1 hidden shrink-0 text-navy transition-all duration-[var(--dur-fast)] group-hover:translate-x-1 group-hover:text-gold-ink sm:mt-0 sm:block"
                  />
                </Link>
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
