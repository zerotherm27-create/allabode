import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { isFollowUpMigrationMissing, describeDelay } from "@/lib/leads/follow-ups";
import { AUDIENCE_LABEL, type TemplateAudience } from "@/lib/admin/follow-up-templates";

export const metadata = { title: "Follow-up emails" };

type Row = {
  id: string;
  template_key: string;
  name: string;
  delay_days: number;
  position: number;
  is_active: boolean;
  audience: TemplateAudience;
};

export default async function FollowUpsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("id,template_key,name,delay_days,position,is_active,audience")
    .order("position")
    .order("delay_days");
  const missing = isFollowUpMigrationMissing(error);
  const rows = (data ?? []) as Row[];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Follow-up emails</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate">
            The sequence sent to new leads after they enquire, plus internal reminders to the property specialist. Specialists can switch individual customer emails off for their own leads.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/follow-ups/log" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-semibold text-navy hover:bg-surface-gray focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700">
            <Icon name="history" size={18} /> Send log
          </Link>
          <Link href="/admin/follow-ups/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700">
            <Icon name="add" size={18} /> New email
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-md border border-error/30 bg-error-bg px-4 py-3 text-sm text-ink">
          {missing
            ? "Follow-up emails aren't set up in the database yet. Run the leads and nurture migration, then the starter templates seed."
            : "Couldn't load the emails. Please refresh and try again."}
        </p>
      )}

      {!error && rows.length === 0 && (
        <p className="mt-6 rounded-lg border border-line bg-surface p-6 text-sm text-slate">
          No emails yet. Paste <code className="font-mono">supabase/seeds/phase3-starter-email-templates.sql</code> into the SQL editor for a starter set, or create one.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/follow-ups/${r.id}`}
                className={`flex min-h-11 flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4 hover:border-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700 ${r.is_active ? "bg-surface" : "bg-surface-gray"}`}
              >
                <div className="min-w-0">
                  <p className="font-display font-semibold text-navy">{r.name}</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-slate">{r.template_key}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-navy/5 px-2.5 py-1 font-medium text-navy">{AUDIENCE_LABEL[r.audience] ?? r.audience}</span>
                  <span className="rounded-full bg-surface-gray px-2.5 py-1 text-slate">{describeDelay(r.delay_days)}</span>
                  <span className={`rounded-full px-2.5 py-1 font-medium ${r.is_active ? "bg-available/10 text-available" : "bg-surface-gray text-slate"}`}>
                    {r.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
