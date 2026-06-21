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
} as const;

export const mainNav = [
  { label: "Listings", href: "/listings" },
  { label: "Leasing", href: "/leasing" },
  { label: "Buy / Sell", href: "/buy-sell" },
  { label: "Property Management", href: "/property-management" },
  { label: "Appraisal", href: "/appraisal" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

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
