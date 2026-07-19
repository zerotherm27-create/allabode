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

const title = "Real Estate Brokerage Services Philippines";
const description =
  "All Abode provides licensed real estate brokerage support for buying, selling, resale, commercial, office, industrial, and parking properties.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/property-solutions/brokerage" },
  openGraph: { title, description },
};

const sellers = [
  { icon: "price_check", label: "Pricing guidance from real market data" },
  { icon: "photo_camera", label: "Listing preparation and professional presentation" },
  { icon: "campaign", label: "Targeted marketing to qualified buyers" },
  { icon: "handshake", label: "Negotiation support on your behalf" },
  { icon: "description", label: "Documentation coordination and closing support" },
];

const buyers = [
  { icon: "search", label: "Curated options matched to your brief" },
  { icon: "verified", label: "Buyer qualification and financing guidance" },
  { icon: "fact_check", label: "Due diligence on title and property status" },
  { icon: "handshake", label: "Representation through negotiation" },
  { icon: "gavel", label: "Documentation and transfer coordination" },
];

const brokerageServices = [
  { icon: "sell", title: "Sell a Property", body: "We assist property owners with pricing guidance, listing preparation, marketing, inquiries, viewings, buyer coordination, negotiation support, and transaction coordination." },
  { icon: "search", title: "Buy a Property", body: "We help buyers identify properties that fit their needs, budget, preferred location, and intended use." },
  { icon: "apartment", title: "Resale Condominiums", body: "We assist with resale condominium units, including listing, marketing, buyer coordination, documentation support, and turnover coordination." },
  { icon: "landscape", title: "Lots, Houses, and House-and-Lot Properties", body: "We assist with residential lots, houses, house-and-lot properties, and similar real estate transactions." },
  { icon: "storefront", title: "Commercial Properties", body: "We assist clients who want to buy, sell, or lease commercial spaces." },
  { icon: "corporate_fare", title: "Office Spaces", body: "We assist with office property transactions for businesses, professionals, and investors." },
  { icon: "warehouse", title: "Industrial and Warehouse", body: "We assist with industrial spaces, warehouses, and related real estate requirements." },
  { icon: "local_parking", title: "Parking Slots", body: "We assist with parking slot sales and leasing, subject to building rules and ownership requirements." },
  { icon: "real_estate_agent", title: "Rent-to-Own and Lease-to-Own", body: "We assist with rent-to-own and lease-to-own property opportunities when available and properly documented." },
];

const processSteps = [
  { n: "1", title: "Property or Requirement Review", body: "We review your property details or buying requirements." },
  { n: "2", title: "Pricing and Market Guidance", body: "We provide practical guidance based on location, property type, condition, market activity, and your goals." },
  { n: "3", title: "Listing or Property Search", body: "For sellers, we prepare and market the listing. For buyers, we help identify suitable options." },
  { n: "4", title: "Inquiries and Viewings", body: "We coordinate inquiries, schedules, questions, and property viewings." },
  { n: "5", title: "Negotiation Support", body: "We help coordinate offers, terms, requirements, and next steps." },
  { n: "6", title: "Documentation Coordination", body: "We assist with the transaction documents and coordinate with relevant parties." },
  { n: "7", title: "Closing and Turnover", body: "We help coordinate final steps, turnover, and post-transaction requirements." },
];

const bestFor = [
  "Property owners preparing to sell a home, condominium, lot, or parking slot",
  "Buyers looking for residential, resale, or investment properties",
  "Investors comparing income-generating or resale opportunities",
  "Businesses searching for commercial, office, industrial, or warehouse spaces",
  "Clients who need licensed guidance from inquiry through closing",
];

const faqs = [
  { q: "Can you help price my property?", a: "Yes. We prepare a pricing recommendation grounded in current comparables and market conditions, so you list at the right number." },
  { q: "Do you represent sellers?", a: "We do. We market your property, qualify buyers, coordinate negotiation, and guide you through documentation to a successful close." },
  { q: "Can buyers request assistance?", a: "Absolutely. We help buyers find suitable properties, qualify financing, perform due diligence, and coordinate their interests in negotiation." },
  { q: "What documents are usually needed?", a: "Typically the title, tax declaration, tax clearance, and valid IDs. We will confirm the complete checklist for your specific transaction." },
];

export default async function BrokeragePage() {
  const [all, settings] = await Promise.all([getListings(), getSettings()]);
  const forSale = all.filter((l) => l.listingMarkets?.includes("For Sale") ?? l.status === "For Sale");

  return (
    <>
      <JsonLd data={serviceSchema({ name: "Real Estate Brokerage Services", description: "Licensed real estate brokerage support for buying, selling, resale, commercial, office, industrial, and parking properties.", path: "/property-solutions/brokerage" })} />
      <JsonLd data={breadcrumbSchema([{ label: "Home", href: "/" }, { label: "Services", href: "/property-solutions" }, { label: "Brokerage" }])} />
      <PageHero
        eyebrow="Brokerage"
        title="Real Estate Brokerage"
        subtitle="Buying or selling property is a major decision. All Abode helps property owners, buyers, sellers, and investors move through real estate transactions with professional support, market guidance, and organized coordination. Brokerage services are handled under the supervision of duly licensed real estate service practitioners."
        image={s(settings, "page_buysell_image") || undefined}
        imagePosition={s(settings, "page_buysell_image_position")}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Services", href: "/property-solutions" },
          { label: "Brokerage" },
        ]}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href="/list-your-property" size="lg" variant="ghost-light">
            Sell My Property
          </Button>
          <Button href="/listings/for-sale" size="lg" variant="ghost-light">
            Find a Property
          </Button>
        </div>
      </PageHero>

      {/* Services we handle — numbered list, not icon cards */}
      <section className="py-section">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,18rem)_1fr]">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="What We Handle"
              title="Brokerage work we handle"
            />
          </Reveal>
          <StaggerGroup as="ol" className="flex flex-col divide-y divide-line border-t border-line">
            {brokerageServices.map((t, i) => (
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

      {/* Two columns: sellers / buyers */}
      <section className="bg-surface-gray py-section">
        <Container className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-2">
          <div className="bg-surface p-8 sm:p-10">
            <span className="label-caps text-gold-ink">For Sellers</span>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy">
              Sell for the right price, with less friction
            </h2>
            <ul className="mt-7 flex flex-col gap-4">
              {sellers.map((s) => (
                <li key={s.label} className="flex items-start gap-3 text-slate">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-navy/5 text-navy-700">
                    <Icon name={s.icon} size={18} />
                  </span>
                  <span className="pt-1 text-sm">{s.label}</span>
                </li>
              ))}
            </ul>
            <Button href="/list-your-property" className="mt-8">
              Sell My Property
            </Button>
          </div>

          <div className="bg-surface p-8 sm:p-10">
            <span className="label-caps text-gold-ink">For Buyers</span>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy">
              Buy with confidence and representation
            </h2>
            <ul className="mt-7 flex flex-col gap-4">
              {buyers.map((b) => (
                <li key={b.label} className="flex items-start gap-3 text-slate">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-navy/5 text-navy-700">
                    <Icon name={b.icon} size={18} />
                  </span>
                  <span className="pt-1 text-sm">{b.label}</span>
                </li>
              ))}
            </ul>
            <Button href="/contact" variant="ghost" className="mt-8">
              Inquire as a Buyer
            </Button>
          </div>
        </Container>
      </section>

      {/* Process */}
      <section className="py-section">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="The Process" title="Our Brokerage Process" />
          </Reveal>
          <StaggerGroup
            as="ol"
            className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3"
          >
            {processSteps.map((step, i) => (
              <StaggerItem
                as="li"
                key={step.n}
                className={i === processSteps.length - 1 ? "sm:col-span-2 lg:col-span-3" : ""}
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

      {/* Best for */}
      <section className="bg-surface-gray py-section">
        <Container className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="Ideal Clients"
              title="When brokerage support makes sense"
            />
          </Reveal>
          <StaggerGroup as="ul" className="flex flex-col gap-3">
            {bestFor.map((b) => (
              <StaggerItem as="li" key={b}>
                <div className="flex items-start gap-3 text-slate">
                  <Icon name="check_circle" size={20} className="mt-0.5 shrink-0 text-gold-ink" fill={1} />
                  <span>{b}</span>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </section>

      {/* Sale listings preview */}
      {forSale.length > 0 && (
        <section className="py-section">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading align="left" eyebrow="On the Market" title="Properties for sale" />
              <Button href="/listings/for-sale" variant="ghost">
                View All Listings
                <Icon name="arrow_forward" size={18} />
              </Button>
            </div>
            <StaggerGroup className="mt-12 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
              {forSale.map((listing) => (
                <StaggerItem key={listing.id} className="h-full">
                  <PropertyCard listing={listing} />
                </StaggerItem>
              ))}
            </StaggerGroup>
          </Container>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-surface-gray py-section">
        <Container>
          <SectionHeading eyebrow="Brokerage FAQ" title="Common questions" />
          <div className="mt-12">
            <Faq items={faqs} />
          </div>
          <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-slate">
            Brokerage services are performed under the supervision of duly
            licensed real estate service practitioners. All property
            information is subject to verification, owner approval, and
            availability at the time of inquiry.
          </p>
        </Container>
      </section>

      <CtaBand
        title="Planning to buy or sell property?"
        body="Let All Abode help you take the next step."
      >
        <Button href="/list-your-property" size="lg">
          Sell My Property
        </Button>
        <Button href="/listings/for-sale" variant="ghost" size="lg">
          Find a Property
        </Button>
        <Button href="/contact" variant="ghost" size="lg">
          Contact All Abode
        </Button>
      </CtaBand>
    </>
  );
}
