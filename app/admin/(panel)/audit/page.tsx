import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";

type Row = {
  id: string; action: string; entity_type: string | null; entity_id: string | null;
  actor_user_id: string | null; created_at: string;
};

const columns: Column<Row>[] = [
  { header: "When", primary: true, cell: (r) => <span className="font-medium text-navy">{new Date(r.created_at).toLocaleString("en-PH")}</span> },
  { header: "Action", cell: (r) => <span className="inline-flex items-center gap-1.5 text-navy"><Icon name="bolt" size={14} className="text-gold" />{r.action}</span> },
  { header: "Entity", cell: (r) => <span className="text-slate">{r.entity_type ?? "—"}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}</span> },
  { header: "Actor", cell: (r) => <span className="text-slate">{r.actor_user_id ? r.actor_user_id.slice(0, 8) : "system"}</span> },
];

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id,action,entity_type,entity_id,actor_user_id,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold text-navy">Audit Log</h1>
      <p className="mt-1 text-sm text-slate">Most recent 200 finance &amp; privileged actions.</p>
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} getKey={(r) => r.id} empty="No audit entries yet." minWidth="640px" />
      </div>
    </div>
  );
}
