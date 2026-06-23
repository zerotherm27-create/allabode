import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";

type Rule = {
  id: string; code: string; name: string; description: string | null;
  trigger_type: string; trigger_config: Record<string, unknown>;
  action_type: string; is_active: boolean; last_run_at: string | null;
};

export default async function AutomationPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("automation_rules")
    .select("id,code,name,description,trigger_type,trigger_config,action_type,is_active,last_run_at")
    .order("code");

  const rules = (data ?? []) as Rule[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Automation</h1>
          <p className="mt-1 text-sm text-slate">
            {rules.filter((r) => r.is_active).length} active rules · Powered by Vercel Cron
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {rules.map((rule) => {
          const schedule = (rule.trigger_config as { cron?: string }).cron;
          return (
            <div key={rule.id} className={`rounded-lg border p-5 ${rule.is_active ? "border-line bg-surface" : "border-line bg-surface-gray opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md ${rule.is_active ? "bg-available/10 text-available" : "bg-surface-gray text-slate"}`}>
                    <Icon name={rule.is_active ? "check_circle" : "pause_circle"} size={20} fill={1} />
                  </span>
                  <div>
                    <p className="font-display font-semibold text-navy">{rule.name}</p>
                    {rule.description && (
                      <p className="mt-0.5 text-sm text-slate">{rule.description}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-2">
                      {schedule && (
                        <span className="flex items-center gap-1 rounded bg-navy/5 px-2 py-0.5 font-mono text-xs text-navy-700">
                          <Icon name="schedule" size={12} /> {schedule}
                        </span>
                      )}
                      <span className="rounded bg-surface-gray px-2 py-0.5 text-xs text-slate capitalize">
                        {rule.action_type.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate">Last run</p>
                    <p className="text-sm font-medium text-navy">
                      {rule.last_run_at
                        ? new Date(rule.last_run_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "Never"}
                    </p>
                  </div>
                  <Link
                    href={`/admin/automation/${rule.code}`}
                    className="rounded-md border border-line bg-surface-gray px-3 py-1.5 text-xs font-medium text-navy hover:bg-line"
                  >
                    Run log
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border border-line bg-surface-gray p-4 text-sm text-slate">
        <p className="font-medium text-navy">Cron schedule</p>
        <p className="mt-1">All jobs run in Asia/Manila timezone via Vercel Cron. Configure <code>CRON_SECRET</code> in Vercel env vars to secure the endpoints.</p>
      </div>
    </div>
  );
}
