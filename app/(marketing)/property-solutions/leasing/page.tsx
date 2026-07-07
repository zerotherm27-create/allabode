import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, CtaBand } from "@/components/sections";
import { PropertyCard } from "@/components/property-card";
import { Faq } from "@/components/faq";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { JsonLd, serviceSchema, breadcrumbSchema } from "@/components/seo/json-ld";
import { getListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Property Leasing Services Philippines",
  description:
    "All Abode assists with residential, commercial, office, warehouse, parking, long-term, short-stay, and bedspace leasing.",
  alternates: { canonical: "/property-solutions/leasing" },
};

const leasingServices = [
  { icon: "home", title: "Residential Leasing", body: "We assist with condominium units, house and lots, apartments, and other residential rental properties." },
  { icon: "calendar_month", title: "Long-Term Lease", body: "We help owners market properties for long-term tenants and assist tenants in finding homes that match their needs." },
  { icon: "weekend", title: "Short-Stay and BnB Coordination", body: "We assist with short-stay leasing coordination when allowed by the property owner, building rules, local regulations, and platform requirements." },
  { icon: "bed", title: "Bedspace Leasing", body: "We assist with bedspace inquiries and coordination when available." },
  { icon: "storefront", title: "Commercial Leasing", body: "We assist with commercial spaces for business use." },
  { icon: "corporate_fare", title: "Office Leasing", body: "We assist professionals, companies, and teams looking for office space." },
  { icon: "warehouse", title: "Industrial and Warehouse Leasing", body: "We assist with warehouse and industrial space leasing requirements." },
  { icon: "local_parking", title: "Parking Lease", body: "We assist with parking slot leasing, subject to building rules and availability." },
];

const processSteps = [
  { n: "1", title: "Property Review", body: "We review the property details, target rental rate, location, furnishing, lease terms, and availability." },
  { n: "2", title: "Listing Preparation", body: "We help prepare the property listing with photos, details, pricing, and terms." },
  { n: "3", title: "Marketing and Inquiries", body: "We promote the listing and respond to qualified inquiries." },
  { n: "4", title: "Viewing Coordination", body: "We coordinate property viewings with prospective tenants." },
  { n: "5", title: "Tenant Screening Assistance", body: "We assist with basic tenant screening and document collection, subject to owner approval." },
  { n: "6", title: "Lease Coordination", body: "We assist with lease documents, payment terms, move-in requirements, and building requirements." },
  { n: "7", title: "Turnover or Management", body: "After move-in, owners may choose to self-manage or continue with All Abode property management." },
];

const faqs = [
  {
    q: "What types of leasing do you handle?",
    a: "Residential leasing including long-term, short-stay, and bedspace, plus commercial, office, industrial and warehouse, and parking leasing for individual owners and investors alike.",
  },
  {
    q: "Can you help screen tenants?",
    a: "Yes. We assist with basic tenant screening and document collection, subject to owner approval, so your unit is occupied by reliable tenants.",
  },
  {
    q: "Do you handle short-term leasing?",
    a: "We do. Short-stay and BnB arrangements are coordinated when allowed by the property owner, building rules, local regulations, and platform requirements.",
  },
  {
    q: "Can owners list their property with All Abode?",
    a: "Absolutely. Submit your property through our List My Property form and our team will guide you through pricing, marketing, and tenant placement.",
  },
];

export default async function LeasingPage() {
  const [all, settings] = await Promise.all([getListings(), getSettings()]);
  const rentals = all.filter((l) => l.status === "For Rent");

  return (
    <>
      <JsonLd data={serviceSchema({ name: "Property Leasing Services", description: "Residential, commercial, office, warehouse, parking, long-term, short-stay, and bedspace leasing assistance.", path: "/property-solutions/leasing" })} />
      <JsonLd data={breadcrumbSchema([{ label: "Home", href: "/" }, { label: "Services", href: "/property-solutions" }, { label: "Leasing" }])} />
      <PageHero
        eyebrow="Leasing"
        title="Property Leasing"
        subtitle="All Abode helps property owners find tenants and helps tenants find the right space. We assist with leasing for residential, commercial, office, industrial, warehouse, bedspace, short-stay, and parking properties. Our goal is to make the leasing process clearer, smoother, and more organized for both property owners and tenants."
        image={s(settings, "page_leasing_image") || undefined}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Services", href: "/property-solutions" },
          { label: "Leasing" },
        ]}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href="/list-your-property" size="lg" variant="ghost-light">
            <Icon name="sell" size={20} />
            Lease Out My Property
          </Button>
          <Button href="/listings/for-rent" size="lg" variant="ghost-light">
            <Icon name="search" size={20} />
            Find a Rental
          </Button>
        </div>
      </PageHero>

      {/* Leasing services — numbered list, not icon cards */}
      <section className="py-section">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,18rem)_1fr]">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="What We Handle"
              title="Leasing work we handle"
              lead="Whether you own a single condo or a growing portfolio, we structure the right leasing approach for your goals."
            />
          </Reveal>
          <StaggerGroup as="ol" className="flex flex-col divide-y divide-line border-t border-line">
            {leasingServices.map((t, i) => (
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

      {/* For owners / for tenants */}
      <section className="bg-surface-gray py-section">
        <Container className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-2">
          <div className="bg-surface p-8 sm:p-10">
            <span className="label-caps text-gold-ink">For Property Owners</span>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy">
              Lease out your property with organized support
            </h2>
            <p className="mt-4 leading-relaxed text-slate">
              We help owners prepare, market, and lease out their property.
              Depending on the engagement, our support may include listing
              preparation, tenant inquiries, viewing coordination, tenant
              screening assistance, lease coordination, move-in support, and
              turnover.
            </p>
            <Button href="/list-your-property" className="mt-8">
              Lease Out My Property
            </Button>
          </div>

          <div className="bg-surface p-8 sm:p-10">
            <span className="label-caps text-gold-ink">For Tenants</span>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy">
              Find the right rental, with real help
            </h2>
            <p className="mt-4 leading-relaxed text-slate">
              We help tenants check available rentals, schedule viewings,
              understand basic requirements, and coordinate the next steps with
              the property owner.
            </p>
            <Button href="/listings/for-rent" variant="ghost" className="mt-8">
              Find a Rental
            </Button>
          </div>
        </Container>
      </section>

      {/* Process */}
      <section className="py-section">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="The Process" title="Our Leasing Process" />
          </Reveal>
          <StaggerGroup
            as="ol"
            className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4"
          >
            {processSteps.map((step, i) => (
              <StaggerItem
                as="li"
                key={step.n}
                className={i === processSteps.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""}
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
            Short-stay and BnB arrangements are subject to the approval of the
            property owner, condominium corporation, building administration,
            local rules, and applicable platform requirements.
          </p>
        </Container>
      </section>

      {/* Rental listings preview */}
      {rentals.length > 0 && (
        <section className="bg-surface-gray py-section">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                align="left"
                eyebrow="Available Now"
                title="Rental listings"
              />
              <Button href="/listings/for-rent" variant="ghost">
                View All Rentals
                <Icon name="arrow_forward" size={18} />
              </Button>
            </div>
            <StaggerGroup className="mt-12 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
              {rentals.map((listing) => (
                <StaggerItem key={listing.id}>
                  <PropertyCard listing={listing} />
                </StaggerItem>
              ))}
            </StaggerGroup>
          </Container>
        </section>
      )}

      {/* FAQ */}
      <section className="py-section">
        <Container>
          <SectionHeading eyebrow="Leasing FAQ" title="Common questions" />
          <div className="mt-12">
            <Faq items={faqs} />
          </div>
        </Container>
      </section>

      <CtaBand
        title="Need help leasing out your property or finding a rental?"
        body="Tell us about the property or the space you are looking for and we will guide the next step."
      >
        <Button href="/list-your-property" size="lg">
          Lease Out My Property
        </Button>
        <Button href="/listings/for-rent" variant="ghost" size="lg">
          Find a Rental
        </Button>
        <Button href="/contact" variant="ghost" size="lg">
          Schedule a Viewing
        </Button>
      </CtaBand>
    </>
  );
}
