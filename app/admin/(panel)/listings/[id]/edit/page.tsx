import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { ListingForm, type ListingValues } from "@/components/admin/listing-form";
import { ListingApprovalPanel } from "@/components/admin/listing-approval-panel";
import { ListingImagesManager } from "@/components/admin/listing-images-manager";
import { RefreshNearbyPlacesButton } from "@/components/admin/refresh-nearby-places-button";
import { updateListing } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai/client";
import { getListingUnitOptions } from "@/lib/admin/listing-units";
import { LISTING_IMAGES_BUCKET, storagePathFromUrl, signedUrlsForPaths } from "@/lib/storage";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: images }, units] = await Promise.all([
    supabase.from("listings").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("listing_images")
      .select("id, url, alt_text, sort_order")
      .eq("listing_id", id)
      .order("sort_order", { ascending: true }),
    getListingUnitOptions(supabase),
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

  const initial = data as ListingValues;
  // Specialist-owned listings, and any listing not yet approved, get a review panel so
  // no listing is left without a control. These columns only exist once the specialists
  // migration has run; before that they are undefined and the panel is skipped.
  const owned = data as { specialist_id?: string | null; approval_status?: string; rejection_note?: string | null; status?: string };
  let specialistName: string | null = null;
  if (owned.specialist_id) {
    const { data: sp } = await supabase
      .from("specialists")
      .select("display_name")
      .eq("id", owned.specialist_id)
      .maybeSingle();
    specialistName = (sp as { display_name?: string } | null)?.display_name ?? null;
  }
  const nearbyPlacesUpdatedAt = (data as { nearby_places_updated_at: string | null }).nearby_places_updated_at;
  const action = updateListing.bind(null, id);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/listings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy"
      >
        <Icon name="arrow_back" size={18} />
        Back to listings
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Edit listing</h1>
      <p className="mt-1 text-sm text-slate">{initial.title}</p>
      {owned.approval_status !== undefined
        && (owned.specialist_id || owned.approval_status !== "approved") && (
        <ListingApprovalPanel
          listingId={id}
          specialistName={specialistName}
          house={!owned.specialist_id}
          approvalStatus={owned.approval_status}
          rejectionNote={owned.rejection_note ?? null}
          status={owned.status ?? ""}
        />
      )}
      <div className="mt-6">
        <ListingImagesManager listingId={id} initialImages={resolvedImages} />
      </div>
      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-display text-sm font-semibold text-navy">Nearby places</h2>
        <p className="mt-1 text-xs text-slate">
          Uses the listing&#x2019;s public Location field — save that first if you&#x2019;ve just changed it.
        </p>
        <RefreshNearbyPlacesButton listingId={id} lastUpdated={nearbyPlacesUpdatedAt} />
      </div>
      <div className="mt-6">
        <ListingForm action={action} initial={initial} aiEnabled={isAiConfigured()} units={units} />
      </div>
    </div>
  );
}
