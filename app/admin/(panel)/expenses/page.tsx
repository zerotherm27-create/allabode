import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { postExpense } from "@/app/admin/finance-actions";

type Row = {
  id: string; expense_date: string; description: string | null; category: string;
  total_amount: number; charge_to: string; status: string;
};

const TONE: Record<string, string> = {
  posted: "bg-available/10 text-available",
  locked: "bg-available/10 text-available",
  pending_approval: "bg-reserved/10 text-reserved",
  approved: "bg-reserved/10 text-reserved",
  draft: "bg-surface-gray text-slate",
  reversed: "bg-error-bg text-error",
  voided: "bg-error-bg text-error",
};
const peso = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`;
const POSTABLE = new Set(["pending_approval", "approved", "ai_suggested", "needs_review"]);

const columns: Column<Row>[] = [
  { header: "Description", primary: true, cell: (r) => <span className="font-medium text-navy">{r.description ?? r.category}</span> },
  { header: "Date", cell: (r) => <span className="text-slate">{r.expense_date}</span> },
  { header: "Category", cell: (r) => <span className="text-slate">{r.category}</span> },
  { header: "Charge to", cell: (r) => <span className="text-slate capitalize">{r.charge_to}</span> },
  { header: "Total", cell: (r) => <span className="font-semibold text-navy">{peso(Number(r.total_amount))}</span> },
  { header: "Status", cell: (r) => <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TONE[r.status] ?? "bg-surface-gray text-slate"}`}>{r.status.replace(/_/g, " ")}</span> },
  { header: "Action", align: "right", cell: (r) => POSTABLE.has(r.status) ? (
    <form action={postExpense.bind(null, r.id)}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"><Icon name="post_add" size={16} /> Post</button>
    </form>
  ) : <span className="text-xs text-slate">—</span> },
];

export default async function AdminExpensesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("id,expense_date,description,category,total_amount,charge_to,status")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-2xl font-bold text-navy">Expenses</h1>
      <p className="mt-1 text-sm text-slate">{rows.length} total · post approved expenses to the ledger</p>
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} getKey={(r) => r.id} empty="No expenses yet. They’re created when you approve a receipt." />
      </div>
    </div>
  );
}
