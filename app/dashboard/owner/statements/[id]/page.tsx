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

export default async function OwnerStatementViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role, ownerId } = await getCurrentRole();
  if (role !== "owner") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: statement }, { data: ownerRow }] = await Promise.all([
    supabase.from("statements_of_account")
      .select("id,period_start,period_end,status,pdf_path")
      .eq("id", id)
      .eq("statement_type", "owner")
      .maybeSingle(),
    supabase.from("owners").select("name").eq("id", ownerId ?? "").maybeSingle(),
  ]);

  if (!statement || statement.status !== "published" || !statement.pdf_path) notFound();
  const ownerName = (ownerRow as { name?: string } | null)?.name ?? "Owner";

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
          <iframe src={`/api/portal/soa/${id}`} title="Statement of Account PDF" className="h-[78vh] w-full" />
        </div>
      </div>
    </DashboardShell>
  );
}
