export const site = {
  name: "All Abode Property Solutions",
  shortName: "All Abode",
  tagline: "Complete Property Support, All Under One Roof.",
  domain: "allabodeph.com",
  phone: "+63 2 8888 1234",
  phoneHref: "tel:+63288881234",
  email: "hello@allabodeph.com",
  emailHref: "mailto:hello@allabodeph.com",
  serviceArea: "Metro Manila · Cebu · Davao",
  location: "Makati City, Philippines",
  // Social / messaging — PLACEHOLDERS, confirm from the brand guide.
  facebook: "https://facebook.com/allabodeph",
  messenger: "https://m.me/allabodeph",
  viber: "viber://chat?number=%2B63288881234",
  whatsapp: "https://wa.me/63288881234",
} as const;

/** Founder / licensed-professional credibility (brief: Home + About).
 *  PLACEHOLDERS — replace with the real details from the brand guide. */
export const founder = {
  name: "[Founder name — to confirm]",
  title: "Licensed Real Estate Broker & Appraiser",
  license: "PRC Broker & Appraiser License No. — to confirm",
  relationship: "Founder of Properties by Chel",
  bio: "A PRC-licensed Real Estate Broker and Appraiser, our founder built All Abode on the trusted foundation of Properties by Chel — pairing institutional-grade brokerage, leasing, management, and valuation expertise with a personal, relationship-led approach to every client.",
  photo: "", // e.g. "/founder.jpg" — leave empty to show the placeholder portrait
} as const;

export type NavLink = { label: string; href: string };
export type NavGroup = { label: string; children: readonly NavLink[] };
export type NavItem = NavLink | NavGroup;

/** Services grouped under a dropdown to keep the bar uncluttered. */
export const serviceLinks: readonly NavLink[] = [
  { label: "Leasing", href: "/leasing" },
  { label: "Buy / Sell", href: "/buy-sell" },
  { label: "Property Management", href: "/property-management" },
  { label: "Appraisal", href: "/appraisal" },
];

export const mainNav: readonly NavItem[] = [
  { label: "Listings", href: "/listings" },
  { label: "Services", children: serviceLinks },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const footerNav = {
  services: [
    { label: "Brokerage", href: "/buy-sell" },
    { label: "Appraisal", href: "/appraisal" },
    { label: "Leasing", href: "/leasing" },
    { label: "Property Management", href: "/property-management" },
  ],
  quickLinks: [
    { label: "About Us", href: "/about" },
    { label: "Listings", href: "/listings" },
    { label: "List Your Property", href: "/list-your-property" },
    { label: "Contact", href: "/contact" },
  ],
} as const;
