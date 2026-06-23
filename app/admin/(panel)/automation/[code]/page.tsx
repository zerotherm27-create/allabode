import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";

type LogEntry = {
  id: string; triggered_at: string; entities_processed: number;
  actions_taken: number; errors: unknown; status: string;
};

export default async function AutomationRunLogPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: rule } = await supabase.from("automation_rules")
    .select("id,name,last_run_at").eq("code", code).maybeSingle();

  if (!rule) notFound();
  const ruleId = (rule as { id: string }).id;

  const { data: logs } = await supabase.from("automation_run_log")
    .select("id,triggered_at,entities_processed,actions_taken,errors,status")
    .eq("rule_id", ruleId)
    .order("triggered_at", { ascending: false })
    .limit(50);

  const entries = (logs ?? []) as LogEntry[];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/automation" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to automation
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">{(rule as { name: string }).name}</h1>
      <p className="mt-1 text-sm text-slate">Run log — last 50 executions</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
        {entries.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate">No runs recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-gray text-left text-xs text-slate">
                <th className="px-5 py-3 font-medium">Triggered</th>
                <th className="px-5 py-3 font-medium">Processed</th>
                <th className="px-5 py-3 font-medium">Actions</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">Errors</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 text-navy">
                    {new Date(e.triggered_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-3 text-slate">{e.entities_processed}</td>
                  <td className="px-5 py-3 text-slate">{e.actions_taken}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.status === "success" ? "bg-available/10 text-available" :
                      e.status === "partial" ? "bg-gold/10 text-gold-bright" :
                      "bg-sold/10 text-sold"
                    }`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="hidden px-5 py-3 lg:table-cell">
                    {e.errors ? (
                      <span className="max-w-xs truncate text-xs text-sold">{JSON.stringify(e.errors)}</span>
                    ) : (
                      <span className="text-xs text-slate">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
