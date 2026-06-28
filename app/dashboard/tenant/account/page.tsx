import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DashboardShell, Panel, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";

export const metadata: Metadata = { title: "Tenant Account", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Dashboard",  icon: "dashboard",           href: "/dashboard/tenant" },
  { label: "My Lease",   icon: "description",         href: "/dashboard/tenant#lease" },
  { label: "Invoices",   icon: "request_quote",       href: "/dashboard/tenant/invoices" },
  { label: "Tickets",    icon: "confirmation_number", href: "/dashboard/tenant/tickets" },
  { label: "Documents",  icon: "folder",              href: "/dashboard/tenant/documents" },
  { label: "Notices",    icon: "campaign",            href: "/dashboard/tenant/notices" },
  { label: "Payments",   icon: "payments",            href: "/dashboard/tenant#payments" },
  { label: "Statements", icon: "receipt_long",        href: "/dashboard/tenant#statements" },
  { label: "Account",    icon: "manage_accounts",     href: "/dashboard/tenant/account" },
];

export default async function TenantAccountPage() {
  const { role, tenantId } = await getCurrentRole();
  if (role !== "tenant") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: tenantRow }, { data: { user } }] = await Promise.all([
    supabase.from("tenants").select("name").eq("id", tenantId ?? "").maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const tenantName = (tenantRow as { name?: string } | null)?.name ?? "Tenant";

  return (
    <DashboardShell role="Tenant" nav={nav} userName={tenantName}>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-navy">Account Settings</h1>
        <p className="mt-1 text-sm text-slate">
          Manage the sign-in password for {user?.email ?? "your account"}.
        </p>

        <div className="mt-6">
          <Panel title="Change password">
            <ChangePasswordForm />
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
