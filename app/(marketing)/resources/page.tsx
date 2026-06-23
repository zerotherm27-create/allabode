import type { Metadata } from "next";
import Link from "next/link";
import { Container, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PageHero, SectionHeading, CtaBand } from "@/components/sections";
import { getSettings, s } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Property Guides Philippines | All Abode Resources",
  description:
    "Read practical guides about leasing, property management, buying, selling, appraisal, and real estate decisions in the Philippines.",
};

const categories = [
  { icon: "home_work", label: "Property Owner Education", href: "#owner" },
  { icon: "key", label: "Leasing Advice", href: "#leasing" },
  { icon: "corporate_fare", label: "Property Management", href: "#management" },
  { icon: "real_estate_agent", label: "Buying and Selling Guidance", href: "#buy-sell" },
  { icon: "verified", label: "Appraisal Education", href: "#appraisal" },
  { icon: "flight", label: "OFW Property Ownership", href: "#ofw" },
  { icon: "trending_up", label: "Investor Property Support", href: "#investor" },
];

const articles = [
  {
    id: "owner",
    category: "Property Owner Education",
    icon: "home_work",
    items: [
      { title: "How to prepare your condo for leasing", href: "/resources" },
      { title: "Seller checklist before listing a property", href: "/resources" },
    ],
  },
  {
    id: "leasing",
    category: "Leasing Advice",
    icon: "key",
    items: [
      { title: "Short-term vs long-term leasing: what owners should know", href: "/resources" },
      { title: "Move-in and move-out documentation checklist", href: "/resources" },
    ],
  },
  {
    id: "management",
    category: "Property Management",
    icon: "corporate_fare",
    items: [
      { title: "What property management includes", href: "/resources" },
      { title: "Property management for OFWs in the Philippines", href: "/resources" },
    ],
  },
  {
    id: "buy-sell",
    category: "Buying and Selling Guidance",
    icon: "real_estate_agent",
    items: [
      { title: "Questions buyers should ask before a viewing", href: "/resources" },
      { title: "How to submit a complete property inquiry", href: "/resources" },
    ],
  },
  {
    id: "appraisal",
    category: "Appraisal Education",
    icon: "verified",
    items: [
      { title: "Formal appraisal vs market estimate", href: "/resources" },
      { title: "Documents commonly needed for appraisal", href: "/resources" },
    ],
  },
];

export default async function ResourcesPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Property guides and practical real estate advice."
        subtitle="Explore guides from All Abode Property Solutions to help you understand leasing, brokerage, property management, appraisal, and property ownership decisions."
        image={s(settings, "page_resources_image") || undefined}
      />

      {/* Categories */}
      <section className="py-section">
        <Container>
          <SectionHeading
            eyebrow="Browse by Topic"
            title="What would you like to learn about?"
          />
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <a
                key={cat.label}
                href={cat.href}
                className="flex items-center gap-2 border border-line bg-surface px-4 py-2.5 text-sm font-medium text-navy transition-colors hover:border-navy hover:bg-surface-gray"
              >
                <Icon name={cat.icon} size={18} className="text-gold" />
                {cat.label}
              </a>
            ))}
          </div>
        </Container>
      </section>

      {/* Articles by category */}
      <section className="bg-surface-gray py-section">
        <Container>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((group) => (
              <div
                key={group.id}
                id={group.id}
                className="scroll-mt-24 bg-surface border border-line p-7"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center bg-navy/5 text-navy-700">
                    <Icon name={group.icon} size={22} />
                  </span>
                  <p className="label-caps text-gold">{group.category}</p>
                </div>
                <ul className="mt-6 space-y-4">
                  {group.items.map((item) => (
                    <li key={item.title}>
                      <Link
                        href={item.href}
                        className="group flex items-start gap-2 text-sm font-medium text-navy hover:text-gold"
                      >
                        <Icon
                          name="arrow_forward"
                          size={16}
                          className="mt-0.5 shrink-0 text-gold transition-transform group-hover:translate-x-0.5"
                        />
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Coming soon card */}
            <div className="border border-dashed border-line bg-surface p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center bg-navy/5 text-navy-700">
                  <Icon name="more_horiz" size={22} />
                </span>
                <p className="label-caps text-slate">More Coming Soon</p>
              </div>
              <p className="mt-6 text-sm text-slate">
                Additional guides covering OFW property ownership, investor
                support, and property documentation are being prepared.
              </p>
              <Button href="/contact" variant="ghost" className="mt-5">
                Request a Guide Topic
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <CtaBand
        title="Have a property question?"
        body="All Abode can help with leasing, selling, managing, buying, renting, or appraisal. Contact us for guidance."
      >
        <Button href="/contact" size="lg">
          Contact All Abode
        </Button>
        <Button href="/listings" variant="ghost" size="lg">
          View Listings
        </Button>
      </CtaBand>
    </>
  );
}
