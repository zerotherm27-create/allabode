import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusForm } from "@/components/admin/status-form";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { Icon } from "@/components/icon";
import { updateInquiry, deleteInquiry } from "@/app/admin/actions";

const STATUSES = ["New", "Contacted", "Scheduled", "In progress", "Closed", "Spam"];

type Row = {
  id: string;
  type: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  preferred_viewing_date: string | null;
  preferred_contact_method: string | null;
  status: string;
  internal_notes: string | null;
  created_at: string;
  details: Record<string, unknown> | null;
  listings: { id: string; title: string } | { id: string; title: string }[] | null;
};

/** Human labels for the free-text detail fields each lead type stuffs into `details`. */
const DETAIL_LABELS: Record<string, string> = {
  propertyLocation: "Property",
  propertyType: "Property type",
  userType: "Submitted as",
  helpWith: "Help with",
  intendedService: "Intended service",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  floorArea: "Floor area",
  price: "Price / rent",
};

function joinedListing(l: Row["listings"]): { id: string; title: string } | null {
  const one = Array.isArray(l) ? l[0] : l;
  return one ?? null;
}

export default async function AdminInquiriesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inquiries")
    .select("*, listings(id,title)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-navy">Inquiries</h1>
      <p className="mt-1 text-sm text-slate">
        Listing inquiries, viewing requests, contact messages, and property submissions.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-line-strong bg-surface p-10 text-center text-slate">
            No inquiries yet.
          </p>
        )}
        {rows.map((r) => {
          const listing = joinedListing(r.listings);
          const details = r.details ?? {};
          const detailEntries = Object.entries(DETAIL_LABELS)
            .map(([key, label]) => [label, details[key]] as const)
            .filter(([, value]) => value != null && value !== "");
          const listingText = typeof details.listing === "string" ? details.listing : null;
          const sourcePath = typeof details.sourcePath === "string" ? details.sourcePath : null;

          return (
            <article key={r.id} className="rounded-lg border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-navy">{r.name}</h2>
                  <p className="text-sm text-slate">
                    <a href={`mailto:${r.email}`} className="hover:text-navy-700">{r.email}</a>
                    {r.phone && <> · {r.phone}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium capitalize text-navy">
                    {r.type}
                  </span>
                  <span className="rounded-full bg-navy/5 px-2.5 py-1 text-xs font-medium text-navy-700">
                    {r.status}
                  </span>
                  <ConfirmActionForm
                    action={deleteInquiry.bind(null, r.id)}
                    message={`Delete this inquiry from ${r.name}? This can't be undone.`}
                  >
                    <button
                      type="submit"
                      aria-label="Delete inquiry"
                      className="flex h-9 w-9 items-center justify-center rounded-md text-error hover:bg-error-bg press"
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  </ConfirmActionForm>
                </div>
              </div>

              {(listing || listingText) && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-navy">
                  <Icon name="home_work" size={16} className="text-gold-ink" />
                  {listing ? (
                    <Link href={`/admin/listings/${listing.id}/edit`} className="font-medium hover:text-navy-700">
                      {listing.title}
                    </Link>
                  ) : (
                    <span className="font-medium">{listingText}</span>
                  )}
                </p>
              )}

              {r.message && <p className="mt-3 text-sm text-slate">{r.message}</p>}

              {detailEntries.length > 0 && (
                <dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-1 text-xs text-slate sm:grid-cols-2">
                  {detailEntries.map(([label, value]) => (
                    <div key={label} className="flex gap-1">
                      <dt className="font-medium text-navy">{label}:</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate">
                {r.preferred_viewing_date && <span>Viewing: {r.preferred_viewing_date}</span>}
                {r.preferred_contact_method && <span>Contact via: {r.preferred_contact_method}</span>}
                {sourcePath && <span>Submitted from: {sourcePath}</span>}
                <span>Received: {new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <StatusForm
                action={updateInquiry.bind(null, r.id)}
                statuses={STATUSES}
                current={r.status}
                notes={r.internal_notes}
              />
            </article>
          );
        })}
      </div>
    </div>
  );
}
