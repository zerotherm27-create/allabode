import type { Metadata } from "next";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, CtaBand } from "@/components/sections";
import { PropertyCard } from "@/components/property-card";
import { Faq } from "@/components/faq";
import { getListings } from "@/lib/listings";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Buy and Sell Property Philippines | Real Estate Brokerage Support",
  description:
    "Brokerage for resale properties, lots and house & lots, condos, rent-to-own, office, commercial, industrial, and parking — with pricing, marketing, viewing coordination, and documentation support.",
};

const sellers = [
  { icon: "price_check", label: "Pricing guidance from real market data" },
  { icon: "photo_camera", label: "Listing preparation & professional presentation" },
  { icon: "campaign", label: "Targeted marketing to qualified buyers" },
  { icon: "handshake", label: "Skilled negotiation on your behalf" },
  { icon: "description", label: "Documentation & closing support" },
];

const buyers = [
  { icon: "search", label: "Curated options matched to your brief" },
  { icon: "verified", label: "Buyer qualification & financing guidance" },
  { icon: "fact_check", label: "Due diligence on title & property status" },
  { icon: "handshake", label: "Representation through negotiation" },
  { icon: "gavel", label: "Documentation & transfer assistance" },
];

const propertyTypes = [
  { icon: "house", title: "Resale Properties", body: "Pre-owned homes and units marketed and closed at fair market value." },
  { icon: "landscape", title: "Lots / House & Lots", body: "Vacant lots and house-and-lot packages, titled and verified." },
  { icon: "apartment", title: "Condos", body: "Condominium units across Metro Manila, Cebu, and Davao." },
  { icon: "real_estate_agent", title: "Rent-to-Own / Lease-to-Own", body: "Structured pathways to ownership with clear, documented terms." },
  { icon: "corporate_fare", title: "Office", body: "Office units and floors for end-users and investors." },
  { icon: "storefront", title: "Commercial", body: "Retail and commercial spaces with income and location analysis." },
  { icon: "warehouse", title: "Industrial", body: "Warehouses and industrial facilities, sale-ready and compliant." },
  { icon: "local_parking", title: "Parking", body: "Titled parking slots bought and sold as standalone assets." },
];

const faqs = [
  { q: "Can you help price my property?", a: "Yes. We prepare a pricing recommendation grounded in current comparables and market conditions — not guesswork — so you list at the right number." },
  { q: "Do you represent sellers?", a: "We do. As licensed brokers we market your property, qualify buyers, negotiate, and guide you through documentation to a successful close." },
  { q: "Can buyers request assistance?", a: "Absolutely. We help buyers find suitable properties, qualify financing, perform due diligence, and represent your interests in negotiation." },
  { q: "What documents are usually needed?", a: "Typically the title, tax declaration, tax clearance, and valid IDs. We'll confirm the complete checklist for your specific transaction." },
];

export default async function BuySellPage() {
  const [all, settings] = await Promise.all([getListings(), getSettings()]);
  const forSale = all.filter((l) => l.status === "For Sale");

  return (
    <>
      <PageHero
        eyebrow="Licensed Brokerage"
        title="Buy and sell property with professional brokerage guidance."
        subtitle="Buying or selling property is easier when the process is clear. All Abode helps sellers prepare and market their property while helping buyers understand listings, schedule viewings, and move through next steps professionally."
        image={s(settings, "page_buysell_image") || undefined}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href="/list-your-property" size="lg" variant="ghost-light">
            Sell My Property
          </Button>
          <Button href="/contact" size="lg" variant="ghost-light">
            Inquire as a Buyer
          </Button>
        </div>
      </PageHero>

      {/* Two columns: sellers / buyers */}
      <section className="py-section">
        <Container className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-2">
          <div className="bg-surface p-8 sm:p-10">
            <span className="label-caps text-gold">For Sellers</span>
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
              List My Property
            </Button>
          </div>

          <div className="bg-surface p-8 sm:p-10">
            <span className="label-caps text-gold">For Buyers</span>
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

      {/* What we broker */}
      <section className="pb-section">
        <Container>
          <SectionHeading
            eyebrow="What We Broker"
            title="Every property type, one licensed team"
            lead="From a single parking slot to an industrial facility, we buy and sell across the full range of Philippine property."
          />
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {propertyTypes.map((t) => (
              <div key={t.title} className="bg-surface p-7">
                <span className="flex h-11 w-11 items-center justify-center bg-navy/5 text-navy-700">
                  <Icon name={t.icon} size={24} />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-navy">
                  {t.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">{t.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Sale listings preview */}
      {forSale.length > 0 && (
        <section className="bg-surface-gray py-section">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading align="left" eyebrow="On the Market" title="Properties for sale" />
              <Button href="/listings" variant="ghost">
                View All Listings
                <Icon name="arrow_forward" size={18} />
              </Button>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
              {forSale.map((listing) => (
                <PropertyCard key={listing.id} listing={listing} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* FAQ */}
      <section className="py-section">
        <Container>
          <SectionHeading eyebrow="Buy / Sell FAQ" title="Common questions" />
          <div className="mt-12">
            <Faq items={faqs} />
          </div>
        </Container>
      </section>

      <CtaBand
        title="Thinking of buying or selling?"
        body="Work with licensed brokers who put your interests first — from valuation to closing."
      >
        <Button href="/list-your-property" size="lg">
          Sell My Property
        </Button>
        <Button href="/contact" variant="ghost" size="lg">
          Talk to a Broker
        </Button>
      </CtaBand>
    </>
  );
}
