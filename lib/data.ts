/** Shared content used across the homepage and listing/service pages. */

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
    slug: "leasing",
    icon: "key",
    title: "Lease My Property",
    blurb:
      "Residential leasing for long-term, short stays / BnB, and bed space — plus commercial, office, industrial / warehouse, and parking leasing.",
    href: "/leasing",
    cta: "List for Leasing",
  },
  {
    slug: "brokerage",
    icon: "real_estate_agent",
    title: "Buy & Sell",
    blurb:
      "Brokerage for resale properties, lots and house & lots, condos, rent-to-own / lease-to-own, office, commercial, industrial, and parking.",
    href: "/buy-sell",
    cta: "Buy or Sell a Property",
  },
  {
    slug: "management",
    icon: "corporate_fare",
    title: "Manage My Property",
    blurb:
      "Full leasing & management, tenant hunting, vacant-unit care, furnishing, and owner assistance — tailored packages for busy owners, investors, and OFWs.",
    href: "/property-management",
    cta: "Get Management Support",
  },
  {
    slug: "appraisal",
    icon: "verified",
    title: "Request an Appraisal",
    blurb:
      "Request formal appraisal support for residential, commercial, land, estate, legal, investment, or pre-sale purposes.",
    href: "/appraisal",
    cta: "Request an Appraisal",
  },
  {
    slug: "documentation",
    icon: "history_edu",
    title: "Documentation Support",
    blurb:
      "Title transfer, notarial services, and property tax payments — processed end-to-end so your paperwork never stalls a transaction.",
    href: "/documentation",
    cta: "Get Documentation Help",
  },
];

export type ListingStatus = "For Sale" | "For Lease" | "Reserved" | "Sold";

export type Listing = {
  id: string;
  /** Real DB primary key (UUID) — absent for mock rows. Needed for booking/scheduling RPCs, which reference listings(id), not the slug. */
  dbId?: string;
  title: string;
  location: string;
  price: string;
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
    status: "For Lease",
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
    status: "For Lease",
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
  "For Lease": "bg-navy text-white",
  Reserved: "bg-reserved text-white",
  Sold: "bg-sold text-white",
};

export const trustPoints = [
  {
    icon: "verified_user",
    title: "Licensed Expertise",
    body: "Licensed real estate professional support for brokerage, leasing, property management, and appraisal.",
  },
  {
    icon: "hub",
    title: "One Service Brand",
    body: "Brokerage, leasing, management, and appraisal in one coordinated service partner.",
  },
  {
    icon: "chat",
    title: "Clear Communication",
    body: "Defined service scope, professional documentation, and responsive communication at every step.",
  },
  {
    icon: "lightbulb",
    title: "Practical Guidance",
    body: "Straightforward advice for owners, tenants, buyers, sellers, and investors — no unnecessary complexity.",
  },
  {
    icon: "devices",
    title: "Client-Ready Systems",
    body: "Purpose-built systems for inquiry management, lead tracking, and future client portal access.",
  },
];
