import { getPublicSiteUrl } from "@/lib/url";

export const LEAD_TYPES = [
  "inquiry",
  "viewing",
  "appraisal",
  "property-management",
  "contact",
  "list-property",
] as const;

export type LeadType = (typeof LEAD_TYPES)[number];

const NAME_MAX = 120;
const EMAIL_MAX = 254;
const PHONE_MAX = 30;
const MESSAGE_MAX = 4000;
const LOCATION_MAX = 200;
const SHORT_FREE_TEXT_MAX = 60; // floorArea, price — free text, not typed numeric columns

function isEmail(v: unknown): v is string {
  return typeof v === "string" && v.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Trims, truncates to max length, empty → null (Postgres text/date columns reject ""). */
function capLen(v: unknown, max: number): string | null {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
  if (s === "") return null;
  return s.slice(0, max);
}

/** Empty/out-of-bounds/non-numeric → null rather than a hard error (optional fields). */
function nzInt(v: unknown, min: number, max: number): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const t = Math.trunc(n);
  if (t < min || t > max) return null;
  return t;
}

/** YYYY-MM-DD date-input value → null unless it parses to a real date. */
function validDate(v: unknown): string | null {
  const s = capLen(v, 10);
  if (s == null) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
}

type EnumResult = { ok: true; value: string | null } | { ok: false };

/** Empty → valid (null). Present-but-not-in-list → invalid, since a real <select> can never produce it. */
function enumOrReject(v: unknown, allowed: readonly string[]): EnumResult {
  if (v == null || v === "") return { ok: true, value: null };
  if (typeof v !== "string" || !allowed.includes(v)) return { ok: false };
  return { ok: true, value: v };
}

const PROPERTY_TYPES_BY_TYPE: Record<string, readonly string[]> = {
  appraisal: ["Condominium", "House and Lot", "Vacant Lot", "Commercial", "Industrial / Warehouse", "Agricultural"],
  "property-management": ["Condominium", "House and Lot", "Apartment", "Commercial", "Mixed-use"],
  contact: ["Condominium", "House and Lot", "Lot", "Commercial", "Office", "Industrial / Warehouse", "Parking", "Other / Not applicable"],
  "list-property": ["Condominium", "House and Lot", "Apartment", "Townhouse", "Commercial", "Lot"],
};

const APPRAISAL_PURPOSES = [
  "Pre-sale valuation",
  "Bank loan / collateral",
  "Estate / inheritance",
  "Legal / dispute",
  "Investment analysis",
] as const;

const OCCUPANCY_STATUSES = ["Vacant", "Partially occupied", "Fully occupied"] as const;

const NEEDED_SERVICES = [
  "Full Leasing & Property Management",
  "Tenant Hunting: We Lease, You Manage",
  "Vacant Unit Management",
  "Furnishing & Rental-Ready Setup",
  "Owner Assistance Services",
] as const;

const USER_TYPES = ["Property Owner", "Buyer", "Seller", "Tenant", "Investor", "Business", "Other"] as const;

const HELP_WITH_OPTIONS = [
  "Brokerage",
  "Leasing",
  "Property Management",
  "Valuation",
  "Documentation Assistance",
  "Listings Inquiry",
  "General Inquiry",
] as const;

const INTENDED_SERVICES = ["Lease my property", "Sell my property", "Property management", "Appraisal"] as const;

const PREFERRED_CONTACT_METHODS = ["Email", "Phone call", "Viber", "WhatsApp"] as const;

/**
 * Rejects a request whose Origin (or, failing that, Referer) is missing or
 * doesn't match this site. A raw script POSTing straight to the endpoint
 * typically sends neither header, while every real browser submission from
 * the form does — so unlike a generic CSRF check, missing-both is a hard
 * block here rather than a soft-allow.
 */
export function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  let candidate: string | null = origin;
  if (!candidate && referer) {
    try {
      candidate = new URL(referer).origin;
    } catch {
      candidate = null;
    }
  }
  if (!candidate) return false;

  try {
    return candidate === new URL(getPublicSiteUrl()).origin;
  } catch {
    return true;
  }
}

export type ValidationResult =
  | { ok: true; table: string; row: Record<string, unknown> }
  | { ok: false; status: number; error: string };

function fail(status: number, error: string): ValidationResult {
  return { ok: false, status, error };
}

export function validateAndBuildRow(type: LeadType, body: Record<string, unknown>): ValidationResult {
  if (body.consent !== true) {
    return fail(422, "Please accept the terms to continue.");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > NAME_MAX) {
    return fail(422, "A valid name is required.");
  }
  if (!isEmail(body.email)) {
    return fail(422, "A valid email is required.");
  }
  const email = body.email.trim();
  const phone = capLen(body.phone, PHONE_MAX);
  const message = capLen(body.message, MESSAGE_MAX);

  switch (type) {
    case "appraisal": {
      const propertyLocation = capLen(body.propertyLocation, LOCATION_MAX);
      if (!propertyLocation) return fail(422, "Property location is required.");
      const propertyType = enumOrReject(body.propertyType, PROPERTY_TYPES_BY_TYPE.appraisal);
      if (!propertyType.ok) return fail(422, "Invalid property type.");
      const purpose = enumOrReject(body.appraisalPurpose, APPRAISAL_PURPOSES);
      if (!purpose.ok) return fail(422, "Invalid appraisal purpose.");
      return {
        ok: true,
        table: "appraisal_requests",
        row: {
          name,
          email,
          phone,
          property_location: propertyLocation,
          property_type: propertyType.value,
          appraisal_purpose: purpose.value,
          preferred_inspection_date: validDate(body.preferredInspectionDate),
          message,
        },
      };
    }
    case "property-management": {
      const propertyLocation = capLen(body.propertyLocation, LOCATION_MAX);
      if (!propertyLocation) return fail(422, "Property location is required.");
      const propertyType = enumOrReject(body.propertyType, PROPERTY_TYPES_BY_TYPE["property-management"]);
      if (!propertyType.ok) return fail(422, "Invalid property type.");
      const occupancyStatus = enumOrReject(body.occupancyStatus, OCCUPANCY_STATUSES);
      if (!occupancyStatus.ok) return fail(422, "Invalid occupancy status.");
      const neededService = enumOrReject(body.neededService, NEEDED_SERVICES);
      if (!neededService.ok) return fail(422, "Invalid service selection.");
      return {
        ok: true,
        table: "property_management_leads",
        row: {
          owner_name: name,
          email,
          phone,
          property_location: propertyLocation,
          property_type: propertyType.value,
          number_of_units: nzInt(body.numberOfUnits, 1, 9999),
          occupancy_status: occupancyStatus.value,
          needed_service: neededService.value,
          message,
        },
      };
    }
    case "inquiry":
    case "viewing": {
      const preferredContactMethod = enumOrReject(body.preferredContactMethod, PREFERRED_CONTACT_METHODS);
      if (!preferredContactMethod.ok) return fail(422, "Invalid contact method.");
      return {
        ok: true,
        table: "inquiries",
        row: {
          type,
          name,
          email,
          phone,
          message,
          preferred_viewing_date: validDate(body.preferredViewingDate),
          preferred_contact_method: preferredContactMethod.value,
          details: { listing: capLen(body.listing, 200) },
        },
      };
    }
    case "contact": {
      const userType = enumOrReject(body.userType, USER_TYPES);
      if (!userType.ok) return fail(422, "Invalid selection.");
      const helpWith = enumOrReject(body.helpWith, HELP_WITH_OPTIONS);
      if (!helpWith.ok) return fail(422, "Invalid selection.");
      const propertyType = enumOrReject(body.propertyType, PROPERTY_TYPES_BY_TYPE.contact);
      if (!propertyType.ok) return fail(422, "Invalid property type.");
      return {
        ok: true,
        table: "inquiries",
        row: {
          type,
          name,
          email,
          phone,
          message,
          details: {
            userType: userType.value,
            helpWith: helpWith.value,
            propertyLocation: capLen(body.propertyLocation, LOCATION_MAX),
            propertyType: propertyType.value,
          },
        },
      };
    }
    case "list-property": {
      const propertyLocation = capLen(body.propertyLocation, LOCATION_MAX);
      if (!propertyLocation) return fail(422, "Property location is required.");
      const propertyType = enumOrReject(body.propertyType, PROPERTY_TYPES_BY_TYPE["list-property"]);
      if (!propertyType.ok) return fail(422, "Invalid property type.");
      const intendedService = enumOrReject(body.intendedService, INTENDED_SERVICES);
      if (!intendedService.ok) return fail(422, "Invalid service selection.");
      return {
        ok: true,
        table: "inquiries",
        row: {
          type,
          name,
          email,
          phone,
          message,
          details: {
            propertyLocation,
            propertyType: propertyType.value,
            intendedService: intendedService.value,
            bedrooms: nzInt(body.bedrooms, 0, 50),
            bathrooms: nzInt(body.bathrooms, 0, 50),
            floorArea: capLen(body.floorArea, SHORT_FREE_TEXT_MAX),
            price: capLen(body.price, SHORT_FREE_TEXT_MAX),
          },
        },
      };
    }
  }
}
