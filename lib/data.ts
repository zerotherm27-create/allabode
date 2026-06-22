/** Shared content used across the homepage and listing/service pages. */

export type Service = {
  slug: string;
  icon: string;
  title: string;
  blurb: string;
  href: string;
};

export const services: Service[] = [
  {
    slug: "appraisal",
    icon: "verified",
    title: "Professional Appraisal",
    blurb:
      "Certified property valuations for legal, tax, and sales purposes in accordance with Philippine standards.",
    href: "/appraisal",
  },
  {
    slug: "brokerage",
    icon: "real_estate_agent",
    title: "Licensed Brokerage",
    blurb:
      "Seamless transactions for buying and selling premium residential and commercial assets.",
    href: "/buy-sell",
  },
  {
    slug: "management",
    icon: "corporate_fare",
    title: "Property Management",
    blurb:
      "Asset maintenance, tenant relations, and financial reporting for stress-free ownership.",
    href: "/property-management",
  },
  {
    slug: "leasing",
    icon: "key",
    title: "Leasing & Rentals",
    blurb:
      "End-to-end leasing solutions for landlords and corporate tenants in prime business districts.",
    href: "/leasing",
  },
];

export type ListingStatus = "For Sale" | "For Lease" | "Reserved" | "Sold";

export type Listing = {
  id: string;
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
  /* ---- Detail fields (from the DB; optional so mock rows still type-check) ---- */
  propertyType?: string;
  listingType?: string;
  furnishing?: string;
  parking?: number;
  lotArea?: string;
  leaseTerms?: string;
  saleTerms?: string;
  availabilityDate?: string;
};

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
    title: "Government Licensed",
    body: "Fully compliant with the Real Estate Service Act of the Philippines (RESA Law).",
  },
  {
    icon: "location_city",
    title: "National Coverage",
    body: "Operating in Metro Manila, Cebu, Davao, and key emerging provincial hubs.",
  },
  {
    icon: "insights",
    title: "Data-Driven Valuation",
    body: "We use rigorous analytical methods to determine fair market value, not just estimates.",
  },
];
