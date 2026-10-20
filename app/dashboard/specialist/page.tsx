import Link from "next/link";
import { Icon } from "@/components/icon";
import { Panel, StatCard } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/role";

const STATUSES = [
  { key: "draft", label: "Drafts", icon: "edit" },
  { key: "submitted", label: "In review", icon: "hourglass_top" },
  { key: "approved", label: "Approved", icon: "check_circle" },
  { key: "rejected", label: "Needs changes", icon: "error" },
] as const;

export default async function SpecialistOverviewPage() {
  const { specialistId } = await getCurrentRole();
  const counts: Record<string, number> = {};

  if (specialistId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("listings")
      .select("approval_status")
      .eq("specialist_id", specialistId);
    for (const r of (data ?? []) as { approval_status: string | null }[]) {
      const k = r.approval_status ?? "draft";
      counts[k] = (counts[k] ?? 0) + 1;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold text-navy">Overview</h1>
      <p className="mt-1 text-sm text-slate">Your listings and where each one stands.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATUSES.map((s) => (
          <StatCard key={s.key} icon={s.icon} label={s.label} value={String(counts[s.key] ?? 0)} />
        ))}
      </div>

      <div className="mt-6">
        <Panel title="Your listings">
          <p className="text-sm text-slate">
            {total === 0
              ? "You haven't added a listing yet. New listings are reviewed by All Abode before they go live."
              : `You have ${total} ${total === 1 ? "listing" : "listings"}. New and changed listings are reviewed by All Abode before they go live.`}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/specialist/listings/new"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
            >
              <Icon name="add" size={18} />
              Create a listing
            </Link>
            <Link
              href="/dashboard/specialist/listings"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line px-5 text-sm font-semibold text-navy transition-colors hover:bg-surface-gray focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
            >
              View my listings
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
