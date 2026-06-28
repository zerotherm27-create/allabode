import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Account Settings", robots: { index: false } };

export default async function AdminAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy">Account Settings</h1>
      <p className="mt-1 text-sm text-slate">
        Manage the sign-in password for {user?.email ?? "your admin account"}.
      </p>

      <section className="mt-6 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-navy">Change password</h2>
        <p className="mt-1 text-sm text-slate">
          This updates the password for your currently signed-in account.
        </p>
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}
