import Link from "next/link";
import { Icon } from "@/components/icon";
import { Panel, StatCard } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/role";
import { profileChecklist, type ChecklistItem } from "@/lib/team/profile-suggest";

const STATUSES = [
  { key: "draft", label: "Drafts", icon: "edit" },
  { key: "submitted", label: "In review", icon: "hourglass_top" },
  { key: "approved", label: "Approved", icon: "check_circle" },
  { key: "rejected", label: "Needs changes", icon: "error" },
] as const;

export default async function SpecialistOverviewPage() {
  const { specialistId } = await getCurrentRole();
  const counts: Record<string, number> = {};
  let newLeads: number | null = null;
  let checklist: { items: ChecklistItem[]; done: number; total: number } | null = null;

  if (specialistId) {
    const supabase = await createClient();
    // The three reads are independent, so they run together.
    const [listingsRes, leadsRes, profRes] = await Promise.all([
      supabase.from("listings").select("approval_status").eq("specialist_id", specialistId),
      // New-lead count (fail-soft: null when lead tracking isn't available yet).
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("specialist_id", specialistId)
        .eq("lead_stage", "New"),
      supabase
        .from("specialists")
        .select("photo_path,tagline,bio,areas,specialties,languages")
        .eq("id", specialistId)
        .maybeSingle(),
    ]);

    for (const r of (listingsRes.data ?? []) as { approval_status: string | null }[]) {
      const k = r.approval_status ?? "draft";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    if (!leadsRes.error) newLeads = leadsRes.count ?? 0;

    // Profile checklist (fail-soft: hidden when the read fails or the profile is complete).
    const prof = profRes.data;
    if (!profRes.error && prof) {
      try {
        const c = profileChecklist({
          photoPath: prof.photo_path,
          tagline: prof.tagline,
          bio: prof.bio,
          areas: prof.areas,
          specialties: prof.specialties,
          languages: prof.languages,
        });
        if (!c.complete) checklist = c;
      } catch {
        checklist = null;
      }
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold text-navy">Overview</h1>
      <p className="mt-1 text-sm text-slate">Your listings and where each one stands.</p>

      {checklist && (
        <section aria-labelledby="profile-checklist" className="mt-6 rounded-lg border border-line bg-surface p-5">
          <h2 id="profile-checklist" className="font-display text-base font-semibold text-navy">
            Complete your profile
          </h2>
          <p className="mt-1 text-sm text-slate">
            {checklist.done} of {checklist.total} done. A full profile helps buyers trust and reach you.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {checklist.items.map((i) => (
              <li key={i.key} className="flex items-center gap-2 text-sm text-ink">
                <Icon name={i.done ? "check_circle" : "radio_button_unchecked"} size={18} />
                <span className={i.done ? "text-slate line-through" : ""}>{i.label}</span>
                {i.done && <span className="sr-only">(done)</span>}
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/specialist/profile"
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
          >
            Finish your profile
            <Icon name="arrow_forward" size={18} />
          </Link>
        </section>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATUSES.map((s) => (
          <StatCard key={s.key} icon={s.icon} label={s.label} value={String(counts[s.key] ?? 0)} />
        ))}
      </div>

      {newLeads !== null && (
        <Link
          href="/dashboard/specialist/leads?stage=New"
          className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-lg border border-line bg-surface px-5 py-4 transition-colors hover:bg-surface-gray focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
        >
          <span className="flex items-center gap-3">
            <Icon name="forum" size={22} />
            <span>
              <span className="block font-display text-base font-semibold text-navy">
                {newLeads} new {newLeads === 1 ? "lead" : "leads"}
              </span>
              <span className="block text-sm text-slate">People who contacted you. Open your inbox.</span>
            </span>
          </span>
          <Icon name="arrow_forward" size={18} />
        </Link>
      )}

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
