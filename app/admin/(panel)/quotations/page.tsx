import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { resolveGrandTotal, formatPeso, type QuotationLineItem } from "@/lib/quotation/totals";

type Row = {
  id: string;
  quotation_number: string;
  recipient_name_hint: string | null;
  recipient_email: string;
  title: string | null;
  status: string;
  line_items: QuotationLineItem[] | null;
  grand_total_override: number | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft — awaiting company signature",
  company_signed: "Company signed — ready to send",
  sent: "Sent — awaiting recipient",
  completed: "Fully executed — binding agreement",
  voided: "Voided",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-surface-gray text-slate",
  company_signed: "bg-reserved/15 text-reserved",
  sent: "bg-gold/15 text-gold-bright",
  completed: "bg-available/15 text-available",
  voided: "bg-error/10 text-error",
};

const columns: Column<Row>[] = [
  {
    header: "Quotation",
    primary: true,
    cell: (r) => (
      <Link href={`/admin/quotations/${r.id}`} className="font-medium text-navy hover:text-navy-700">
        {r.quotation_number}
      </Link>
    ),
  },
  {
    header: "Recipient",
    cell: (r) => (
      <span className="text-slate">
        {r.recipient_name_hint || r.recipient_email}
        {r.title ? ` — ${r.title}` : ""}
      </span>
    ),
  },
  {
    header: "Total",
    cell: (r) => <span className="text-navy">{formatPeso(resolveGrandTotal(r.line_items ?? [], r.grand_total_override))}</span>,
  },
  {
    header: "Status",
    cell: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[r.status] ?? "bg-surface-gray text-navy"}`}>
        {STATUS_LABEL[r.status] ?? r.status}
      </span>
    ),
  },
  {
    header: "Created",
    cell: (r) => <span className="text-slate">{new Date(r.created_at).toLocaleDateString("en-PH")}</span>,
  },
];

export default async function AdminQuotationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotations")
    .select("id,quotation_number,recipient_name_hint,recipient_email,title,status,line_items,grand_total_override,created_at")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Quotations</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total</p>
        </div>
        <Link href="/admin/quotations/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 press">
          <Icon name="add" size={20} /> New quotation
        </Link>
      </div>
      <div className="mt-6">
        <DataTable
          rows={rows}
          columns={columns}
          getKey={(r) => r.id}
          empty={<>No quotations yet. <Link href="/admin/quotations/new" className="text-navy-700 underline">Create the first one</Link>.</>}
        />
      </div>
    </div>
  );
}
