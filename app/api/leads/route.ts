import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Lead intake endpoint. Accepts inquiry / viewing / appraisal /
 * property-management / contact / list-property submissions and persists each
 * to its table (inquiries, appraisal_requests, property_management_leads).
 *
 * When Supabase env vars are absent the route validates and logs only, so the
 * UI flow works end-to-end in local/preview without a database.
 */

const LEAD_TYPES = [
  "inquiry",
  "viewing",
  "appraisal",
  "property-management",
  "contact",
  "list-property",
] as const;

type LeadType = (typeof LEAD_TYPES)[number];

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Empty strings → null (Postgres date/numeric columns reject ""). */
function nz(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v);
  return s === "" ? null : s;
}
function nzInt(v: unknown): number | null {
  const s = nz(v);
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function rowFor(
  type: LeadType,
  b: Record<string, unknown>
): { table: string; row: Record<string, unknown> } {
  switch (type) {
    case "appraisal":
      return {
        table: "appraisal_requests",
        row: {
          name: b.name,
          email: b.email,
          phone: nz(b.phone),
          property_location: nz(b.propertyLocation),
          property_type: nz(b.propertyType),
          appraisal_purpose: nz(b.appraisalPurpose),
          preferred_inspection_date: nz(b.preferredInspectionDate),
          message: nz(b.message),
        },
      };
    case "property-management":
      return {
        table: "property_management_leads",
        row: {
          owner_name: b.name,
          email: b.email,
          phone: nz(b.phone),
          property_location: nz(b.propertyLocation),
          property_type: nz(b.propertyType),
          number_of_units: nzInt(b.numberOfUnits),
          occupancy_status: nz(b.occupancyStatus),
          needed_service: nz(b.neededService),
          message: nz(b.message),
        },
      };
    default: {
      // inquiry | viewing | contact | list-property → inquiries
      const { name, email, phone, message, preferredViewingDate, preferredContactMethod, ...rest } =
        b;
      return {
        table: "inquiries",
        row: {
          type,
          name,
          email,
          phone: nz(phone),
          message: nz(message),
          preferred_viewing_date: nz(preferredViewingDate),
          preferred_contact_method: nz(preferredContactMethod),
          details: rest, // listing ref, helpWith, beds/baths/area/price, etc.
        },
      };
    }
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const type = body.type as LeadType;
  if (!LEAD_TYPES.includes(type)) {
    return NextResponse.json({ error: "Unknown lead type." }, { status: 400 });
  }
  if (typeof body.name !== "string" || body.name.trim().length < 2) {
    return NextResponse.json({ error: "Name is required." }, { status: 422 });
  }
  if (!isEmail(body.email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 422 }
    );
  }

  const { type: _t, ...payload } = body;
  void _t;
  const { table, row } = rowFor(type, payload);

  if (!isSupabaseConfigured()) {
    console.info("[lead:unpersisted]", type, { name: body.name, email: body.email });
    return NextResponse.json({ ok: true, persisted: false });
  }

  const supabase = await createClient();
  const { error } = await supabase.from(table).insert(row);
  if (error) {
    console.error("[lead:error]", type, error.message);
    return NextResponse.json(
      { error: "We couldn't submit your request. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, persisted: true });
}
