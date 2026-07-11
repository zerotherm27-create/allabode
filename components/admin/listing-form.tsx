"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icon";
import { generateListingDescription } from "@/app/admin/actions";
import { LISTING_CATEGORIES } from "@/lib/listing-category";

export type ListingValues = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  location?: string;
  city?: string;
  province?: string;
  private_address?: string;
  price?: number | null;
  price_label?: string;
  rent_price?: number | null;
  rent_price_label?: string;
  listing_category?: string;
  lease_type?: string;
  property_type?: string;
  status?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor_area?: number | null;
  lot_area?: number | null;
  parking?: number | null;
  furnishing?: string;
  amenities?: string[];
  lease_terms?: string;
  sale_terms?: string;
  availability_date?: string;
  is_featured?: boolean;
  owner_name?: string;
  owner_contact?: string;
  internal_notes?: string;
  unit_id?: string | null;
};

/** A property-management unit, offered as an optional auto-fill source for a listing. */
export type UnitOption = {
  id: string;
  unitLabel: string;
  propertyName: string;
  propertyAddress: string;
  city: string | null;
  province: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floorArea: number | null;
  baseRent: number | null;
};

const LEASE_TYPES = ["", "Short-term", "Long-term", "Bed space"];
const PROPERTY_TYPES = [
  "Condo", "House and Lot", "Apartment", "Townhouse", "Dorm / Bed Space",
  "Commercial", "Office", "Lot", "Warehouse", "Other",
];
const STATUSES = ["Draft", "Published", "Available", "Reserved", "Leased", "Sold", "Archived"];

const inputCls =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";

function F({ label, hint, children, span }: { label: string; hint?: string; children: React.ReactNode; span?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${span ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium text-navy">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate">{hint}</span>}
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-line bg-surface p-6">
      <legend className="px-2 font-display text-sm font-semibold text-navy">{title}</legend>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
    >
      {pending ? (
        <>
          <Icon name="progress_activity" size={18} className="animate-spin" />
          Saving…
        </>
      ) : (
        "Save listing"
      )}
    </button>
  );
}

export function ListingForm({
  action,
  initial = {},
  aiEnabled = false,
  units = [],
}: {
  action: (fd: FormData) => void | Promise<void>;
  initial?: ListingValues;
  /** Whether OPENAI_API_KEY is configured server-side — hides the AI-generate button otherwise. */
  aiEnabled?: boolean;
  /** Property-management units offered as an optional auto-fill source. */
  units?: UnitOption[];
}) {
  const v = initial;
  const formRef = useRef<HTMLFormElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const listingCategoryRef = useRef<HTMLSelectElement>(null);
  const propertyTypeRef = useRef<HTMLSelectElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const provinceRef = useRef<HTMLInputElement>(null);
  const privateAddressRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const priceLabelRef = useRef<HTMLInputElement>(null);
  const bedroomsRef = useRef<HTMLInputElement>(null);
  const bathroomsRef = useRef<HTMLInputElement>(null);
  const floorAreaRef = useRef<HTMLInputElement>(null);
  const [genPending, setGenPending] = useState(false);
  const [genError, setGenError] = useState("");
  const [category, setCategory] = useState(v.listing_category ?? "For Sale");

  function handleUnitPick(unitId: string) {
    const u = units.find((x) => x.id === unitId);
    if (!u) return;
    if (listingCategoryRef.current) listingCategoryRef.current.value = "For Lease";
    setCategory("For Lease");
    if (u.propertyType && propertyTypeRef.current) propertyTypeRef.current.value = u.propertyType;
    if (locationRef.current) locationRef.current.value = [u.propertyName, u.city].filter(Boolean).join(", ");
    if (cityRef.current && u.city) cityRef.current.value = u.city;
    if (provinceRef.current && u.province) provinceRef.current.value = u.province;
    if (privateAddressRef.current) {
      privateAddressRef.current.value = [u.propertyAddress, u.unitLabel].filter(Boolean).join(", ");
    }
    if (u.baseRent != null) {
      if (priceRef.current) priceRef.current.value = String(u.baseRent);
      if (priceLabelRef.current) priceLabelRef.current.value = "per month";
    }
    if (u.bedrooms != null && bedroomsRef.current) bedroomsRef.current.value = String(u.bedrooms);
    if (u.bathrooms != null && bathroomsRef.current) bathroomsRef.current.value = String(u.bathrooms);
    if (u.floorArea != null && floorAreaRef.current) floorAreaRef.current.value = String(u.floorArea);
  }

  async function handleGenerateDescription() {
    if (!formRef.current) return;
    setGenError("");
    setGenPending(true);
    try {
      const fd = new FormData(formRef.current);
      const num = (key: string) => (fd.get(key) ? Number(fd.get(key)) : null);
      const result = await generateListingDescription({
        title: String(fd.get("title") ?? ""),
        location: String(fd.get("location") ?? ""),
        city: String(fd.get("city") ?? ""),
        province: String(fd.get("province") ?? ""),
        listingCategory: String(fd.get("listing_category") ?? ""),
        leaseType: String(fd.get("lease_type") ?? ""),
        propertyType: String(fd.get("property_type") ?? ""),
        bedrooms: num("bedrooms"),
        bathrooms: num("bathrooms"),
        floorArea: num("floor_area"),
        lotArea: num("lot_area"),
        furnishing: String(fd.get("furnishing") ?? ""),
        price: num("price"),
        priceLabel: String(fd.get("price_label") ?? ""),
        amenities: String(fd.get("amenities") ?? "").split(",").map((a) => a.trim()).filter(Boolean),
      });
      if (!result) {
        setGenError("Couldn't generate a description right now — please try again.");
        return;
      }
      if (descriptionRef.current) descriptionRef.current.value = result;
    } catch {
      setGenError("Couldn't generate a description right now — please try again.");
    } finally {
      setGenPending(false);
    }
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-6">
      {units.length > 0 && (
        <Group title="Link to a unit">
          <F label="Property-management unit" hint="Auto-fills location, price, and specs below — you can still edit them after picking." span>
            <select
              name="unit_id"
              defaultValue={v.unit_id ?? ""}
              onChange={(e) => handleUnitPick(e.target.value)}
              className={inputCls}
            >
              <option value="">Not linked — enter manually</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.propertyName} — {u.unitLabel}
                </option>
              ))}
            </select>
          </F>
        </Group>
      )}

      <Group title="Basics">
        <F label="Title"><input name="title" defaultValue={v.title} required className={inputCls} /></F>
        <F label="Slug" hint="Auto-generated from title if left blank">
          <input name="slug" defaultValue={v.slug} className={inputCls} />
        </F>
        <F label="Description" span>
          <textarea ref={descriptionRef} name="description" defaultValue={v.description} rows={4} className={`${inputCls} h-auto py-2`} />
          {aiEnabled && (
            <div className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={genPending}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-navy disabled:opacity-50"
              >
                <Icon name={genPending ? "progress_activity" : "auto_awesome"} size={16} className={genPending ? "animate-spin" : ""} />
                {genPending ? "Generating…" : "Generate with AI"}
              </button>
              {genError && <span role="alert" className="text-xs text-error">{genError}</span>}
            </div>
          )}
        </F>
      </Group>

      <Group title="Classification">
        <F label="Listing category">
          <select
            ref={listingCategoryRef}
            name="listing_category"
            defaultValue={v.listing_category ?? "For Sale"}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            {LISTING_CATEGORIES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </F>
        <F label="Lease type" hint="For rentals only">
          <select name="lease_type" defaultValue={v.lease_type ?? ""} className={inputCls}>
            {LEASE_TYPES.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
          </select>
        </F>
        <F label="Property type">
          <select ref={propertyTypeRef} name="property_type" defaultValue={v.property_type ?? "Condo"} className={inputCls}>
            {PROPERTY_TYPES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </F>
        <F label="Status">
          <select name="status" defaultValue={v.status ?? "Draft"} className={inputCls}>
            {STATUSES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </F>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" name="is_featured" defaultChecked={v.is_featured} className="h-4 w-4 accent-navy" />
          <span className="text-sm text-navy">Featured (show on homepage)</span>
        </label>
      </Group>

      <Group title="Location">
        <F label="Location (public)"><input ref={locationRef} name="location" defaultValue={v.location} className={inputCls} /></F>
        <F label="City"><input ref={cityRef} name="city" defaultValue={v.city} className={inputCls} /></F>
        <F label="Province"><input ref={provinceRef} name="province" defaultValue={v.province} className={inputCls} /></F>
        <F label="Exact address" hint="Private — admin only">
          <input ref={privateAddressRef} name="private_address" defaultValue={v.private_address} className={inputCls} />
        </F>
      </Group>

      <Group title="Pricing & specs">
        <F label="Price (₱)"><input ref={priceRef} name="price" type="number" step="0.01" defaultValue={v.price ?? undefined} className={inputCls} /></F>
        <F label="Price label" hint="e.g. per month, total contract price">
          <input ref={priceLabelRef} name="price_label" defaultValue={v.price_label} className={inputCls} />
        </F>
        {category === "For Sale and For Lease" && (
          <>
            <F label="Rent price (₱)" hint="Monthly rent — shown alongside the sale price above">
              <input name="rent_price" type="number" step="0.01" defaultValue={v.rent_price ?? undefined} className={inputCls} />
            </F>
            <F label="Rent price label" hint="e.g. per month">
              <input name="rent_price_label" defaultValue={v.rent_price_label} className={inputCls} />
            </F>
          </>
        )}
        <F label="Bedrooms" hint="0 = Studio"><input ref={bedroomsRef} name="bedrooms" type="number" min={0} defaultValue={v.bedrooms ?? undefined} className={inputCls} /></F>
        <F label="Bathrooms"><input ref={bathroomsRef} name="bathrooms" type="number" defaultValue={v.bathrooms ?? undefined} className={inputCls} /></F>
        <F label="Floor area (sqm)"><input ref={floorAreaRef} name="floor_area" type="number" step="0.01" defaultValue={v.floor_area ?? undefined} className={inputCls} /></F>
        <F label="Lot area (sqm)"><input name="lot_area" type="number" step="0.01" defaultValue={v.lot_area ?? undefined} className={inputCls} /></F>
        <F label="Parking slots"><input name="parking" type="number" defaultValue={v.parking ?? undefined} className={inputCls} /></F>
        <F label="Furnishing">
          <select name="furnishing" defaultValue={v.furnishing ?? ""} className={inputCls}>
            {["", "Fully furnished", "Semi-furnished", "Unfurnished"].map((o) => <option key={o} value={o}>{o || "—"}</option>)}
          </select>
        </F>
        <F label="Availability date" hint="Use a calendar date. Put notes like RFO in lease/sale terms or internal notes.">
          <input name="availability_date" type="date" defaultValue={v.availability_date} className={inputCls} />
        </F>
      </Group>

      <Group title="Terms & amenities">
        <F label="Lease terms" span><input name="lease_terms" defaultValue={v.lease_terms} className={inputCls} /></F>
        <F label="Sale terms" span><input name="sale_terms" defaultValue={v.sale_terms} className={inputCls} /></F>
        <F label="Amenities" hint="Comma-separated" span>
          <input name="amenities" defaultValue={v.amenities?.join(", ")} className={inputCls} />
        </F>
      </Group>

      <Group title="Private (admin only)">
        <F label="Owner name"><input name="owner_name" defaultValue={v.owner_name} className={inputCls} /></F>
        <F label="Owner contact"><input name="owner_contact" defaultValue={v.owner_contact} className={inputCls} /></F>
        <F label="Internal notes" span>
          <textarea name="internal_notes" defaultValue={v.internal_notes} rows={3} className={`${inputCls} h-auto py-2`} />
        </F>
      </Group>

      <div className="flex items-center gap-3">
        <SubmitButton />
        <Link href="/admin/listings" className="text-sm font-medium text-slate hover:text-navy">
          Cancel
        </Link>
      </div>
    </form>
  );
}
