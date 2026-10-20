import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { ListingForm, type ListingValues } from "@/components/admin/listing-form";
import { ListingImagesManager } from "@/components/admin/listing-images-manager";
import {
  specialistDeleteImage,
  specialistReorderImages,
  specialistUploadImages,
  updateSpecialistListing,
} from "@/app/dashboard/specialist/actions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/role";
import { isAiConfigured } from "@/lib/ai/client";
import { LISTING_IMAGES_BUCKET, storagePathFromUrl, signedUrlsForPaths } from "@/lib/storage";

// Explicit columns: staff-only fields (seller details, internal notes, exact address,
// unit link) must never reach a specialist's browser, even if staff filled them in.
const LISTING_COLUMNS = [
  "id", "title", "description", "seo_description", "location", "city", "province",
  "price", "price_label", "rent_price", "rent_price_label", "listing_category", "lease_type",
  "property_type", "status", "bedrooms", "bathrooms", "floor_area", "lot_area", "parking",
  "furnishing", "amenities", "lease_terms", "sale_terms", "availability_date", "clean_title",
  "approval_status", "rejection_note",
].join(",");

const imageActions = {
  upload: specialistUploadImages,
  remove: specialistDeleteImage,
  reorder: specialistReorderImages,
};

export default async function EditSpecialistListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { specialistId } = await getCurrentRole();
  if (!specialistId) notFound();

  const supabase = await createClient();
  // Live listings are publicly readable, so filter to the caller's own explicitly.
  const [{ data }, { data: images }] = await Promise.all([
    supabase.from("listings").select(LISTING_COLUMNS).eq("id", id).eq("specialist_id", specialistId).maybeSingle(),
    supabase
      .from("listing_images")
      .select("id, url, alt_text, sort_order")
      .eq("listing_id", id)
      .order("sort_order", { ascending: true }),
  ]);
  if (!data) notFound();

  const imageRows = images ?? [];
  const paths = imageRows
    .map((img) => storagePathFromUrl(LISTING_IMAGES_BUCKET, img.url))
    .filter((p): p is string => p != null);
  const signed = await signedUrlsForPaths(supabase, LISTING_IMAGES_BUCKET, paths);
  const resolvedImages = imageRows.map((img) => {
    const path = storagePathFromUrl(LISTING_IMAGES_BUCKET, img.url);
    const url = path ? signed.get(path) : undefined;
    return url ? { ...img, url } : img;
  });

  const initial = data as unknown as ListingValues;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/specialist/listings"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-slate hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
      >
        <Icon name="arrow_back" size={18} />
        Back to my listings
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Edit listing</h1>
      <p className="mt-1 text-sm text-slate">{initial.title}</p>
      <div className="mt-6">
        <ListingImagesManager listingId={id} initialImages={resolvedImages} actions={imageActions} />
      </div>
      <div className="mt-6">
        <ListingForm
          variant="specialist"
          action={updateSpecialistListing.bind(null, id)}
          initial={initial}
          aiEnabled={isAiConfigured()}
          cancelHref="/dashboard/specialist/listings"
        />
      </div>
    </div>
  );
}
