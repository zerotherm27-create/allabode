import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";

export const metadata: Metadata = { title: "Owner SOA", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Dashboard",  icon: "dashboard",           href: "/dashboard/owner" },
  { label: "Properties", icon: "apartment",           href: "/dashboard/owner#properties" },
  { label: "Tickets",    icon: "confirmation_number", href: "/dashboard/owner/tickets" },
  { label: "Documents",  icon: "folder",              href: "/dashboard/owner/documents" },
  { label: "Notices",    icon: "campaign",            href: "/dashboard/owner/notices" },
  { label: "Statements", icon: "receipt_long",        href: "/dashboard/owner#statements" },
  { label: "Expenses",   icon: "payments",            href: "/dashboard/owner#expenses" },
];

const peso = (n: number) =>
  `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPeriod = (start: string, end: string) => {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  return s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
    ? s.toLocaleString("en-PH", { month: "long", year: "numeric" })
    : `${s.toLocaleString("en-PH", { month: "short", day: "numeric" })} - ${e.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
};

type SoaLine = {
  id: string;
  description: string;
  amount: number;
  line_type: string;
  billing_note: string | null;
};

export default async function OwnerStatementViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role, ownerId } = await getCurrentRole();
  if (role !== "owner") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: statement }, { data: ownerRow }, { data: lineRows }] = await Promise.all([
    supabase.from("statements_of_account")
      .select("id,period_start,period_end,status,pdf_path,owner_id,property_id,unit_id,total_payments,total_expenses,closing_balance,net_remittance,payout_due_at")
      .eq("id", id)
      .eq("statement_type", "owner")
      .maybeSingle(),
    supabase.from("owners").select("name").eq("id", ownerId ?? "").maybeSingle(),
    supabase.from("soa_lines").select("id,description,amount,line_type,billing_note").eq("statement_id", id).order("sort_order"),
  ]);

  if (!statement || statement.status !== "published" || !statement.pdf_path || statement.owner_id !== ownerId) notFound();
  const ownerName = (ownerRow as { name?: string } | null)?.name ?? "Owner";
  const lines = (lineRows ?? []) as SoaLine[];
  const incomeLines = lines.filter((line) => line.line_type.startsWith("income_"));
  const deductionLines = lines.filter((line) => line.line_type.startsWith("deduction_"));
  const totalIncome = incomeLines.reduce((sum, line) => sum + Number(line.amount), 0);
  const totalDeductions = deductionLines.reduce((sum, line) => sum + Math.abs(Number(line.amount)), 0);
  const netRemittance = Number(statement.closing_balance ?? statement.net_remittance ?? 0);

  let propertyName: string | null = null;
  let unitLabel: string | null = null;
  if (statement.unit_id) {
    const { data: unitRow } = await supabase
      .from("units")
      .select("unit_label,properties(name)")
      .eq("id", statement.unit_id)
      .maybeSingle();
    unitLabel = (unitRow as { unit_label?: string } | null)?.unit_label ?? null;
    const property = (unitRow as { properties?: { name?: string } | { name?: string }[] | null } | null)?.properties;
    propertyName = (Array.isArray(property) ? property[0]?.name : property?.name) ?? null;
  } else if (statement.property_id) {
    const { data: propertyRow } = await supabase.from("properties").select("name").eq("id", statement.property_id).maybeSingle();
    propertyName = (propertyRow as { name?: string } | null)?.name ?? null;
  }

  return (
    <DashboardShell role="Owner" nav={nav} userName={ownerName}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/dashboard/owner#statements" className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
              <Icon name="arrow_back" size={18} /> Back to statements
            </Link>
            <h1 className="font-display text-2xl font-bold text-navy">Statement of Account</h1>
            <p className="mt-1 text-sm text-slate">{statement.period_start} to {statement.period_end}</p>
          </div>
          <a href={`/api/portal/soa/${id}?download=1`} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold text-navy hover:bg-surface-gray">
            <Icon name="download" size={18} /> Download
          </a>
        </div>
        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
          <div className="border-b border-line p-5">
            <p className="label-caps text-gold">SOA Preview</p>
            <h2 className="mt-1 font-display text-xl font-bold text-navy">{ownerName}</h2>
            <div className="mt-3 grid gap-3 text-sm text-slate sm:grid-cols-3">
              <div>
                <p className="label-caps text-slate">Period</p>
                <p className="mt-1 font-medium text-navy">{fmtPeriod(statement.period_start, statement.period_end)}</p>
              </div>
              <div>
                <p className="label-caps text-slate">Property</p>
                <p className="mt-1 font-medium text-navy">{propertyName ?? "Property"}{unitLabel ? ` - ${unitLabel}` : ""}</p>
              </div>
              <div>
                <p className="label-caps text-slate">Remittance due</p>
                <p className="mt-1 font-medium text-navy">{statement.payout_due_at ?? "Not set"}</p>
              </div>
            </div>
          </div>

          <section>
            <div className="bg-[#dbeafe] px-5 py-2.5 text-sm font-bold text-[#1a56db]">Income</div>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-line">
                {incomeLines.length === 0 ? (
                  <tr><td colSpan={2} className="px-5 py-4 text-center text-slate">No income recorded for this period.</td></tr>
                ) : incomeLines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-5 py-3 text-ink">{line.description}</td>
                    <td className="px-5 py-3 text-right font-medium text-navy">{peso(Number(line.amount))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#dbeafe]">
                  <td className="px-5 py-3 font-bold text-navy">Total Income</td>
                  <td className="px-5 py-3 text-right font-bold text-navy">{peso(Number(statement.total_payments ?? totalIncome))}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section>
            <div className="bg-[#fee2e2] px-5 py-2.5 text-sm font-bold text-[#e02424]">Deductions</div>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-line">
                {deductionLines.length === 0 ? (
                  <tr><td colSpan={3} className="px-5 py-4 text-center text-slate">No deductions recorded for this period.</td></tr>
                ) : deductionLines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-5 py-3 text-ink">{line.description}</td>
                    <td className="px-5 py-3 text-xs text-slate">{line.billing_note ?? ""}</td>
                    <td className="px-5 py-3 text-right font-medium text-navy">{peso(Math.abs(Number(line.amount)))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#fee2e2]">
                  <td colSpan={2} className="px-5 py-3 font-bold text-navy">Total Deductions</td>
                  <td className="px-5 py-3 text-right font-bold text-navy">{peso(Number(statement.total_expenses ?? totalDeductions))}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <div className="border-t-2 border-navy bg-surface-gray px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-display text-lg font-bold text-navy">Net Remittance</span>
              <span className={`font-display text-2xl font-bold ${netRemittance < 0 ? "text-error" : "text-navy"}`}>{peso(netRemittance)}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
