import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";
import { site } from "@/lib/site";
import { SignOutButton } from "@/components/team/sign-out-button";

export const metadata: Metadata = { title: "Specialist dashboard", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Overview", icon: "dashboard", href: "/dashboard/specialist" },
  { label: "My listings", icon: "home_work", href: "/dashboard/specialist/listings" },
  { label: "Profile", icon: "person", href: "/dashboard/specialist/profile" },
];

const STATE_COPY: Record<string, { icon: string; title: string; body: string }> = {
  pending: {
    icon: "hourglass_top",
    title: "We're reviewing your application",
    body: "Our team checks every application against the broker's accreditation requirements. We'll email you as soon as a decision is made. You don't need to do anything else.",
  },
  rejected: {
    icon: "block",
    title: "Your application wasn't approved",
    body: "We couldn't approve this application. If you think something was missed or you'd like to know why, get in touch and we'll go through it with you.",
  },
  suspended: {
    icon: "block",
    title: "Your account is suspended",
    body: "Your listings are hidden from the public site while your account is suspended. Get in touch and we'll explain what's needed to restore access.",
  },
};

export default async function SpecialistLayout({ children }: { children: React.ReactNode }) {
  const { role, specialistId } = await getCurrentRole();
  if (role !== "specialist" || !specialistId) redirect(homeForRole(role));

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("specialists")
    .select("display_name,status")
    .eq("id", specialistId)
    .maybeSingle();
  const status = (row as { status?: string } | null)?.status ?? "pending";
  const name = (row as { display_name?: string } | null)?.display_name ?? "Specialist";

  if (status !== "approved") {
    const copy = STATE_COPY[status] ?? STATE_COPY.pending;
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-gray p-4">
        <section
          aria-labelledby="specialist-state-title"
          className="w-full max-w-lg rounded-lg border border-line bg-surface p-6 md:p-8"
        >
          <span className="flex size-12 items-center justify-center rounded-md bg-navy/5 text-navy-700">
            <Icon name={copy.icon} size={24} />
          </span>
          <h1 id="specialist-state-title" className="mt-4 font-display text-2xl font-bold text-navy">
            {copy.title}
          </h1>
          <p className="mt-2 text-base text-slate">{copy.body}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={site.emailHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
            >
              <Icon name="mail" size={18} />
              Contact All Abode
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line px-5 text-sm font-semibold text-navy transition-colors hover:bg-surface-gray focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
            >
              Back to the website
            </Link>
          </div>
          <SignOutButton />
        </section>
      </main>
    );
  }

  return (
    <DashboardShell role="Specialist" nav={nav} userName={name}>
      {children}
    </DashboardShell>
  );
}
