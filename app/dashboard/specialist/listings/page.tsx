import Link from "next/link";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { ApprovalBadge } from "@/components/specialist/approval-badge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/role";
import { specialistCanDelete } from "@/lib/admin/listing-row";
import { deleteSpecialistListing } from "@/app/dashboard/specialist/actions";

type Row = {
  id: string;
  title: string;
  status: string;
  approval_status: string;
  rejection_note: string | null;
  listing_category: string | null;
  property_type: string | null;
  city: string | null;
  updated_at: string;
};

const NOTICES: Record<string, string> = {
  saved: "Listing saved.",
  submitted: "Listing submitted for approval. All Abode will review it before it goes live.",
  deleted: "Listing deleted.",
};

const iconLink =
  "flex size-11 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";

const columns: Column<Row>[] = [
  {
    header: "Listing",
    primary: true,
    cell: (l) => (
      <div>
        <Link
          href={`/dashboard/specialist/listings/${l.id}/edit`}
          className="font-medium text-navy hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
        >
          {l.title}
        </Link>
        <p className="text-xs text-slate">
          {[l.listing_category, l.property_type, l.city].filter(Boolean).join(" · ")}
        </p>
      </div>
    ),
  },
  {
    header: "Status",
    cell: (l) => (
      <span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium text-navy">{l.status}</span>
    ),
  },
  {
    header: "Review",
    cell: (l) => (
      <div className="flex flex-col items-start gap-1 md:items-start">
        <ApprovalBadge status={l.approval_status} />
        {l.approval_status === "rejected" && l.rejection_note && (
          <span className="max-w-xs text-xs text-error">{l.rejection_note}</span>
        )}
      </div>
    ),
  },
  {
    header: "Updated",
    cell: (l) => (
      <span className="text-slate">
        {new Date(l.updated_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
      </span>
    ),
  },
  {
    header: "Actions",
    align: "right",
    cell: (l) => (
      <div className="flex items-center justify-end gap-1">
        <Link
          href={`/dashboard/specialist/listings/${l.id}/edit`}
          aria-label={`Edit ${l.title}`}
          className={`${iconLink} text-navy hover:bg-surface-gray`}
        >
          <Icon name="edit" size={18} />
        </Link>
        {specialistCanDelete(l.approval_status) ? (
          <ConfirmActionForm
            action={deleteSpecialistListing.bind(null, l.id)}
            message={`Delete "${l.title}" and its photos? This can't be undone.`}
          >
            <button type="submit" aria-label={`Delete ${l.title}`} className={`${iconLink} text-error hover:bg-error-bg`}>
              <Icon name="delete" size={18} />
            </button>
          </ConfirmActionForm>
        ) : (
          <Link
            href={`/dashboard/specialist/listings/${l.id}/edit`}
            title="Live listings can't be deleted. Open it and set the status to Archived."
            aria-label={`Archive ${l.title}: open it and set the status to Archived`}
            className="flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-medium text-slate transition-colors hover:bg-surface-gray hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
          >
            <Icon name="archive" size={16} />
            Archive
          </Link>
        )}
      </div>
    ),
  },
];

export default async function SpecialistListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const { specialistId } = await getCurrentRole();
  const supabase = await createClient();

  const { data, error } = specialistId
    ? await supabase
        .from("listings")
        .select("id,title,status,approval_status,rejection_note,listing_category,property_type,city,updated_at")
        .eq("specialist_id", specialistId)
        .order("updated_at", { ascending: false })
    : { data: [], error: null };
  if (error) console.error("[specialist/listings] failed to load listings:", error);
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">My listings</h1>
          <p className="mt-1 text-sm text-slate">
            {rows.length} {rows.length === 1 ? "listing" : "listings"}. New listings are reviewed by All Abode before they go live.
          </p>
        </div>
        <Link
          href="/dashboard/specialist/listings/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
        >
          <Icon name="add" size={20} /> Add listing
        </Link>
      </div>
      {notice && NOTICES[notice] && (
        <p role="status" className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-navy">
          {NOTICES[notice]}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-error/30 bg-error-bg px-4 py-3 text-sm text-error">
          Couldn&apos;t load your listings. Refresh the page to try again.
        </p>
      )}
      <div className="mt-6">
        <DataTable
          rows={rows}
          columns={columns}
          getKey={(r) => r.id}
          empty={
            <>
              You haven&apos;t added a listing yet.{" "}
              <Link href="/dashboard/specialist/listings/new" className="text-navy-700 underline">
                Create your first one
              </Link>
              .
            </>
          }
        />
      </div>
    </div>
  );
}
