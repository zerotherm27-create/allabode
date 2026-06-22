import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/shell";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-8 text-center">
        <p className="max-w-md text-slate">
          Supabase isn’t configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to use the admin dashboard.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return <AdminShell email={user.email ?? "Staff"}>{children}</AdminShell>;
}
