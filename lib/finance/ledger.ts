import type { SupabaseClient } from "@supabase/supabase-js";

export type PostableExpense = {
  id: string;
  expense_date: string;
  total_amount: number;
  property_id: string | null;
  unit_id: string | null;
  owner_id: string | null;
  tenant_id: string | null;
  description: string | null;
};

/**
 * Posts an approved expense to the append-only ledger. One debit entry on the
 * `expense` account, scoped to the owner/property so owner SOAs can be computed
 * deterministically from `ledger_entries` (the system of record — never AI).
 */
export async function postExpenseToLedger(supabase: SupabaseClient, expense: PostableExpense) {
  const { error } = await supabase.from("ledger_entries").insert({
    source_type: "expense",
    source_id: expense.id,
    account_code: "expense",
    debit: expense.total_amount,
    credit: 0,
    entry_date: expense.expense_date,
    property_id: expense.property_id,
    unit_id: expense.unit_id,
    owner_id: expense.owner_id,
    tenant_id: expense.tenant_id,
    memo: expense.description,
  });
  if (error) throw new Error(error.message);
}
