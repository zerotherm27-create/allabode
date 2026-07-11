/** Shared content used across the homepage and listing/service pages. */

import type { ListingMarket } from "@/lib/listing-category";

export type Service = {
  slug: string;
  icon: string;
  title: string;
  blurb: string;
  href: string;
  cta?: string;
};

export const services: Service[] = [
  {
    slug: "brokerage",
    icon: "real_estate_agent",
    title: "Brokerage",
    blurb:
      "Buy, sell, and market properties with support from licensed real estate professionals. We assist with resale units, house and lots, lots, condominiums, commercial spaces, offices, industrial properties, and parking slots.",
    href: "/property-solutions/brokerage",
    cta: "Explore Brokerage",
  },
  {
    slug: "leasing",
    icon: "key",
    title: "Leasing",
    blurb:
      "Lease out your property or find a rental that fits your needs. We assist with residential leasing, long-term leases, short-stay coordination, bedspace leasing (shared-room rentals), commercial leases, office spaces, warehouses, and parking.",
    href: "/property-solutions/leasing",
    cta: "Explore Leasing",
  },
  {
    slug: "management",
    icon: "corporate_fare",
    title: "Property Management",
    blurb:
      "Keep your property cared for even when you are busy or away. We assist with rent collection, maintenance coordination, cleaning, furnishing, fit-out, turnover, and owner support.",
    href: "/property-solutions/property-management",
    cta: "Get Property Management",
  },
  {
    slug: "valuation",
    icon: "verified",
    title: "Valuation & Appraisal",
    blurb:
      "Request professional valuation and appraisal support for residential, commercial, office, industrial, and investment properties.",
    href: "/valuation",
    cta: "Request Valuation",
  },
  {
    slug: "documentation",
    icon: "history_edu",
    title: "Documentation Assistance",
    blurb:
      "Get help coordinating title transfer, tax payment assistance, notarial coordination, and property-related document processing.",
    href: "/property-solutions/documentation-assistance",
    cta: "Get Documentation Help",
  },
];

export type ListingStatus = "For Sale" | "For Rent" | "For Sale & For Rent" | "Reserved" | "Sold";

export type Listing = {
  id: string;
  /** Real DB primary key (UUID) — absent for mock rows. Needed for booking/scheduling RPCs, which reference listings(id), not the slug. */
  dbId?: string;
  title: string;
  location: string;
  price: string;
  /** Sale-side price, formatted — set for "For Sale" and dual-market listings. */
  salePrice?: string;
  /** Rent-side price, formatted with "/mo" — set for "For Lease" and dual-market listings. */
  rentPrice?: string;
  status: ListingStatus;
  type: "Residential" | "Commercial";
  beds?: number;
  baths?: number;
  area: string;
  /** Extra spec rows for commercial units (e.g. parking, use). */
  specs?: { icon: string; label: string }[];
  /** Tailwind gradient classes used for the placeholder image band. */
  gradient: string;
  /** Uploaded gallery photos, sorted by display order. Empty/absent falls back to `gradient`. */
  images?: { url: string; alt: string | null }[];
  /* ---- Detail fields (from the DB; optional so mock rows still type-check) ---- */
  propertyType?: string;
  listingType?: string;
  listingTypes?: string[];
  listingMarkets?: ListingMarket[];
  furnishing?: string;
  parking?: number;
  lotArea?: string;
  leaseTerms?: string;
  saleTerms?: string;
  availabilityDate?: string;
  /** AI-assisted nearby-places cache, refreshed on demand by staff. */
  nearbyPlaces?: { name: string; category: string; distanceM: number; blurb?: string }[];
  nearbyPlacesUpdatedAt?: string;
};

/** "Studio" for 0 bedrooms, "N Bedroom(s)" otherwise, undefined when unspecified. */
export function formatBeds(beds?: number): string | undefined {
  if (beds == null) return undefined;
  return beds === 0 ? "Studio" : `${beds} Bedroom${beds === 1 ? "" : "s"}`;
}

export const listings: Listing[] = [
  {
    id: "modern-zen-loyola",
    title: "Modern Zen Estate",
    location: "Loyola Grand Villas, Quezon City",
    price: "₱ 45,000,000",
    status: "For Sale",
    type: "Residential",
    propertyType: "House and Lot",
    listingType: "For Sale",
    beds: 5,
    baths: 4,
    area: "450 sqm",
    lotArea: "520 sqm",
    parking: 2,
    furnishing: "Semi-furnished",
    saleTerms: "Cash or bank financing",
    availabilityDate: "Available now",
    gradient: "from-navy via-navy-700 to-navy-600",
  },
  {
    id: "executive-proscenium",
    title: "Executive Suite, The Proscenium",
    location: "Rockwell, Makati City",
    price: "₱ 120,000/mo",
    status: "For Rent",
    type: "Residential",
    propertyType: "Condo",
    listingType: "Long-term",
    beds: 2,
    baths: 2,
    area: "98 sqm",
    parking: 1,
    furnishing: "Fully furnished",
    leaseTerms: "12-month minimum, 2 months deposit",
    availabilityDate: "Available now",
    gradient: "from-navy-800 via-navy-700 to-navy-600",
  },
  {
    id: "commercial-salcedo",
    title: "Commercial Floor, Salcedo Village",
    location: "Salcedo Village, Makati City",
    price: "₱ 28,500,000",
    status: "Reserved",
    type: "Commercial",
    propertyType: "Office",
    listingType: "For Sale",
    area: "210 sqm",
    parking: 3,
    furnishing: "Unfurnished (bare shell)",
    saleTerms: "Total contract price",
    availabilityDate: "Reserved",
    specs: [
      { icon: "work", label: "Office" },
      { icon: "local_parking", label: "3 Slots" },
      { icon: "square_foot", label: "210 sqm" },
    ],
    gradient: "from-navy via-navy-800 to-navy-700",
  },
  {
    id: "garden-villa-alabang",
    title: "Garden Villa, Ayala Alabang",
    location: "Ayala Alabang, Muntinlupa",
    price: "₱ 62,000,000",
    status: "For Sale",
    type: "Residential",
    propertyType: "House and Lot",
    listingType: "For Sale",
    beds: 6,
    baths: 5,
    area: "620 sqm",
    lotArea: "800 sqm",
    parking: 4,
    furnishing: "Unfurnished",
    saleTerms: "Cash or bank financing",
    availabilityDate: "Available now",
    gradient: "from-navy-700 via-navy-600 to-navy-800",
  },
  {
    id: "skyline-bgc",
    title: "Skyline Loft, Uptown BGC",
    location: "Bonifacio Global City, Taguig",
    price: "₱ 95,000/mo",
    status: "For Rent",
    type: "Residential",
    propertyType: "Condo",
    listingType: "Short-term",
    beds: 1,
    baths: 1,
    area: "64 sqm",
    parking: 1,
    furnishing: "Fully furnished",
    leaseTerms: "Short-term, flexible",
    availabilityDate: "Available now",
    gradient: "from-navy-800 via-navy to-navy-700",
  },
  {
    id: "retail-cebu",
    title: "Retail Space, Cebu Business Park",
    location: "Cebu Business Park, Cebu City",
    price: "₱ 18,750,000",
    status: "Sold",
    type: "Commercial",
    propertyType: "Commercial",
    listingType: "For Sale",
    area: "150 sqm",
    parking: 2,
    furnishing: "Unfurnished (bare shell)",
    saleTerms: "Total contract price",
    availabilityDate: "Sold",
    specs: [
      { icon: "storefront", label: "Retail" },
      { icon: "local_parking", label: "2 Slots" },
      { icon: "square_foot", label: "150 sqm" },
    ],
    gradient: "from-navy-600 via-navy-700 to-navy-800",
  },
];

export const statusStyles: Record<ListingStatus, string> = {
  "For Sale": "bg-available text-white",
  "For Rent": "bg-navy text-white",
  "For Sale & For Rent": "bg-gold text-navy",
  Reserved: "bg-reserved text-white",
  Sold: "bg-sold text-white",
};

export const trustPoints = [
  {
    icon: "verified_user",
    title: "Licensed Real Estate Support",
    body: "Brokerage and valuation services performed under the supervision of duly licensed real estate service practitioners.",
  },
  {
    icon: "hub",
    title: "Everything in One Place",
    body: "Brokerage, valuation, leasing, property management, and documentation assistance from one coordinated team.",
  },
  {
    icon: "support_agent",
    title: "Practical, Hands-On Support",
    body: "Real help for property owners and tenants: viewings, coordination, follow-ups, and day-to-day property concerns.",
  },
  {
    icon: "route",
    title: "Clear Process",
    body: "A clear path from inquiry to completion, with organized documentation and updates at every step.",
  },
  {
    icon: "location_on",
    title: "Local Coordination",
    body: "On-the-ground coordination for property-related concerns, offices, buildings, and service providers.",
  },
];

/** Legal/regulatory credentials, displayed near trust-building content. Leave a credential out entirely (don't placeholder it) until the real number is confirmed. */
export const credentials = [
  { label: "SEC Registration No.", value: "202607025713305" },
  { label: "PRC Real Estate Broker License No.", value: "0035712" },
  { label: "PRC Real Estate Appraiser License No.", value: "0012992" },
  { label: "PTR No.", value: "2948777" },
];

export type Testimonial = {
  name: string;
  role: string;
  quote: string;
};

export const testimonials: Testimonial[] = [
  {
    name: "Paul David",
    role: "OFW, Property Owner",
    quote:
      "I am very demanding with how I want my properties to be managed. All Abode seemed to intuitively understand my needs before I even mention it. They are very proactive and responsive. Together with MVRX Designs, they turned our humble abode into a haven in the middle of the city, making our unit one of the most sought-after. Thank you!",
  },
  {
    name: "Paula Lee Nacionales",
    role: "OFW, Property Owner",
    quote: "Management service is great and very prompt on monthly reports.",
  },
];
