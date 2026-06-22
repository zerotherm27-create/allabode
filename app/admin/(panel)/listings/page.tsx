import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
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
        <Link
          href="/admin/listings/new"
          className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800"
        >
          <Icon name="add" size={20} />
          Add listing
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-surface-gray text-slate">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Featured</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate">
                  No listings yet. <Link href="/admin/listings/new" className="text-navy-700 underline">Add the first one</Link>.
                </td>
              </tr>
            )}
            {rows.map((l) => (
              <tr key={l.id} className="align-middle">
                <td className="px-4 py-3">
                  <Link href={`/admin/listings/${l.id}/edit`} className="font-medium text-navy hover:text-navy-700">
                    {l.title}
                  </Link>
                  <p className="text-xs text-slate">{l.listing_category} · {l.property_type}</p>
                </td>
                <td className="px-4 py-3 text-slate">
                  {l.price != null ? `₱${l.price.toLocaleString("en-PH")}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium text-navy">
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <form action={toggleFeatured.bind(null, l.id, !l.is_featured)}>
                    <button
                      type="submit"
                      aria-label={l.is_featured ? "Unfeature" : "Feature"}
                      className={l.is_featured ? "text-gold" : "text-slate-soft hover:text-gold"}
                    >
                      <Icon name="star" size={22} fill={l.is_featured ? 1 : 0} />
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/listings/${l.id}/edit`}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-navy hover:bg-surface-gray"
                      aria-label="Edit"
                    >
                      <Icon name="edit" size={18} />
                    </Link>
                    {l.status !== "Published" && (
                      <form action={setListingStatus.bind(null, l.id, "Published")}>
                        <button type="submit" className="rounded-md px-2 py-1 text-xs font-medium text-available hover:bg-surface-gray">
                          Publish
                        </button>
                      </form>
                    )}
                    {l.status !== "Archived" && (
                      <form action={setListingStatus.bind(null, l.id, "Archived")}>
                        <button type="submit" className="rounded-md px-2 py-1 text-xs font-medium text-slate hover:bg-surface-gray">
                          Archive
                        </button>
                      </form>
                    )}
                    <form action={deleteListing.bind(null, l.id)}>
                      <button
                        type="submit"
                        aria-label="Delete"
                        className="flex h-9 w-9 items-center justify-center rounded-md text-error hover:bg-error-bg"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
