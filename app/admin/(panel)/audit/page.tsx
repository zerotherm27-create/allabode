import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";

type Row = {
  id: string; action: string; entity_type: string | null; entity_id: string | null;
  actor_user_id: string | null; created_at: string; metadata: Record<string, unknown> | null;
};

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id,action,entity_type,entity_id,actor_user_id,created_at,metadata")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold text-navy">Audit Log</h1>
      <p className="mt-1 text-sm text-slate">Most recent 200 finance &amp; privileged actions.</p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-surface-gray text-slate">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate">No audit entries yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-slate">{new Date(r.created_at).toLocaleString("en-PH")}</td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 font-medium text-navy"><Icon name="bolt" size={14} className="text-gold" />{r.action}</span></td>
                <td className="px-4 py-3 text-slate">{r.entity_type ?? "—"}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}</td>
                <td className="px-4 py-3 text-slate">{r.actor_user_id ? r.actor_user_id.slice(0, 8) : "system"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
