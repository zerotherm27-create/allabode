import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import {
  ACCOUNT_STATE_LABEL,
  activationInstructions,
  availableActions,
  isMissingTable,
  specialistAccountState,
} from "@/lib/team/admin-status";
import { getPublicSiteUrl } from "@/lib/url";
import { StatusControls } from "./controls";

type Row = {
  id: string; display_name: string; email: string; phone: string | null; status: string;
  auth_user_id: string | null; subdomain: string | null;
  tagline: string | null; bio: string | null;
  areas: string[]; specialties: string[]; languages: string[];
  years_experience: number | null;
  created_at: string;
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
  const state = specialistAccountState(s);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin/specialists" className="text-sm text-navy-700 hover:underline">Back to specialists</Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy">{s.display_name}</h1>
        <p className="mt-1 text-sm text-slate">
          Status: <strong className="text-ink">{ACCOUNT_STATE_LABEL[state]}</strong>
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

      {state === "invited" && (
        <section className="rounded-lg border border-line bg-surface p-6">
          <h2 className="font-display text-sm font-semibold text-navy">Not activated yet</h2>
          <p className="mt-2 text-sm text-slate">Send them these activation instructions:</p>
          <p className="mt-3 select-all break-words rounded-md border border-line bg-cream px-3 py-2 text-sm text-ink">
            {activationInstructions(s.display_name, s.email, `${getPublicSiteUrl()}/team/join`)}
          </p>
        </section>
      )}
      <StatusControls id={s.id} canSuspend={act.suspend} canReinstate={act.reinstate} />
    </div>
  );
}
