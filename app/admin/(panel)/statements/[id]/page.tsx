import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { signedUrl, FINANCE_DOCS_BUCKET } from "@/lib/storage";
import { submitForReview, approveStatement, publishStatement, voidStatement } from "@/app/admin/soa-actions";

const peso = (n: number) => `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Line = { id: string; description: string; amount: number; line_type: string; sort_order: number };

export default async function StatementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase.from("statements_of_account").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();

  const type = s.statement_type as "owner" | "tenant";
  const partyId = (type === "owner" ? s.owner_id : s.tenant_id) as string;
  const { data: partyRow } = type === "owner"
    ? await supabase.from("owners").select("name").eq("id", partyId).maybeSingle()
    : await supabase.from("tenants").select("name").eq("id", partyId).maybeSingle();
  const party = (partyRow as { name?: string } | null)?.name ?? "—";

  const { data: lineRows } = await supabase.from("soa_lines").select("*").eq("statement_id", id).order("sort_order");
  const lines = (lineRows ?? []) as Line[];
  const pdfUrl = s.pdf_path ? await signedUrl(supabase, FINANCE_DOCS_BUCKET, s.pdf_path, 300) : null;

  const btn = "inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold";

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/statements" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to statements
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy capitalize">{type} statement</h1>
          <p className="mt-1 text-sm text-slate">{party} · {s.period_start} → {s.period_end}</p>
        </div>
        <span className="rounded-full bg-surface-gray px-3 py-1 text-xs font-medium text-navy capitalize">{s.status.replace(/_/g, " ")}</span>
      </div>

      {/* Lines */}
      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-surface-gray text-slate">
            <tr><th className="px-4 py-2.5 font-medium">Description</th><th className="px-4 py-2.5 text-right font-medium">Amount</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5 text-ink">{l.description}</td>
                <td className={`px-4 py-2.5 text-right ${l.amount < 0 ? "text-error" : "text-navy"}`}>{peso(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mt-4 rounded-lg border border-line bg-surface p-5">
        {type === "owner" ? (
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate">Rental income collected</dt><dd>{peso(s.total_payments)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate">Expenses</dt><dd>{peso(-s.total_expenses)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 font-bold text-navy"><dt>Net remittance</dt><dd>{peso(s.net_remittance)}</dd></div>
          </dl>
        ) : (
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate">Total charges</dt><dd>{peso(s.total_charges)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate">Payments received</dt><dd>{peso(-s.total_payments)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 font-bold text-navy"><dt>Outstanding balance</dt><dd>{peso(s.closing_balance)}</dd></div>
          </dl>
        )}
      </div>

      {s.ai_summary && (
        <div className="mt-4 flex gap-2 rounded-lg bg-surface-gray p-4 text-sm text-slate">
          <Icon name="smart_toy" size={18} className="mt-0.5 shrink-0 text-navy-700" />
          <p>{s.ai_summary}</p>
        </div>
      )}

      {/* Workflow actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {s.status === "generated" && (
          <form action={submitForReview.bind(null, id)}>
            <button className={`${btn} bg-navy text-white hover:bg-navy-800`}><Icon name="send" size={18} /> Submit for review</button>
          </form>
        )}
        {s.status === "checker_review" && (
          <form action={approveStatement.bind(null, id)}>
            <button className={`${btn} bg-navy text-white hover:bg-navy-800`}><Icon name="verified" size={18} /> Approve</button>
          </form>
        )}
        {s.status === "approved" && (
          <form action={publishStatement.bind(null, id)}>
            <button className={`${btn} bg-available text-white hover:opacity-90`}><Icon name="publish" size={18} /> Publish to portal</button>
          </form>
        )}
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={`${btn} border border-line text-navy hover:bg-surface-gray`}>
            <Icon name="download" size={18} /> Download PDF
          </a>
        )}
        {s.status !== "voided" && s.status !== "published" && (
          <form action={voidStatement.bind(null, id)} className="flex items-center gap-2">
            <input name="reason" placeholder="Void reason" className="h-10 rounded-md border border-line bg-surface px-3 text-sm" />
            <button className={`${btn} border border-error text-error hover:bg-error-bg`}><Icon name="block" size={18} /> Void</button>
          </form>
        )}
      </div>
    </div>
  );
}
