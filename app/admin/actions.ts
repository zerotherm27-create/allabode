"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LISTING_IMAGES_BUCKET } from "@/lib/storage";
import { draftListingDescription, type ListingDescriptionInput } from "@/lib/ai/listing-description";

function listingImagePath(url: string): string | null {
  const marker = `/${LISTING_IMAGES_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

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
  const { data, error } = await supabase
    .from("listings")
    .insert(listingRow(fd))
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/listings");
  redirect(`/admin/listings/${data.id}/edit`);
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

export async function generateListingDescription(input: ListingDescriptionInput): Promise<string | null> {
  return draftListingDescription(input);
}

/* ---- Listing images ---- */

export async function uploadListingImages(listingId: string, fd: FormData) {
  const supabase = await createClient();
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  const { data: existing } = await supabase
    .from("listing_images")
    .select("sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: false })
    .limit(1);
  let nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  for (const file of files) {
    const buf = Buffer.from(await file.arrayBuffer());
    const path = `${listingId}/${randomUUID()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(path, buf, { contentType: file.type || "image/jpeg", upsert: false });
    if (upErr) throw new Error(upErr.message);

    const { data: pub } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(path);
    const { error: insErr } = await supabase
      .from("listing_images")
      .insert({ listing_id: listingId, url: pub.publicUrl, sort_order: nextOrder });
    if (insErr) throw new Error(insErr.message);
    nextOrder += 1;
  }
  revalidatePath(`/admin/listings/${listingId}/edit`);
}

export async function deleteListingImage(imageId: string, listingId: string) {
  const supabase = await createClient();
  const { data: img } = await supabase
    .from("listing_images")
    .select("url")
    .eq("id", imageId)
    .maybeSingle();
  const path = img?.url ? listingImagePath(img.url) : null;
  if (path) await supabase.storage.from(LISTING_IMAGES_BUCKET).remove([path]);
  await supabase.from("listing_images").delete().eq("id", imageId);
  revalidatePath(`/admin/listings/${listingId}/edit`);
}

export async function reorderListingImages(listingId: string, orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, i) => supabase.from("listing_images").update({ sort_order: i }).eq("id", id))
  );
  revalidatePath(`/admin/listings/${listingId}/edit`);
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
