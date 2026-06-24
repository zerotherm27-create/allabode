import { redirect } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { getCurrentRole, linkAndGetPortalRole } from "@/lib/auth/role";

export const metadata = { title: "Portal", robots: { index: false } };

export default async function PortalIndexPage() {
  const { email } = await getCurrentRole();
  if (!email) redirect("/portal/login");

  // Link auth account to owner/tenant record on every visit (idempotent),
  // then route to the correct dashboard. Checks owner/tenant BEFORE staff so
  // that a user in both public.users and owners/tenants reaches the portal.
  const { role, redirect: dest } = await linkAndGetPortalRole();
  if (role) redirect(dest);

  // Signed in but no matching owner/tenant record yet → pending.
  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy px-5">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-reserved/10 text-reserved">
          <Icon name="hourglass_top" size={26} />
        </span>
        <h1 className="mt-4 font-display text-xl font-bold text-navy">Account pending</h1>
        <p className="mt-2 text-sm text-slate">
          Your account <span className="font-medium text-navy">{email}</span> isn’t linked to a
          property record yet. Please ask your All Abode property manager to add you, then refresh
          this page.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Icon name="refresh" size={18} />
            Refresh
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-2.5 text-sm font-medium text-navy hover:bg-surface-gray"
          >
            Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}
