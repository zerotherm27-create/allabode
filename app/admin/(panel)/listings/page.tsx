import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { ListingThumb, firstImageUrl, type ListingImageRef } from "@/components/admin/listing-thumb";
import { ListingSearch, matchesSearch } from "@/components/admin/listing-search";
import { ApprovalBadge } from "@/components/specialist/approval-badge";
import {
  approvalCounts,
  filterByApproval,
  isMissingColumn,
  parseApprovalFilter,
  type ApprovalFilter,
} from "@/lib/team/admin-status";
import {
  deleteListing,
  setListingStatus,
  toggleFeatured,
} from "@/app/admin/actions";

type Row = {
  id: string;
  title: string;
  slug: string;
  location: string | null;
  property_type: string;
  listing_category: string;
  status: string;
  is_featured: boolean;
  price: number | null;
  listing_images?: ListingImageRef[] | null;
  /** Present only once the specialists migration has run. */
  approval_status?: string;
  specialist_id?: string | null;
  specialists?: { display_name: string } | null;
};

const BASE_SELECT = "id,title,slug,location,property_type,listing_category,status,is_featured,price,listing_images(url,sort_order)";
const EXTENDED_SELECT = `${BASE_SELECT},approval_status,specialist_id,specialists(display_name)`;

const FILTERS: { key: ApprovalFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Awaiting approval" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Needs changes" },
  { key: "draft", label: "Draft" },
];

const baseColumns: Column<Row>[] = [
  { header: "Title", primary: true, cell: (l) => (
    <div className="flex items-center gap-3">
      <ListingThumb url={firstImageUrl(l.listing_images)} title={l.title} />
      <div>
        <Link href={`/admin/listings/${l.id}/edit`} className="font-medium text-navy hover:text-navy-700">{l.title}</Link>
        <p className="text-xs text-slate">{l.listing_category} · {l.property_type}</p>
      </div>
    </div>
  ) },
  { header: "Price", cell: (l) => <span className="text-slate">{l.price != null ? `₱${Number(l.price).toLocaleString("en-PH")}` : "—"}</span> },
  { header: "Status", cell: (l) => <span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium text-navy">{l.status}</span> },
  { header: "Featured", cell: (l) => (
    <form action={toggleFeatured.bind(null, l.id, !l.is_featured)}>
      <button type="submit" aria-label={l.is_featured ? "Unfeature" : "Feature"} className={l.is_featured ? "text-gold" : "text-slate-soft hover:text-gold"}>
        <Icon name="star" size={22} fill={l.is_featured ? 1 : 0} />
      </button>
    </form>
  ) },
  { header: "Actions", align: "right", cell: (l) => (
    <div className="flex items-center justify-end gap-1">
      {l.approval_status === "submitted" && (
        <Link href={`/admin/listings/${l.id}/edit`} className="inline-flex min-h-11 items-center rounded-md bg-navy px-3 text-xs font-semibold text-white hover:bg-navy-800 press">Review</Link>
      )}
      <Link href={`/admin/listings/${l.id}/edit`} aria-label="Edit" className="flex h-9 w-9 items-center justify-center rounded-md text-navy hover:bg-surface-gray press"><Icon name="edit" size={18} /></Link>
      {l.status !== "Published" && (
        <form action={setListingStatus.bind(null, l.id, "Published")}>
          <button type="submit" className="rounded-md px-2 py-1 text-xs font-medium text-available hover:bg-surface-gray">Publish</button>
        </form>
      )}
      {l.status !== "Archived" && (
        <form action={setListingStatus.bind(null, l.id, "Archived")}>
          <button type="submit" className="rounded-md px-2 py-1 text-xs font-medium text-slate hover:bg-surface-gray">Archive</button>
        </form>
      )}
      <form action={deleteListing.bind(null, l.id)}>
        <button type="submit" aria-label="Delete" className="flex h-9 w-9 items-center justify-center rounded-md text-error hover:bg-error-bg"><Icon name="delete" size={18} /></button>
      </form>
    </div>
  ) },
];

// Specialist + approval columns, spliced in after Status only when the migration is applied.
const specialistColumns: Column<Row>[] = [
  { header: "Specialist", cell: (l) => <span className="text-slate">{l.specialists?.display_name ?? "All Abode"}</span> },
  { header: "Approval", cell: (l) => <ApprovalBadge status={l.approval_status} /> },
];

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ approval?: string | string[]; q?: string | string[] }>;
}) {
  const sp = await searchParams;
  const filter = parseApprovalFilter(sp.approval);
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 100) ?? "";
  const supabase = await createClient();
  const first = await supabase
    .from("listings")
    .select(EXTENDED_SELECT)
    .order("created_at", { ascending: false });
  // Before the specialists migration the extended columns don't exist: fall back to the original list.
  const extended = !(first.error && isMissingColumn(first.error));
  const { data, error } = extended
    ? first
    : await supabase.from("listings").select(BASE_SELECT).order("created_at", { ascending: false });
  if (error) console.error("[admin/listings] failed to load listings:", error);
  const allRows = (data ?? []) as unknown as Row[];
  const counts = approvalCounts(allRows);
  const approvalRows = extended ? filterByApproval(allRows, filter) : allRows;
  const rows = approvalRows.filter((r) =>
    matchesSearch(q, [r.title, r.location, r.slug, r.property_type, r.listing_category, r.status, r.specialists?.display_name]),
  );
  const columns = extended
    ? [...baseColumns.slice(0, 3), ...specialistColumns, ...baseColumns.slice(3)]
    : baseColumns;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Listings</h1>
          <p className="mt-1 text-sm text-slate">
            {allRows.length} total{extended && counts.submitted > 0 ? ` · ${counts.submitted} awaiting approval` : ""}
          </p>
        </div>
        <Link href="/admin/listings/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 press">
          <Icon name="add" size={20} /> Add listing
        </Link>
      </div>
      {error && (
        <p className="mt-4 rounded-lg border border-error/30 bg-error-bg px-4 py-3 text-sm text-error">
          Couldn&apos;t load listings: {error.message}
        </p>
      )}
      {!extended && !error && (
        <p className="mt-4 flex gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-slate">
          <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-warning" />
          Specialist columns and the approval filter appear once the specialists migration is run in the Supabase SQL editor.
        </p>
      )}
      <ListingSearch q={q} action="/admin/listings" hidden={filter !== "all" ? { approval: filter } : undefined} />
      {extended && (
        <nav aria-label="Filter by approval status" className="mt-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Link
                key={f.key}
                href={{ pathname: "/admin/listings", query: { ...(f.key !== "all" && { approval: f.key }), ...(q && { q }) } }}
                aria-current={active ? "page" : undefined}
                className={`press inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-navy bg-navy text-white"
                    : "border-line bg-surface text-navy hover:bg-surface-gray"
                }`}
              >
                {f.label}
                <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20" : "bg-surface-gray text-slate"}`}>
                  {counts[f.key]}
                </span>
              </Link>
            );
          })}
        </nav>
      )}
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} getKey={(r) => r.id} empty={(filter !== "all" && extended) || q ? <>No listings match your search or filter.</> : <>No listings yet. <Link href="/admin/listings/new" className="text-navy-700 underline">Add the first one</Link>.</>} />
      </div>
    </div>
  );
}
