import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, Panel, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";

export const metadata: Metadata = { title: "Notices", robots: { index: false } };

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

const TYPE_COLOR: Record<string, string> = {
  info:        "bg-navy/5 text-navy-700",
  warning:     "bg-gold/10 text-gold-bright",
  maintenance: "bg-reserved/10 text-reserved",
  urgent:      "bg-sold/10 text-sold",
};
const TYPE_ICON: Record<string, string> = {
  info: "info", warning: "warning", maintenance: "build", urgent: "emergency",
};

type Notice = {
  id: string; title: string; body: string; notice_type: string;
  published_at: string; expires_at: string | null;
};

export default async function TenantNoticesPage() {
  const { role, tenantId } = await getCurrentRole();
  if (role !== "tenant") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data: noticeData }, { data: tenantRow }] = await Promise.all([
    supabase.from("notices")
      .select("id,title,body,notice_type,published_at,expires_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false }),
    supabase.from("tenants").select("name").eq("id", tenantId ?? "").maybeSingle(),
  ]);

  const notices    = (noticeData ?? []) as Notice[];
  const tenantName = (tenantRow as { name?: string } | null)?.name ?? "Tenant";

  return (
    <DashboardShell role="Tenant" nav={nav} userName={tenantName}>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-navy">Notices</h1>
        <p className="mt-1 text-sm text-slate">Announcements from All Abode Property Solutions</p>

        <div className="mt-6 flex flex-col gap-4">
          {notices.length === 0 ? (
            <Panel title="No notices">
              <p className="py-4 text-center text-sm text-slate">No notices at this time. Check back later.</p>
            </Panel>
          ) : (
            notices.map((n) => (
              <div key={n.id} className="rounded-lg border border-line bg-surface p-5">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md ${TYPE_COLOR[n.notice_type] ?? "bg-navy/5 text-navy-700"}`}>
                    <Icon name={TYPE_ICON[n.notice_type] ?? "info"} size={20} fill={1} />
                  </span>
                  <div>
                    <p className="font-display font-semibold text-navy">{n.title}</p>
                    <p className="mt-0.5 text-xs text-slate">
                      {new Date(n.published_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{n.body}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
