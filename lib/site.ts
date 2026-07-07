export const site = {
  name: "All Abode Property Solutions",
  shortName: "All Abode",
  legalName: "All Abode Brokerage and Valuation OPC",
  tagline: "Property Solutions",
  descriptor: "Brokerage | Valuation | Leasing | Property Management | Documentation",
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
export type NavDropdown = { label: string; children: NavLink[] };
export type NavItem = NavLink | NavDropdown;

export function isDropdown(item: NavItem): item is NavDropdown {
  return "children" in item;
}

export const mainNav: readonly NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Property Solutions",
    children: [
      { label: "All Property Solutions", href: "/property-solutions" },
      { label: "Brokerage Solutions", href: "/property-solutions/brokerage" },
      { label: "Leasing Solutions", href: "/property-solutions/leasing" },
      { label: "Property Management Solutions", href: "/property-solutions/property-management" },
      { label: "Documentation Assistance", href: "/property-solutions/documentation-assistance" },
    ],
  },
  {
    label: "Listings",
    children: [
      { label: "All Listings", href: "/listings" },
      { label: "For Rent", href: "/listings/for-rent" },
      { label: "For Sale", href: "/listings/for-sale" },
      { label: "Commercial", href: "/listings/commercial" },
      { label: "Office", href: "/listings/office" },
      { label: "Industrial and Warehouse", href: "/listings/industrial-warehouse" },
      { label: "Parking", href: "/listings/parking" },
    ],
  },
  { label: "Valuation", href: "/valuation" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export const footerNav = {
  solutions: [
    { label: "Brokerage Solutions", href: "/property-solutions/brokerage" },
    { label: "Leasing Solutions", href: "/property-solutions/leasing" },
    { label: "Property Management Solutions", href: "/property-solutions/property-management" },
    { label: "Documentation Assistance", href: "/property-solutions/documentation-assistance" },
    { label: "Valuation", href: "/valuation" },
  ],
  listings: [
    { label: "For Rent", href: "/listings/for-rent" },
    { label: "For Sale", href: "/listings/for-sale" },
    { label: "Commercial", href: "/listings/commercial" },
    { label: "Office", href: "/listings/office" },
    { label: "Industrial and Warehouse", href: "/listings/industrial-warehouse" },
    { label: "Parking", href: "/listings/parking" },
  ],
  compliance: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
  ],
} as const;
