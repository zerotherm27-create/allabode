import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import {
  ACCOUNT_STATE_LABEL,
  availableActions,
  isMissingTable,
  specialistAccountState,
  canResendSignInLink,
  canRemoveSpecialist,
  isSpecialistVisible,
  visibilityAvailable,
} from "@/lib/team/admin-status";
import { getNeverSignedIn } from "@/lib/team/provision";
import { checkSpecialistDomain } from "@/lib/team/vercel-domains";
import { subdomainState } from "@/lib/team/domain-status";
import { loadActivity } from "@/lib/team/activity-data";
import { InviteControls, StatusControls, SubdomainControls, VisibilityControls } from "./controls";

type Row = {
  id: string; display_name: string; email: string; phone: string | null; status: string;
  auth_user_id: string | null; subdomain: string | null;
  tagline: string | null; bio: string | null;
  areas: string[]; specialties: string[]; languages: string[];
  years_experience: number | null;
  created_at: string;
  /** Absent until the visibility migration is run. */
  is_visible?: boolean | null;
};

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

export default async function AdminSpecialistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from("specialists").select("*").eq("id", id).maybeSingle();

  if (isMissingTable(error) || error) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/specialists" className="text-sm text-navy-700 hover:underline">Back to specialists</Link>
        <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-slate">
          <div className="flex gap-2">
            <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-warning" />
            <p>{isMissingTable(error)
              ? "Run the specialists migration (supabase/migrations/20261020100000_specialists.sql) in the Supabase SQL editor to enable this page."
              : `Could not load this specialist: ${error?.message}`}</p>
          </div>
        </div>
      </div>
    );
  }
  if (!data) notFound();
  const s = data as Row;
  const act = availableActions(s.status);
  // Sign-in status from the Auth Admin API (null when unavailable).
  const neverSignedIn = s.auth_user_id ? await getNeverSignedIn([s.auth_user_id]) : new Set<string>();
  const state = specialistAccountState(s, neverSignedIn);

  const domainState = s.subdomain && s.status === "approved"
    ? subdomainState(await checkSpecialistDomain(s.subdomain, 3000))
    : null;

  const activity = s.status === "approved" ? await loadActivity(30, s.id) : null;
  const a = activity && activity.ok ? activity.overview.bySpecialist[s.id] : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin/specialists" className="text-sm text-navy-700 hover:underline">Back to specialists</Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy">{s.display_name}</h1>
        <p className="mt-1 text-sm text-slate">
          Status: <strong className="text-ink">{ACCOUNT_STATE_LABEL[state]}</strong>
          {!isSpecialistVisible(s) && <> · <strong className="text-ink">Hidden from the website</strong></>}
          {s.status === "approved" && s.subdomain && (
            <>
              {" · "}
              <Link href={`/team/${s.subdomain}`} className="inline-flex items-center gap-1 text-navy-700 hover:underline">
                View public profile <Icon name="open_in_new" size={14} />
              </Link>
            </>
          )}
        </p>
      </div>

      {a && (
        <section aria-label="Activity, last 30 days" className="rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold text-navy">Activity, last 30 days</h2>
            <Link href="/admin/specialists/overview" className="inline-flex min-h-11 items-center text-sm text-navy-700 hover:underline">All specialists</Link>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ["Live listings", a.listings.live],
              ["Awaiting approval", a.listings.awaiting],
              ["New leads", a.newLeads],
              ["Stale leads", a.staleLeads.length],
              ["Follow-ups sent", a.followUpsSent],
              ["Follow-ups failed", a.followUpsFailed],
              ["Unsubscribes", a.unsubscribes],
            ] as [string, number][]).map(([label, v]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate">{label}</dt>
                <dd className={`mt-1 font-display text-lg font-bold ${(label === "Stale leads" || label === "Follow-ups failed") && v > 0 ? "text-error" : "text-navy"}`}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="font-display text-sm font-semibold text-navy">Details</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Item label="Email" value={s.email} />
          <Item label="Phone" value={s.phone} />
          <Item label="Web address" value={s.subdomain} />
          <Item label="Years of experience" value={s.years_experience?.toString()} />
          <Item label="Added" value={new Date(s.created_at).toLocaleDateString("en-PH")} />
          <Item label="Tagline" value={s.tagline} />
          <Item label="Areas" value={s.areas?.join(", ")} />
          <Item label="Specialties" value={s.specialties?.join(", ")} />
          <Item label="Languages" value={s.languages?.join(", ")} />
        </dl>
        {s.bio && <p className="mt-4 whitespace-pre-line text-sm text-ink">{s.bio}</p>}
      </section>

      {(state === "invited" || state === "active") && (state === "invited" || canResendSignInLink(s)) && (
        <InviteControls
          id={s.id}
          email={s.email}
          canResend={canResendSignInLink(s)}
          canRemove={canRemoveSpecialist(s, state === "active")}
        />
      )}
      {neverSignedIn === null && (
        <p className="text-sm text-slate">
          Sign-in status is unavailable (the server can&rsquo;t reach the account service), so removal is unavailable.
        </p>
      )}
      {s.subdomain && domainState && <SubdomainControls id={s.id} slug={s.subdomain} state={domainState} />}
      <VisibilityControls id={s.id} visible={isSpecialistVisible(s)} available={visibilityAvailable(s)} />
      <StatusControls id={s.id} canSuspend={act.suspend} canReinstate={act.reinstate} />
    </div>
  );
}
