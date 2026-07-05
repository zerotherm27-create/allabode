import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { VIEWING_STATUS_COLOR, type ViewingStatus } from "@/lib/viewings";
import { confirmBooking, cancelBooking, completeBooking } from "@/app/admin/viewing-actions";

export default async function ViewingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("viewing_bookings")
    .select("id,name,email,phone,slot_start,slot_end,status,notes,created_at,listings(title,slug)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const listing = Array.isArray(data.listings) ? data.listings[0] : data.listings;
  const status = data.status as ViewingStatus;
  const when = new Date(data.slot_start).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/viewings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy"
      >
        <Icon name="arrow_back" size={18} />
        Back to viewings
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">{data.name}</h1>
          <p className="mt-1 text-sm text-slate">{listing?.title ?? "Untitled listing"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${VIEWING_STATUS_COLOR[status]}`}>{status}</span>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate">Requested time</dt>
            <dd className="text-sm font-medium text-navy">{when}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate">Email</dt>
            <dd className="text-sm font-medium text-navy">{data.email}</dd>
          </div>
          {data.phone && (
            <div>
              <dt className="text-xs text-slate">Phone</dt>
              <dd className="text-sm font-medium text-navy">{data.phone}</dd>
            </div>
          )}
          {listing?.slug && (
            <div>
              <dt className="text-xs text-slate">Listing</dt>
              <dd className="text-sm font-medium text-navy">
                <Link href={`/listings/${listing.slug}`} className="underline hover:text-navy-700" target="_blank">
                  View listing
                </Link>
              </dd>
            </div>
          )}
        </dl>
        {data.notes && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-xs text-slate">Notes</p>
            <p className="mt-1 text-sm text-navy">{data.notes}</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {status !== "Confirmed" && status !== "Completed" && (
          <form action={confirmBooking.bind(null, id)}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Icon name="check_circle" size={18} /> Confirm
            </button>
          </form>
        )}
        {status === "Confirmed" && (
          <form action={completeBooking.bind(null, id)}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md border border-navy px-5 py-2.5 text-sm font-semibold text-navy hover:bg-surface-gray"
            >
              <Icon name="task_alt" size={18} /> Mark completed
            </button>
          </form>
        )}
        {status !== "Cancelled" && status !== "Completed" && (
          <form action={cancelBooking.bind(null, id)}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-error hover:bg-error-bg"
            >
              <Icon name="cancel" size={18} /> Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
