import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import {
  deleteListing,
  setListingStatus,
  toggleFeatured,
} from "@/app/admin/actions";

type Row = {
  id: string;
  title: string;
  slug: string;
  property_type: string;
  listing_category: string;
  status: string;
  is_featured: boolean;
  price: number | null;
};

const columns: Column<Row>[] = [
  { header: "Title", primary: true, cell: (l) => (
    <div>
      <Link href={`/admin/listings/${l.id}/edit`} className="font-medium text-navy hover:text-navy-700">{l.title}</Link>
      <p className="text-xs text-slate">{l.listing_category} · {l.property_type}</p>
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

export default async function AdminListingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("id,title,slug,property_type,listing_category,status,is_featured,price")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Listings</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total</p>
        </div>
        <Link href="/admin/listings/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 press">
          <Icon name="add" size={20} /> Add listing
        </Link>
      </div>
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} getKey={(r) => r.id} empty={<>No listings yet. <Link href="/admin/listings/new" className="text-navy-700 underline">Add the first one</Link>.</>} />
      </div>
    </div>
  );
}
