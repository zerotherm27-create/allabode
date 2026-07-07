import { site } from "@/lib/site";
import { getPublicSiteUrl } from "@/lib/url";

/** Renders a schema.org JSON-LD block. Server-safe, no client JS.
 *  All data comes from our own config/content, and `<` is escaped so no
 *  string value can ever close the script tag (per Next.js JSON-LD guidance). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/** Organization / LocalBusiness schema for the marketing layout.
 *  Accepts settings-derived overrides so admin-edited contact info reaches
 *  structured data too — defaults to the static `site` config for callers
 *  that don't have settings on hand. */
export function organizationSchema(overrides?: {
  email?: string;
  telephone?: string;
  areaServed?: string;
  addressLocality?: string;
  sameAs?: string;
}) {
  const base = getPublicSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: site.name,
    alternateName: site.shortName,
    legalName: site.legalName,
    url: base,
    email: overrides?.email || site.email,
    telephone: overrides?.telephone || site.phone,
    areaServed: overrides?.areaServed || site.serviceArea,
    address: {
      "@type": "PostalAddress",
      addressLocality: overrides?.addressLocality || site.location,
      addressCountry: "PH",
    },
    sameAs: [overrides?.sameAs || site.facebook],
  };
}

/** Service schema for a solution/valuation page. */
export function serviceSchema(opts: {
  name: string;
  description: string;
  path: string;
}) {
  const base = getPublicSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    url: `${base}${opts.path}`,
    provider: {
      "@type": "RealEstateAgent",
      name: site.name,
      legalName: site.legalName,
    },
    areaServed: site.serviceArea,
  };
}

/** BreadcrumbList schema mirroring the visible PageHero crumbs. */
export function breadcrumbSchema(crumbs: { label: string; href?: string }[]) {
  const base = getPublicSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${base}${c.href}` } : {}),
    })),
  };
}

/** FAQPage schema from q/a sections. */
export function faqPageSchema(
  sections: { items: { q: string; a: string }[] }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sections.flatMap((s) =>
      s.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      }))
    ),
  };
}
