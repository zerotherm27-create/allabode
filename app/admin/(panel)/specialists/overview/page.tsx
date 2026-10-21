import Link from "next/link";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { ACTIVITY_RANGES, parseRange, STALE_HOURS, type ActivityStats } from "@/lib/team/activity";
import { loadActivity } from "@/lib/team/activity-data";

type Row = { id: string; name: string; stats: ActivityStats };

function Stat({ label, value, tone }: { label: string; value: number; tone?: "alert" }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${tone === "alert" && value > 0 ? "text-error" : "text-navy"}`}>{value}</p>
    </div>
  );
}

const columns: Column<Row>[] = [
  {
    header: "Property specialist",
    primary: true,
    cell: (r) => (
      <Link href={`/admin/specialists/${r.id}`} className="inline-flex min-h-11 items-center font-medium text-navy hover:text-navy-700">
        {r.name}
      </Link>
    ),
  },
  { header: "Live", cell: (r) => r.stats.listings.live },
  { header: "Awaiting approval", cell: (r) => r.stats.listings.awaiting },
  { header: "Drafts", cell: (r) => r.stats.listings.draft },
  { header: "New leads", cell: (r) => r.stats.newLeads },
  {
    header: "Pipeline",
    cell: (r) => (
      <span className="text-slate">
        {r.stats.stages.Contacted} contacted · {r.stats.stages.Viewing} viewing · {r.stats.stages.Negotiating} negotiating · {r.stats.stages.Closed} closed · {r.stats.stages.Lost} lost
      </span>
    ),
  },
  {
    header: "Stale leads",
    cell: (r) =>
      r.stats.staleLeads.length > 0 ? (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-error-bg px-2.5 py-1 text-xs font-semibold text-error"
          title={r.stats.staleLeads.map((l) => l.name).join(", ")}
        >
          <Icon name="warning" size={14} />
          {r.stats.staleLeads.length}
        </span>
      ) : (
        <span className="text-slate">0</span>
      ),
  },
  {
    header: "Follow-ups sent / failed",
    cell: (r) => (
      <span>
        {r.stats.followUpsSent} / <span className={r.stats.followUpsFailed > 0 ? "font-semibold text-error" : ""}>{r.stats.followUpsFailed}</span>
      </span>
    ),
  },
  { header: "Unsubscribes", cell: (r) => r.stats.unsubscribes },
];

export default async function SpecialistOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const { range: rawRange } = await searchParams;
  const range = parseRange(rawRange);
  // The admin panel layout gates staff; loadActivity reads via the staff session (RLS-scoped).
  const load = await loadActivity(range);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/specialists" className="text-sm text-navy-700 hover:underline">Back to specialists</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Specialist activity overview</h1>
          <p className="mt-1 text-sm text-slate">Listings, leads and follow-ups for each property specialist over the last {range} days.</p>
        </div>
        <nav aria-label="Date range" className="flex gap-2 text-sm">
          {ACTIVITY_RANGES.map((d) => (
            <Link
              key={d}
              href={`/admin/specialists/overview?range=${d}`}
              aria-current={d === range ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-md border px-4 font-medium ${d === range ? "border-navy bg-navy text-white" : "border-line text-slate hover:bg-surface-gray"}`}
            >
              {d} days
            </Link>
          ))}
        </nav>
      </div>

      {!load.ok ? (
        <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-slate">
          <div className="flex gap-2">
            <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-warning" />
            <p>{load.message}</p>
          </div>
        </div>
      ) : (
        <>
          {(() => {
            const c = load.overview.company;
            return (
              <section aria-label="Company totals" className="mt-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
                  <Stat label="Live listings" value={c.listings.live} />
                  <Stat label="Awaiting approval" value={c.listings.awaiting} />
                  <Stat label="New leads" value={c.newLeads} />
                  <Stat label={`Stale (New > ${STALE_HOURS}h)`} value={c.staleLeads.length} tone="alert" />
                  <Stat label="Follow-ups sent" value={c.followUpsSent} />
                  <Stat label="Follow-ups failed" value={c.followUpsFailed} tone="alert" />
                  <Stat label="Unsubscribes" value={c.unsubscribes} />
                </div>
                <p className="mt-2 text-xs text-slate">
                  Totals include {load.overview.house.newLeads} new lead{load.overview.house.newLeads === 1 ? "" : "s"} and{" "}
                  {load.overview.house.staleLeads.length} stale lead{load.overview.house.staleLeads.length === 1 ? "" : "s"} not assigned to a specialist (house).
                  Listing counts cover specialist listings only.{" "}
                  {load.overview.house.staleLeads.length > 0 && (
                    <Link href="/admin/inquiries?filter=unassigned-specialist" className="text-navy-700 hover:underline">Review unassigned leads</Link>
                  )}
                </p>
              </section>
            );
          })()}
          <div className="mt-6">
            <DataTable
              rows={load.specialists.map((s) => ({ id: s.id, name: s.display_name, stats: load.overview.bySpecialist[s.id] }))}
              columns={columns}
              getKey={(r) => r.id}
              minWidth="960px"
              empty={<>No approved property specialists yet. Add one from the Specialists page.</>}
            />
          </div>
        </>
      )}
    </div>
  );
}
