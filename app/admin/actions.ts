"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LISTING_IMAGES_BUCKET, storagePathFromUrl } from "@/lib/storage";
import { draftListingDescription, type ListingDescriptionInput } from "@/lib/ai/listing-description";
import { draftListingSeo, type ListingSeoResult } from "@/lib/ai/listing-seo";
import { listingRow } from "@/lib/admin/listing-row";
import { refreshNearbyPlaces as runNearbyPlacesRefresh } from "@/lib/nearby-places";

/** Public marketing pages that show listing data — revalidate after any
 *  listing mutation so ISR (app/(marketing)/layout.tsx) doesn't serve stale
 *  availability, pricing, or photos after an admin edit. */
function revalidatePublicListingPaths(slug?: string | null) {
  revalidatePath("/");
  revalidatePath("/listings");
  revalidatePath("/listings/for-rent");
  revalidatePath("/listings/for-sale");
  revalidatePath("/listings/commercial");
  revalidatePath("/listings/office");
  revalidatePath("/listings/industrial-warehouse");
  revalidatePath("/listings/parking");
  revalidatePath("/listings/lots");
  if (slug) revalidatePath(`/listings/${slug}`);
}

/** Same as revalidatePublicListingPaths, but looks the slug up by id first —
 *  for actions (image management, status/featured toggles) that only have
 *  the listing id in scope. */
async function revalidatePublicListingById(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data } = await supabase.from("listings").select("slug").eq("id", id).maybeSingle();
  revalidatePublicListingPaths((data as { slug?: string } | null)?.slug);
}

export async function createListing(fd: FormData) {
  const supabase = await createClient();
  const row = listingRow(fd);
  const { data, error } = await supabase
    .from("listings")
    .insert(row)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/listings");
  revalidatePublicListingPaths(row.slug);
  redirect(`/admin/listings/${data.id}/edit`);
}

export async function updateListing(id: string, fd: FormData) {
  const supabase = await createClient();
  const row = listingRow(fd);
  // Supabase returns success with an empty result (no `error`) when RLS's
  // `using` clause excludes the row from the update set entirely — e.g. a
  // signed-in account with no matching row in `users` (is_staff() false)
  // can still SELECT a live listing via the public policy, so the edit form
  // loads fine, but every save silently no-ops. Requesting the row back and
  // checking it was actually returned turns that into a loud, explainable
  // failure instead of a page that looks saved but never changed.
  const { data, error } = await supabase.from("listings").update(row).eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      "The listing wasn't updated — no row matched. This usually means the signed-in account isn't flagged as staff, or the listing was deleted."
    );
  }
  revalidatePath("/admin/listings");
  revalidatePublicListingPaths(row.slug);
  redirect("/admin/listings");
}

export async function deleteListing(id: string) {
  const supabase = await createClient();
  await revalidatePublicListingById(supabase, id);
  const { data, error } = await supabase.from("listings").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Could not delete — no matching listing was found.");
  revalidatePath("/admin/listings");
}

export async function setListingStatus(id: string, status: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("listings").update({ status }).eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Could not update the listing's status — no matching listing was found.");
  revalidatePath("/admin/listings");
  await revalidatePublicListingById(supabase, id);
}

export async function toggleFeatured(id: string, value: boolean) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("listings").update({ is_featured: value }).eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Could not update Featured — no matching listing was found.");
  revalidatePath("/admin/listings");
  await revalidatePublicListingById(supabase, id);
}

export async function generateListingDescription(input: ListingDescriptionInput): Promise<string | null> {
  return draftListingDescription(input);
}

export async function generateListingSeo(input: ListingDescriptionInput): Promise<ListingSeoResult | null> {
  return draftListingSeo(input);
}

export async function refreshNearbyPlaces(listingId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: listing, error: fetchErr } = await supabase
    .from("listings")
    .select("slug, location")
    .eq("id", listingId)
    .maybeSingle();
  if (fetchErr || !listing) return { ok: false, error: "Listing not found." };

  const result = await runNearbyPlacesRefresh(listing.location ?? "");
  if (!result.ok) return result;

  const { error: updateErr } = await supabase
    .from("listings")
    .update({ nearby_places: result.places, nearby_places_updated_at: new Date().toISOString() })
    .eq("id", listingId);
  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath(`/admin/listings/${listingId}/edit`);
  if (listing.slug) revalidatePath(`/listings/${listing.slug}`);
  return { ok: true };
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
  await revalidatePublicListingById(supabase, listingId);
}

export async function deleteListingImage(imageId: string, listingId: string) {
  const supabase = await createClient();
  const { data: img } = await supabase
    .from("listing_images")
    .select("url")
    .eq("id", imageId)
    .maybeSingle();
  const path = img?.url ? storagePathFromUrl(LISTING_IMAGES_BUCKET, img.url) : null;
  if (path) await supabase.storage.from(LISTING_IMAGES_BUCKET).remove([path]);
  await supabase.from("listing_images").delete().eq("id", imageId);
  revalidatePath(`/admin/listings/${listingId}/edit`);
  await revalidatePublicListingById(supabase, listingId);
}

export async function reorderListingImages(listingId: string, orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, i) => supabase.from("listing_images").update({ sort_order: i }).eq("id", id))
  );
  revalidatePath(`/admin/listings/${listingId}/edit`);
  await revalidatePublicListingById(supabase, listingId);
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
export async function deleteInquiry(id: string) {
  const supabase = await createClient();
  await supabase.from("inquiries").delete().eq("id", id);
  revalidatePath("/admin/inquiries");
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
