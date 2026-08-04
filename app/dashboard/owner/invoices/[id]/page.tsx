import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import { Reveal } from "@/components/motion";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Dashboard",  icon: "dashboard",           href: "/dashboard/owner" },
  { label: "Properties", icon: "apartment",           href: "/dashboard/owner#properties" },
  { label: "Tickets",    icon: "confirmation_number", href: "/dashboard/owner/tickets" },
  { label: "Documents",  icon: "folder",              href: "/dashboard/owner/documents" },
  { label: "Notices",    icon: "campaign",            href: "/dashboard/owner/notices" },
  { label: "Invoices",   icon: "request_quote",       href: "/dashboard/owner/invoices" },
  { label: "Statements", icon: "receipt_long",        href: "/dashboard/owner#statements" },
  { label: "Expenses",   icon: "payments",            href: "/dashboard/owner#expenses" },
];

export default async function OwnerInvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role, ownerId } = await getCurrentRole();
  if (role !== "owner") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: invoice }, { data: ownerRow }] = await Promise.all([
    supabase.from("invoices")
      .select("id,invoice_number,due_date,status,total_amount,amount_paid")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("owners").select("name").eq("id", ownerId ?? "").maybeSingle(),
  ]);

  if (!invoice) notFound();
  const ownerName = (ownerRow as { name?: string } | null)?.name ?? "Owner";
  const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);
  const canPay = ["issued", "overdue", "partially_paid"].includes(String(invoice.status)) && balance > 0;

  return (
    <DashboardShell role="Owner" nav={nav} userName={ownerName}>
      <Reveal as="div" className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/dashboard/owner/invoices" className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
              <Icon name="arrow_back" size={18} /> Back to invoices
            </Link>
            <h1 className="font-display text-2xl font-bold text-navy">{invoice.invoice_number}</h1>
            <p className="mt-1 text-sm text-slate">Due {invoice.due_date}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canPay && (
              <Link href={`/dashboard/owner/invoices/${id}/pay`} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 press">
                <Icon name="payments" size={18} /> Pay now
              </Link>
            )}
            <a href={`/api/portal/invoices/${id}?download=1`} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold text-navy hover:bg-surface-gray">
              <Icon name="download" size={18} /> Download
            </a>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
          <iframe src={`/api/portal/invoices/${id}`} title="Invoice PDF" className="h-[78vh] w-full" />
        </div>
      </Reveal>
    </DashboardShell>
  );
}
