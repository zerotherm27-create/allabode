import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";

export const metadata: Metadata = { title: "Tenant SOA", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Dashboard",  icon: "dashboard",           href: "/dashboard/tenant" },
  { label: "My Lease",   icon: "description",         href: "/dashboard/tenant#lease" },
  { label: "Invoices",   icon: "request_quote",       href: "/dashboard/tenant/invoices" },
  { label: "Tickets",    icon: "confirmation_number", href: "/dashboard/tenant/tickets" },
  { label: "Documents",  icon: "folder",              href: "/dashboard/tenant/documents" },
  { label: "Notices",    icon: "campaign",            href: "/dashboard/tenant/notices" },
  { label: "Payments",   icon: "payments",            href: "/dashboard/tenant#payments" },
  { label: "Statements", icon: "receipt_long",        href: "/dashboard/tenant#statements" },
];

export default async function TenantStatementViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role, tenantId } = await getCurrentRole();
  if (role !== "tenant") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: statement }, { data: tenantRow }] = await Promise.all([
    supabase.from("statements_of_account")
      .select("id,period_start,period_end,status,pdf_path")
      .eq("id", id)
      .eq("statement_type", "tenant")
      .maybeSingle(),
    supabase.from("tenants").select("name").eq("id", tenantId ?? "").maybeSingle(),
  ]);

  if (!statement || statement.status !== "published" || !statement.pdf_path) notFound();
  const tenantName = (tenantRow as { name?: string } | null)?.name ?? "Tenant";

  return (
    <DashboardShell role="Tenant" nav={nav} userName={tenantName}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/dashboard/tenant#statements" className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
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
          <iframe src={`/api/portal/soa/${id}`} title="Statement of Account PDF" className="h-[78vh] w-full" />
        </div>
      </div>
    </DashboardShell>
  );
}
