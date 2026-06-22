import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { ListingForm, type ListingValues } from "@/components/admin/listing-form";
import { updateListing } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  const initial = data as ListingValues;
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
      <div className="mt-6">
        <ListingForm action={action} initial={initial} />
      </div>
    </div>
  );
}
