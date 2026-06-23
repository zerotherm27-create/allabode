import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { DashboardShell, Panel, type NavItem } from "@/components/dashboard/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole, homeForRole } from "@/lib/auth/role";
import { addTenantComment } from "@/app/admin/ticket-actions";
import { TICKET_STATUS_LABEL, TICKET_STATUS_COLOR, TICKET_PRIORITY_COLOR, OPEN_STATUSES } from "@/lib/tickets";

export const metadata: Metadata = { title: "Ticket", robots: { index: false } };

const nav: NavItem[] = [
  { label: "Dashboard",  icon: "dashboard",           href: "/dashboard/tenant" },
  { label: "My Lease",   icon: "description",         href: "/dashboard/tenant#lease" },
  { label: "Invoices",   icon: "request_quote",       href: "/dashboard/tenant/invoices" },
  { label: "Tickets",    icon: "confirmation_number", href: "/dashboard/tenant/tickets" },
  { label: "Payments",   icon: "payments",            href: "/dashboard/tenant#payments" },
  { label: "Statements", icon: "receipt_long",        href: "/dashboard/tenant#statements" },
];

const inputCls = "w-full rounded-md border border-line bg-surface-gray px-3 py-2.5 text-sm text-ink placeholder:text-slate focus:border-navy-700 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-navy-700/15";

type Comment = {
  id: string; author_name: string; author_role: string;
  body: string; is_internal: boolean; created_at: string;
};
type Ticket = {
  id: string; ticket_number: string; subject: string; description: string;
  category: string; priority: string; status: string;
  created_at: string; updated_at: string; resolved_at: string | null;
  ticket_comments: Comment[];
};

export default async function TenantTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role, tenantId } = await getCurrentRole();
  if (role !== "tenant") redirect(homeForRole(role));

  const supabase = await createClient();
  const [{ data }, { data: tenantRow }] = await Promise.all([
    supabase.from("tickets")
      .select("id,ticket_number,subject,description,category,priority,status,created_at,updated_at,resolved_at,ticket_comments(id,author_name,author_role,body,is_internal,created_at)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("tenants").select("name").eq("id", tenantId ?? "").maybeSingle(),
  ]);

  if (!data) notFound();
  const ticket     = data as unknown as Ticket;
  const tenantName = (tenantRow as { name?: string } | null)?.name ?? "Tenant";
  const comments   = [...(ticket.ticket_comments ?? [])]
    .filter((c) => !c.is_internal)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const isOpen   = OPEN_STATUSES.includes(ticket.status);
  const doComment = addTenantComment.bind(null, id);

  return (
    <DashboardShell role="Tenant" nav={nav} userName={tenantName}>
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/tenant/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
          <Icon name="arrow_back" size={18} /> Back to tickets
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="label-caps text-xs text-slate">{ticket.ticket_number}</span>
            <h1 className="mt-1 font-display text-xl font-bold text-navy">{ticket.subject}</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${TICKET_STATUS_COLOR[ticket.status] ?? "bg-surface-gray text-slate"}`}>
            {TICKET_STATUS_LABEL[ticket.status] ?? ticket.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-slate">
          <div className="rounded-md border border-line bg-surface py-2">
            <p className="font-medium text-navy capitalize">{ticket.category.replace(/_/g, " ")}</p>
            <p>Category</p>
          </div>
          <div className="rounded-md border border-line bg-surface py-2">
            <p className={`font-medium capitalize ${TICKET_PRIORITY_COLOR[ticket.priority] ?? "text-navy"}`}>{ticket.priority}</p>
            <p>Priority</p>
          </div>
          <div className="rounded-md border border-line bg-surface py-2">
            <p className="font-medium text-navy">{new Date(ticket.created_at).toLocaleDateString("en-PH")}</p>
            <p>Submitted</p>
          </div>
        </div>

        <div className="mt-6">
          <Panel title="Your request">
            <p className="whitespace-pre-wrap text-sm text-ink">{ticket.description}</p>
          </Panel>
        </div>

        {/* Comments */}
        <div className="mt-6 rounded-lg border border-line bg-surface">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-display text-sm font-semibold text-navy">Conversation</h2>
          </div>
          <div className="divide-y divide-line">
            {comments.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate">
                No messages yet. Our team will respond within your SLA window.
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className={`px-5 py-4 ${c.author_role === "staff" ? "bg-navy/2" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white ${c.author_role === "staff" ? "bg-navy" : "bg-navy-700"}`}>
                      {c.author_name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-navy">{c.author_name}</span>
                    {c.author_role === "staff" && (
                      <span className="rounded bg-navy/10 px-1.5 py-0.5 text-xs text-navy">All Abode</span>
                    )}
                    <span className="ml-auto text-xs text-slate">
                      {new Date(c.created_at).toLocaleDateString("en-PH")}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{c.body}</p>
                </div>
              ))
            )}
          </div>
          {isOpen && (
            <form action={doComment} className="border-t border-line px-5 py-4 flex flex-col gap-3">
              <textarea
                name="body"
                required
                rows={3}
                placeholder="Add a reply or update…"
                className={inputCls}
              />
              <div className="flex justify-end">
                <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
                  <Icon name="send" size={15} /> Reply
                </button>
              </div>
            </form>
          )}
          {!isOpen && (
            <div className="border-t border-line px-5 py-4 text-center text-sm text-slate">
              This ticket is {TICKET_STATUS_LABEL[ticket.status]?.toLowerCase()}. Contact us to reopen it.
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
