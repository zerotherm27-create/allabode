import Link from "next/link";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { createClient } from "@/lib/supabase/server";
import { VIEWING_STATUS_COLOR, type ViewingStatus } from "@/lib/viewings";

type Row = {
  id: string;
  name: string;
  email: string;
  slot_start: string;
  status: ViewingStatus;
  listings: { title: string } | { title: string }[] | null;
};

function listingTitle(l: Row["listings"]): string {
  const one = Array.isArray(l) ? l[0] : l;
  return one?.title ?? "Untitled listing";
}

const columns: Column<Row>[] = [
  {
    header: "Requested by",
    primary: true,
    cell: (r) => (
      <div>
        <Link href={`/admin/viewings/${r.id}`} className="font-medium text-navy hover:text-navy-700">
          {r.name}
        </Link>
        <p className="text-xs text-slate">{r.email}</p>
      </div>
    ),
  },
  { header: "Listing", cell: (r) => <span className="text-slate">{listingTitle(r.listings)}</span> },
  {
    header: "Requested time",
    cell: (r) =>
      new Date(r.slot_start).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      }),
  },
  {
    header: "Status",
    cell: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${VIEWING_STATUS_COLOR[r.status]}`}>
        {r.status}
      </span>
    ),
  },
  {
    header: "Actions",
    align: "right",
    cell: (r) => (
      <Link href={`/admin/viewings/${r.id}`} className="text-sm font-medium text-navy-700 hover:text-navy">
        View
      </Link>
    ),
  },
];

export default async function ViewingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("viewing_bookings")
    .select("id,name,email,slot_start,status,listings(title)")
    .order("slot_start", { ascending: true });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Viewings</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total</p>
        </div>
        <Link
          href="/admin/viewings/availability"
          className="inline-flex items-center gap-2 rounded-md border border-navy px-4 py-2.5 text-sm font-semibold text-navy hover:bg-surface-gray"
        >
          <Icon name="event_available" size={20} /> Availability
        </Link>
      </div>
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} getKey={(r) => r.id} empty={<>No viewing requests yet.</>} />
      </div>
    </div>
  );
}
