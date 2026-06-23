"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}
function n(fd: FormData, k: string): number | null {
  const v = s(fd, k);
  if (v == null) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function slugify(v: string) {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function listingRow(fd: FormData) {
  const title = s(fd, "title") ?? "Untitled";
  const amenities = (s(fd, "amenities") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  return {
    title,
    slug: s(fd, "slug") ?? slugify(title),
    description: s(fd, "description"),
    location: s(fd, "location"),
    city: s(fd, "city"),
    province: s(fd, "province"),
    private_address: s(fd, "private_address"),
    price: n(fd, "price"),
    price_label: s(fd, "price_label"),
    listing_category: s(fd, "listing_category") ?? "For Sale",
    lease_type: s(fd, "lease_type"),
    property_type: s(fd, "property_type") ?? "Condo",
    status: s(fd, "status") ?? "Draft",
    bedrooms: n(fd, "bedrooms"),
    bathrooms: n(fd, "bathrooms"),
    floor_area: n(fd, "floor_area"),
    lot_area: n(fd, "lot_area"),
    parking: n(fd, "parking"),
    furnishing: s(fd, "furnishing"),
    amenities,
    lease_terms: s(fd, "lease_terms"),
    sale_terms: s(fd, "sale_terms"),
    availability_date: s(fd, "availability_date"),
    is_featured: fd.get("is_featured") === "on",
    owner_name: s(fd, "owner_name"),
    owner_contact: s(fd, "owner_contact"),
    internal_notes: s(fd, "internal_notes"),
  };
}

export async function createListing(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("listings").insert(listingRow(fd));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/listings");
  redirect("/admin/listings");
}

export async function updateListing(id: string, fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("listings").update(listingRow(fd)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/listings");
  redirect("/admin/listings");
}

export async function deleteListing(id: string) {
  const supabase = await createClient();
  await supabase.from("listings").delete().eq("id", id);
  revalidatePath("/admin/listings");
}

export async function setListingStatus(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("listings").update({ status }).eq("id", id);
  revalidatePath("/admin/listings");
}

export async function toggleFeatured(id: string, value: boolean) {
  const supabase = await createClient();
  await supabase.from("listings").update({ is_featured: value }).eq("id", id);
  revalidatePath("/admin/listings");
}

/* ---- Leads: status + internal notes ---- */
async function updateLead(
  table: string,
  id: string,
  patch: Record<string, unknown>,
  path: string
) {
  const supabase = await createClient();
  await supabase.from(table).update(patch).eq("id", id);
  revalidatePath(path);
}

export async function updateInquiry(id: string, fd: FormData) {
  await updateLead(
    "inquiries",
    id,
    { status: fd.get("status"), internal_notes: fd.get("internal_notes") },
    "/admin/inquiries"
  );
}
export async function updateAppraisal(id: string, fd: FormData) {
  await updateLead(
    "appraisal_requests",
    id,
    { status: fd.get("status"), internal_notes: fd.get("internal_notes") },
    "/admin/appraisals"
  );
}
export async function updatePmLead(id: string, fd: FormData) {
  await updateLead(
    "property_management_leads",
    id,
    { status: fd.get("status"), internal_notes: fd.get("internal_notes") },
    "/admin/leads"
  );
}
