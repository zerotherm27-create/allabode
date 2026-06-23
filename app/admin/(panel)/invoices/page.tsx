import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { generateMonthlyInvoices, voidInvoice } from "@/app/admin/invoice-actions";

const peso = (n: number) => `₱${Math.round(Number(n)).toLocaleString("en-PH")}`;

const STATUS_COLORS: Record<string, string> = {
  draft:           "bg-surface-gray text-slate",
  issued:          "bg-navy/5 text-navy-700",
  partially_paid:  "bg-gold/10 text-gold-bright",
  paid:            "bg-available/10 text-available",
  overdue:         "bg-sold/10 text-sold",
  voided:          "bg-surface-gray text-slate line-through",
};

type Named = { name?: string; unit_label?: string };
type Row = {
  id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  status: string;
  tenants: Named | Named[] | null;
  units: Named | Named[] | null;
};
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

const columns: Column<Row>[] = [
  {
    header: "Invoice",
    primary: true,
    cell: (r) => (
      <Link href={`/admin/invoices/${r.id}`} className="font-medium text-navy hover:text-navy-700">
        {r.invoice_number}
      </Link>
    ),
  },
  { header: "Tenant", cell: (r) => <span className="text-slate">{one(r.tenants)?.name ?? "—"}</span> },
  { header: "Unit",   cell: (r) => <span className="text-slate">{one(r.units)?.unit_label ?? "—"}</span> },
  {
    header: "Period",
    cell: (r) => (
      <span className="text-slate">
        {r.billing_period_start} → {r.billing_period_end}
      </span>
    ),
  },
  { header: "Due",    cell: (r) => <span className="text-slate">{r.due_date}</span> },
  { header: "Amount", cell: (r) => <span className="font-medium text-navy">{peso(r.total_amount)}</span> },
  {
    header: "Status",
    cell: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_COLORS[r.status] ?? "bg-surface-gray text-slate"}`}>
        {r.status.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    header: "Actions",
    align: "right",
    cell: (r) => (
      <div className="flex items-center justify-end gap-1">
        <Link
          href={`/admin/invoices/${r.id}`}
          aria-label="View"
          className="flex h-9 w-9 items-center justify-center rounded-md text-navy hover:bg-surface-gray"
        >
          <Icon name="open_in_new" size={18} />
        </Link>
        {r.status !== "voided" && r.status !== "paid" && (
          <form action={voidInvoice.bind(null, r.id)}>
            <button
              type="submit"
              aria-label="Void"
              className="flex h-9 w-9 items-center justify-center rounded-md text-error hover:bg-error-bg"
            >
              <Icon name="block" size={18} />
            </button>
          </form>
        )}
      </div>
    ),
  },
];

export default async function AdminInvoicesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id,invoice_number,billing_period_start,billing_period_end,due_date,total_amount,amount_paid,status,tenants(name),units(unit_label)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  const outstanding = rows.filter((r) => r.status === "issued" || r.status === "overdue" || r.status === "partially_paid");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Invoices</h1>
          <p className="mt-1 text-sm text-slate">
            {rows.length} total · {outstanding.length} outstanding
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={generateMonthlyInvoices}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-navy hover:bg-surface-gray"
            >
              <Icon name="auto_awesome" size={18} />
              Generate monthly
            </button>
          </form>
          <Link
            href="/admin/invoices/new"
            className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Icon name="add" size={20} /> New invoice
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <DataTable
          rows={rows}
          columns={columns}
          getKey={(r) => r.id}
          empty={
            <>
              No invoices yet.{" "}
              <Link href="/admin/invoices/new" className="text-navy-700 underline">
                Create the first one
              </Link>{" "}
              or use Generate monthly to auto-create for all active leases.
            </>
          }
        />
      </div>
    </div>
  );
}
