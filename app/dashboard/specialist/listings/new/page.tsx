import Link from "next/link";
import { Icon } from "@/components/icon";
import { ListingForm } from "@/components/admin/listing-form";
import { createSpecialistListing } from "@/app/dashboard/specialist/actions";
import { isAiConfigured } from "@/lib/ai/client";

export default function NewSpecialistListingPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/specialist/listings"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-slate hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
      >
        <Icon name="arrow_back" size={18} />
        Back to my listings
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New listing</h1>
      <p className="mt-1 text-sm text-slate">
        Save it as a draft first. You can add photos once it&apos;s saved, then submit it for approval.
      </p>
      <div className="mt-6">
        <ListingForm
          variant="specialist"
          action={createSpecialistListing}
          aiEnabled={isAiConfigured()}
          cancelHref="/dashboard/specialist/listings"
        />
      </div>
    </div>
  );
}
