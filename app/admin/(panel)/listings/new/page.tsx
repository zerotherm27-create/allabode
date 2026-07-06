import Link from "next/link";
import { Icon } from "@/components/icon";
import { ListingForm } from "@/components/admin/listing-form";
import { createListing } from "@/app/admin/actions";
import { isAiConfigured } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { getListingUnitOptions } from "@/lib/admin/listing-units";

export default async function NewListingPage() {
  const supabase = await createClient();
  const units = await getListingUnitOptions(supabase);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/listings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy"
      >
        <Icon name="arrow_back" size={18} />
        Back to listings
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New listing</h1>
      <div className="mt-6">
        <ListingForm action={createListing} aiEnabled={isAiConfigured()} units={units} />
      </div>
    </div>
  );
}
