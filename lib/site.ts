export const site = {
  name: "All Abode Property Solutions",
  shortName: "All Abode",
  tagline: "Complete Property Services. One Trusted Partner.",
  descriptor: "Brokerage | Leasing | Property Management | Appraisal",
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

/** Founder / licensed-professional credibility (brand guide §8.9 + §3.2).
 *  Public name confirmed as "Chel". Full legal name + PRC license numbers
 *  are pending (brand guide §0 missing-info checklist). */
export const founder = {
  name: "Chel",
  title: "Licensed Real Estate Broker & Appraiser",
  license: "PRC License No. — to confirm",
  relationship: "Founder of Properties by Chel",
  bio: "Properties by Chel is the personal real estate advisory and educational brand of Chel, founder of All Abode Property Solutions. All Abode combines professional guidance, organized coordination, and transparent service to help clients make better property decisions through brokerage, leasing, property management, and appraisal.",
  photo: "", // set to "/founder.jpg" etc. once the headshot is provided
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
    { label: "Leasing", href: "/leasing" },
    { label: "Buy / Sell", href: "/buy-sell" },
    { label: "Property Management", href: "/property-management" },
    { label: "Appraisal", href: "/appraisal" },
    { label: "Listings", href: "/listings" },
  ],
  clientActions: [
    { label: "Find a Property", href: "/listings" },
    { label: "List Your Property", href: "/list-your-property" },
    { label: "Request an Appraisal", href: "/appraisal" },
    { label: "Ask About Management", href: "/property-management" },
    { label: "Contact Us", href: "/contact" },
  ],
} as const;
