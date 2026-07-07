import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, FeatureItem, CtaBand } from "@/components/sections";
import { PropertyCard } from "@/components/property-card";
import { Faq } from "@/components/faq";
import { getListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Leasing Services Philippines | Residential, Commercial & Office Leasing",
  description:
    "Lease your condo, house, bed space, commercial space, office, industrial warehouse, or parking slot with professional marketing, tenant screening, viewing coordination, and move-in support.",
};

const residentialLeaseTypes = [
  {
    icon: "calendar_month",
    title: "Long-Term Lease",
    body: "Stable, vetted tenancies for condos, houses, and apartments with full lease administration.",
  },
  {
    icon: "weekend",
    title: "Short Stays / BnB",
    body: "Flexible, fully-managed short stays for furnished condos and serviced units in prime districts.",
  },
  {
    icon: "bed",
    title: "Bed Space",
    body: "Compliant, well-managed bed-space arrangements for students and young professionals.",
  },
];

const specialtyLeaseTypes = [
  {
    icon: "storefront",
    title: "Commercial",
    body: "Retail and commercial spaces leased to qualified operators with clear, enforceable terms.",
  },
  {
    icon: "corporate_fare",
    title: "Office",
    body: "Office units and floors placed with vetted corporate tenants under proper fit-out terms.",
  },
  {
    icon: "warehouse",
    title: "Industrial / Warehouse",
    body: "Warehouses and industrial facilities leased with usage, compliance, and access handled.",
  },
  {
    icon: "local_parking",
    title: "Parking",
    body: "Parking slots leased under documented, e-signed rental agreements.",
  },
];

const ownerServices = [
  {
    icon: "fact_check",
    title: "Tenant Screening",
    body: "Background, employment, and credit checks so your unit is occupied by reliable tenants.",
  },
  {
    icon: "description",
    title: "Lease Documentation",
    body: "Legally-sound contracts prepared and managed in line with Philippine rental law.",
  },
  {
    icon: "moving",
    title: "Move-In Coordination",
    body: "Inventory, turnover, and handover handled professionally on your behalf.",
  },
  {
    icon: "monitoring",
    title: "Owner Reporting",
    body: "Transparent statements on rent collection, occupancy, and unit condition.",
  },
];

const faqs = [
  {
    q: "What types of leasing do you handle?",
    a: "Residential leasing (long-term, short stays / BnB, and bed space) plus commercial, office, industrial / warehouse, and parking leasing — for individual owners and investors alike.",
  },
  {
    q: "Can you help screen tenants?",
    a: "Yes. Every prospective tenant goes through background, employment, and reference checks before we recommend them, protecting your property and income.",
  },
  {
    q: "Do you handle short-term leasing?",
    a: "We do. Our team manages furnished short-stay units end-to-end — pricing, marketing, guest coordination, and turnover.",
  },
  {
    q: "Can owners list their property with All Abode?",
    a: "Absolutely. Submit your property through our List Your Property form and a licensed agent will guide you through pricing, marketing, and tenant placement.",
  },
];

export default async function LeasingPage() {
  const [all, settings] = await Promise.all([getListings(), getSettings()]);
  const rentals = all.filter((l) => l.status === "For Lease");

  return (
    <>
      <PageHero
        eyebrow="Leasing & Rentals"
        title="Leasing services for owners, tenants, and investors."
        subtitle="From tenant screening to move-in coordination and monthly owner reports, we run a complete leasing operation so your property stays occupied, compliant, and profitable."
        image={s(settings, "page_leasing_image") || undefined}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href="/list-your-property" size="lg" variant="ghost-light">
            <Icon name="sell" size={20} />
            List My Property
          </Button>
          <Button href="/listings" size="lg" variant="ghost-light">
            <Icon name="search" size={20} />
            Find a Rental
          </Button>
        </div>
      </PageHero>

      {/* Lease types */}
      <section className="py-section">
        <Container>
          <SectionHeading
            eyebrow="Flexible Arrangements"
            title="Leasing built around how you live and invest"
            lead="Whether you own a single condo or a growing portfolio, we structure the right leasing approach for your goals."
          />
          <p className="label-caps mt-12 text-slate">Residential</p>
          <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line md:grid-cols-3">
            {residentialLeaseTypes.map((t) => (
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
          <p className="label-caps mt-10 text-slate">Commercial & Specialty</p>
          <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {specialtyLeaseTypes.map((t) => (
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

      {/* Owner services */}
      <section className="bg-surface-gray py-section">
        <Container>
          <SectionHeading
            align="left"
            eyebrow="For Property Owners"
            title="A managed leasing process, end to end"
          />
          <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
            {ownerServices.map((s) => (
              <FeatureItem key={s.title} {...s} />
            ))}
          </div>
        </Container>
      </section>

      {/* Rental listings preview */}
      {rentals.length > 0 && (
        <section className="py-section">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                align="left"
                eyebrow="Available Now"
                title="Rental listings"
              />
              <Button href="/listings" variant="ghost">
                View All Rentals
                <Icon name="arrow_forward" size={18} />
              </Button>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
              {rentals.map((listing) => (
                <PropertyCard key={listing.id} listing={listing} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-surface-gray py-section">
        <Container>
          <SectionHeading eyebrow="Leasing FAQ" title="Common questions" />
          <div className="mt-12">
            <Faq items={faqs} />
          </div>
        </Container>
      </section>

      <CtaBand
        title="Ready to lease your property?"
        body="List your unit with a licensed team that handles screening, contracts, and reporting for you."
      >
        <Button href="/list-your-property" size="lg">
          List My Property
        </Button>
        <Button href="/contact" variant="ghost" size="lg">
          Talk to a Leasing Specialist
        </Button>
      </CtaBand>
    </>
  );
}
