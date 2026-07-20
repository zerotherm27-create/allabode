"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { PropertyCard } from "@/components/property-card";
import { type Listing } from "@/lib/data";

type Sort = "featured" | "price-asc" | "price-desc";

function priceValue(p: string) {
  const n = Number(p.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function availabilityOf(l: Listing): "Available" | "Reserved" | "Sold" {
  if (l.status === "Reserved") return "Reserved";
  if (l.status === "Sold") return "Sold";
  return "Available";
}

function listingTypeOptions(l: Listing): string[] {
  if (l.listingTypes?.length) return l.listingTypes;
  return l.listingType ? [l.listingType] : [];
}

const FURNISHING = ["Fully furnished", "Semi-furnished", "Unfurnished"];

export function ListingsBrowser({
  listings,
  priceContext,
}: {
  listings: Listing[];
  /** Force a single market's price on cards, even for dual-market listings (used on /listings/for-sale and /listings/for-rent). */
  priceContext?: "sale" | "rent";
}) {
  const [query, setQuery] = useState("");
  const [listingType, setListingType] = useState("All");
  const [propertyType, setPropertyType] = useState("All");
  const [minBeds, setMinBeds] = useState(-1); // -1 = Any, 0 = Studio (exact), 1+ = at least N
  const [minBaths, setMinBaths] = useState(0);
  const [furnishing, setFurnishing] = useState("All");
  const [availability, setAvailability] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<Sort>("featured");

  // Option lists derived from the data so they stay in sync with the catalogue.
  const listingTypes = useMemo(
    () => ["All", ...Array.from(new Set(listings.flatMap(listingTypeOptions)))],
    [listings]
  );
  const propertyTypes = useMemo(
    () => ["All", ...Array.from(new Set(listings.map((l) => l.propertyType).filter(Boolean) as string[]))],
    [listings]
  );

  const reset = () => {
    setQuery("");
    setListingType("All");
    setPropertyType("All");
    setMinBeds(-1);
    setMinBaths(0);
    setFurnishing("All");
    setAvailability("All");
    setMinPrice("");
    setMaxPrice("");
  };

  const results = useMemo(() => {
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    let r = listings.filter((l) => {
      if (listingType !== "All" && !listingTypeOptions(l).includes(listingType)) return false;
      if (propertyType !== "All" && l.propertyType !== propertyType) return false;
      if (availability !== "All" && availabilityOf(l) !== availability) return false;
      if (minBeds === 0 && (l.beds ?? -1) !== 0) return false;
      if (minBeds > 0 && (l.beds ?? 0) < minBeds) return false;
      if (minBaths > 0 && (l.baths ?? 0) < minBaths) return false;
      if (furnishing !== "All" && !(l.furnishing ?? "").startsWith(furnishing.split(" ")[0]))
        return false;
      const pv = priceValue(l.price);
      if (min != null && pv < min) return false;
      if (max != null && pv > max) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (
          !l.title.toLowerCase().includes(q) &&
          !l.location.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
    if (sort === "price-asc") r = [...r].sort((a, b) => priceValue(a.price) - priceValue(b.price));
    if (sort === "price-desc") r = [...r].sort((a, b) => priceValue(b.price) - priceValue(a.price));
    return r;
  }, [listings, query, listingType, propertyType, minBeds, minBaths, furnishing, availability, minPrice, maxPrice, sort]);

  const selectCls =
    "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr]">
      {/* Filter sidebar */}
      <aside aria-label="Listing filters" className="h-fit rounded-lg border border-line bg-surface p-6 lg:sticky lg:top-24">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-navy">Filters</h2>
          <button
            type="button"
            onClick={reset}
            className="min-h-[44px] px-2 text-sm text-gold-ink hover:underline"
          >
            Clear
          </button>
        </div>

        <label className="mt-5 flex items-center gap-2 rounded-md border border-line-strong px-3 focus-within:border-gold">
          <Icon name="search" size={20} className="text-slate" />
          <span className="sr-only">Search properties</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Location or keyword"
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-slate-soft"
          />
        </label>

        <div className="mt-6 flex flex-col gap-5">
          <Filter label="Listing type" htmlFor="filter-listing-type">
            <select id="filter-listing-type" value={listingType} onChange={(e) => setListingType(e.target.value)} className={selectCls}>
              {listingTypes.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Filter>

          <Filter label="Property type" htmlFor="filter-property-type">
            <select id="filter-property-type" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={selectCls}>
              {propertyTypes.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Filter>

          <Filter label="Availability" htmlFor="filter-availability">
            <select id="filter-availability" value={availability} onChange={(e) => setAvailability(e.target.value)} className={selectCls}>
              {["All", "Available", "Reserved", "Sold"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Filter>

          <Filter label="Furnishing" htmlFor="filter-furnishing">
            <select id="filter-furnishing" value={furnishing} onChange={(e) => setFurnishing(e.target.value)} className={selectCls}>
              {["All", ...FURNISHING].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Filter>

          <div className="grid grid-cols-2 gap-3">
            <Filter label="Beds (min)" htmlFor="filter-min-beds">
              <select id="filter-min-beds" value={minBeds} onChange={(e) => setMinBeds(Number(e.target.value))} className={selectCls}>
                {[-1, 0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n === -1 ? "Any" : n === 0 ? "Studio" : `${n}+`}</option>
                ))}
              </select>
            </Filter>
            <Filter label="Baths (min)" htmlFor="filter-min-baths">
              <select id="filter-min-baths" value={minBaths} onChange={(e) => setMinBaths(Number(e.target.value))} className={selectCls}>
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n === 0 ? "Any" : `${n}+`}</option>
                ))}
              </select>
            </Filter>
          </div>

          <Filter label="Price range (₱)">
            <div className="flex items-center gap-2">
              <input
                aria-label="Minimum price in Philippine Peso"
                inputMode="numeric"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Min"
                className={selectCls}
              />
              <span className="text-slate-soft" aria-hidden="true">—</span>
              <input
                aria-label="Maximum price in Philippine Peso"
                inputMode="numeric"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Max"
                className={selectCls}
              />
            </div>
          </Filter>
        </div>
      </aside>

      {/* Results */}
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate" aria-live="polite">
            <span className="font-semibold text-navy">{results.length}</span>{" "}
            {results.length === 1 ? "property" : "properties"} found
          </p>
          <label className="flex items-center gap-2 text-sm text-slate">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-10 rounded-md border border-line bg-surface px-3 text-sm font-medium text-navy focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </label>
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((listing) => (
              <PropertyCard key={listing.id} listing={listing} priceContext={priceContext} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-surface p-12 text-center">
            <span className="text-slate-soft">
              <Icon name="search_off" size={40} />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-navy">
              No properties match your filters
            </h3>
            <p className="mt-1 text-sm text-slate">Try clearing a filter or adjusting your search.</p>
            <button
              type="button"
              onClick={reset}
              className="label-caps mt-5 min-h-[44px] border-b-2 border-navy px-2 pb-0.5 text-navy hover:border-gold-ink hover:text-gold-ink"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Filter({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="label-caps mb-2 block text-navy">{label}</label>
      ) : (
        <p className="label-caps mb-2 text-navy">{label}</p>
      )}
      {children}
    </div>
  );
}
