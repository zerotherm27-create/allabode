"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { PropertyCard } from "@/components/property-card";
import { type Listing, type ListingStatus } from "@/lib/data";

type StatusFilter = "All" | ListingStatus;
type TypeFilter = "All" | "Residential" | "Commercial";
type Sort = "featured" | "price-asc" | "price-desc";

const statusOptions: StatusFilter[] = [
  "All",
  "For Sale",
  "For Lease",
  "Reserved",
  "Sold",
];
const typeOptions: TypeFilter[] = ["All", "Residential", "Commercial"];

function priceValue(p: string) {
  const n = Number(p.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function ListingsBrowser({ listings }: { listings: Listing[] }) {
  const [status, setStatus] = useState<StatusFilter>("All");
  const [type, setType] = useState<TypeFilter>("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("featured");

  const results = useMemo(() => {
    let r = listings.filter((l) => {
      if (status !== "All" && l.status !== status) return false;
      if (type !== "All" && l.type !== type) return false;
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
    if (sort === "price-asc")
      r = [...r].sort((a, b) => priceValue(a.price) - priceValue(b.price));
    if (sort === "price-desc")
      r = [...r].sort((a, b) => priceValue(b.price) - priceValue(a.price));
    return r;
  }, [listings, status, type, query, sort]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <label className="relative flex-1 md:max-w-sm">
            <span className="sr-only">Search listings</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate">
              <Icon name="search" size={20} />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or location…"
              className="h-12 w-full rounded-md border border-line bg-surface pl-10 pr-4 text-base text-ink placeholder:text-slate-soft focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-11 rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-4 sm:flex-row sm:items-center sm:gap-8">
          <FilterRow
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(v) => setStatus(v as StatusFilter)}
          />
          <FilterRow
            label="Type"
            options={typeOptions}
            value={type}
            onChange={(v) => setType(v as TypeFilter)}
          />
        </div>
      </div>

      {/* Result count */}
      <p className="mt-6 text-sm text-slate" aria-live="polite">
        {results.length} {results.length === 1 ? "property" : "properties"} found
      </p>

      {/* Grid */}
      {results.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
          {results.map((listing) => (
            <PropertyCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-surface p-12 text-center">
          <span className="text-slate-soft">
            <Icon name="search_off" size={40} />
          </span>
          <h3 className="mt-4 font-display text-lg font-semibold text-navy">
            No properties match your filters
          </h3>
          <p className="mt-1 text-sm text-slate">
            Try clearing a filter or adjusting your search.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatus("All");
              setType("All");
              setQuery("");
            }}
            className="label-caps mt-5 border-b-2 border-navy pb-0.5 text-navy hover:border-gold hover:text-gold"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label-caps mr-1 text-slate">{label}</span>
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-navy text-white"
                : "bg-surface-gray text-slate hover:bg-line"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
