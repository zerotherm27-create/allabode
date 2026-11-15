import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DashboardShell, Panel } from "@/components/dashboard/shell";
import { tenantNav as nav } from "@/lib/dashboard/nav";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";

export const metadata: Metadata = { title: "Tenant Account", robots: { index: false } };

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
