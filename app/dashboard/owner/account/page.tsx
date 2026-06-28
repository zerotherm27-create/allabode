import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DashboardShell, Panel, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";

export const metadata: Metadata = { title: "Owner Account", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Dashboard",  icon: "dashboard",           href: "/dashboard/owner" },
  { label: "Properties", icon: "apartment",           href: "/dashboard/owner#properties" },
  { label: "Tickets",    icon: "confirmation_number", href: "/dashboard/owner/tickets" },
  { label: "Documents",  icon: "folder",              href: "/dashboard/owner/documents" },
  { label: "Notices",    icon: "campaign",            href: "/dashboard/owner/notices" },
  { label: "Statements", icon: "receipt_long",        href: "/dashboard/owner#statements" },
  { label: "Expenses",   icon: "payments",            href: "/dashboard/owner#expenses" },
  { label: "Account",    icon: "manage_accounts",     href: "/dashboard/owner/account" },
];

export default async function OwnerAccountPage() {
  const { role, ownerId } = await getCurrentRole();
  if (role !== "owner") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: ownerRow }, { data: { user } }] = await Promise.all([
    supabase.from("owners").select("name").eq("id", ownerId ?? "").maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const ownerName = (ownerRow as { name?: string } | null)?.name ?? "Owner";

  return (
    <DashboardShell role="Owner" nav={nav} userName={ownerName}>
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
