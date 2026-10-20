import { revalidatePath } from "next/cache";
import type { createClient } from "@/lib/supabase/server";

/** Public marketing pages that show listing data — revalidate after any
 *  listing mutation so ISR (app/(marketing)/layout.tsx) doesn't serve stale
 *  availability, pricing, or photos after an edit. */
export function revalidatePublicListingPaths(slug?: string | null) {
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
export async function revalidatePublicListingById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
) {
  const { data } = await supabase.from("listings").select("slug").eq("id", id).maybeSingle();
  revalidatePublicListingPaths((data as { slug?: string } | null)?.slug);
}
