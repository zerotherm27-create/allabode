import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
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

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line bg-surface-gray text-slate">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Charge to</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate">No expenses yet. They’re created when you approve a receipt.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-slate">{r.expense_date}</td>
                <td className="px-4 py-3 font-medium text-navy">{r.description ?? r.category}</td>
                <td className="px-4 py-3 text-slate">{r.category}</td>
                <td className="px-4 py-3 text-slate capitalize">{r.charge_to}</td>
                <td className="px-4 py-3 font-semibold text-navy">{peso(Number(r.total_amount))}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TONE[r.status] ?? "bg-surface-gray text-slate"}`}>{r.status.replace(/_/g, " ")}</span></td>
                <td className="px-4 py-3 text-right">
                  {POSTABLE.has(r.status) ? (
                    <form action={postExpense.bind(null, r.id)}>
                      <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800">
                        <Icon name="post_add" size={16} /> Post
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-slate">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
