import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { inputCls } from "@/components/admin/form-kit";
import {
  updateTicketStatus, assignTicket, addComment,
} from "@/app/admin/ticket-actions";
import {
  TICKET_STATUS_LABEL, TICKET_STATUS_COLOR,
  TICKET_PRIORITY_COLOR, TICKET_PRIORITY_ICON,
  OPEN_STATUSES, isSlaBreach,
} from "@/lib/tickets";

type Comment = {
  id: string; author_name: string; author_role: string;
  body: string; is_internal: boolean; created_at: string;
};
type Ticket = {
  id: string; ticket_number: string; category: string; subcategory: string | null;
  priority: string; subject: string; description: string; status: string;
  sla_due_at: string | null; first_response_at: string | null;
  resolved_at: string | null; closed_at: string | null;
  resolution_notes: string | null; created_at: string; updated_at: string;
  tenants: { id: string; name: string; email: string } | null;
  properties: { id: string; name: string; address: string | null } | null;
  units: { id: string; unit_label: string } | null;
  vendors: { id: string; name: string } | null;
  ticket_comments: Comment[];
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  new:                 ["triaged", "assigned", "cancelled"],
  triaged:             ["assigned", "in_progress", "cancelled"],
  assigned:            ["in_progress", "waiting_on_tenant", "waiting_on_vendor", "cancelled"],
  in_progress:         ["waiting_on_tenant", "waiting_on_owner", "waiting_on_vendor", "resolved", "escalated"],
  waiting_on_tenant:   ["in_progress", "resolved", "closed"],
  waiting_on_owner:    ["in_progress", "resolved", "closed"],
  waiting_on_vendor:   ["in_progress", "resolved", "closed"],
  escalated:           ["in_progress", "resolved", "closed"],
  resolved:            ["closed", "reopened"],
  reopened:            ["in_progress", "assigned"],
  closed:              [],
  cancelled:           [],
  duplicate:           [],
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data }, { data: vendorData }, { data: staffData }] = await Promise.all([
    supabase
      .from("tickets")
      .select(`
        id, ticket_number, category, subcategory, priority, subject, description,
        status, sla_due_at, first_response_at, resolved_at, closed_at,
        resolution_notes, created_at, updated_at,
        tenants(id,name,email),
        properties(id,name,address),
        units(id,unit_label),
        vendors(id,name),
        ticket_comments(id,author_name,author_role,body,is_internal,created_at)
      `)
      .eq("id", id)
      .maybeSingle(),
    supabase.from("vendors").select("id,name").order("name"),
    supabase.from("users").select("id,email").eq("role", "staff").order("email"),
  ]);

  if (!data) notFound();
  const t = data as unknown as Ticket;
  const tenant   = Array.isArray(t.tenants)     ? t.tenants[0]     : t.tenants;
  const property = Array.isArray(t.properties)  ? t.properties[0]  : t.properties;
  const unit     = Array.isArray(t.units)       ? t.units[0]       : t.units;
  const vendor   = Array.isArray(t.vendors)     ? t.vendors[0]     : t.vendors;
  const comments = [...(t.ticket_comments ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const vendors = (vendorData ?? []) as { id: string; name: string }[];
  const staff   = (staffData  ?? []) as { id: string; email: string }[];

  const isOpen   = OPEN_STATUSES.includes(t.status);
  const breached = isSlaBreach(t.sla_due_at) && isOpen;
  const nextStatuses = STATUS_TRANSITIONS[t.status] ?? [];

  const doUpdateStatus = updateTicketStatus.bind(null, id);
  const doAssign       = assignTicket.bind(null, id);
  const doComment      = addComment.bind(null, id);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to tickets
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">{t.ticket_number}</h1>
          <p className="mt-0.5 text-sm text-slate">{t.subject}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs font-semibold capitalize ${TICKET_PRIORITY_COLOR[t.priority] ?? "text-slate"}`}>
            <Icon name={TICKET_PRIORITY_ICON[t.priority] ?? "remove"} size={14} />
            {t.priority}
          </span>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${TICKET_STATUS_COLOR[t.status] ?? "bg-surface-gray text-slate"}`}>
            {TICKET_STATUS_LABEL[t.status] ?? t.status}
          </span>
        </div>
      </div>

      {breached && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-sold/20 bg-sold/5 px-4 py-2.5 text-sm text-sold">
          <Icon name="warning" size={18} fill={1} />
          SLA breached — was due {new Date(t.sla_due_at!).toLocaleDateString("en-PH")}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: description + comments */}
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-line bg-surface p-5">
            <h2 className="mb-3 font-display text-sm font-semibold text-navy">Description</h2>
            <p className="whitespace-pre-wrap text-sm text-ink">{t.description}</p>
          </div>

          {/* Comments thread */}
          <div className="rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-sm font-semibold text-navy">
                Comments ({comments.filter((c) => !c.is_internal).length} public
                {comments.filter((c) => c.is_internal).length > 0
                  ? ` · ${comments.filter((c) => c.is_internal).length} internal`
                  : ""})
              </h2>
            </div>
            <div className="divide-y divide-line">
              {comments.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className={`px-5 py-4 ${c.is_internal ? "bg-gold/3" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full bg-navy/10 text-xs font-semibold text-navy">
                        {c.author_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-navy">{c.author_name}</span>
                      <span className="text-xs text-slate capitalize">{c.author_role}</span>
                      {c.is_internal && (
                        <span className="rounded bg-gold/15 px-1.5 py-0.5 text-xs font-medium text-gold-bright">Internal</span>
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
                  placeholder="Add a comment…"
                  className={inputCls}
                />
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate">
                    <input type="checkbox" name="is_internal" className="rounded" />
                    Internal note (hidden from tenant/owner)
                  </label>
                  <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
                    <Icon name="send" size={15} /> Send
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right: meta + actions */}
        <div className="flex flex-col gap-4">
          {/* Meta */}
          <div className="rounded-lg border border-line bg-surface p-5">
            <h2 className="mb-3 font-display text-sm font-semibold text-navy">Details</h2>
            <dl className="flex flex-col gap-3 text-sm">
              {[
                ["Property", (property as { name?: string } | null)?.name ?? "—"],
                ["Unit",     (unit as { unit_label?: string } | null)?.unit_label ?? "—"],
                ["Tenant",   (tenant as { name?: string } | null)?.name ?? "—"],
                ["Category", t.category.replace(/_/g, " ")],
                ["SLA due",  t.sla_due_at ? new Date(t.sla_due_at).toLocaleDateString("en-PH") : "—"],
                ["Opened",   new Date(t.created_at).toLocaleDateString("en-PH")],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-slate">{k}</dt>
                  <dd className="text-right font-medium text-navy capitalize">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Status transition */}
          {nextStatuses.length > 0 && (
            <div className="rounded-lg border border-line bg-surface p-5">
              <h2 className="mb-3 font-display text-sm font-semibold text-navy">Update status</h2>
              <form action={doUpdateStatus} className="flex flex-col gap-3">
                <select name="status" className={inputCls}>
                  {nextStatuses.map((s) => (
                    <option key={s} value={s}>{TICKET_STATUS_LABEL[s] ?? s}</option>
                  ))}
                </select>
                <button type="submit" className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
                  Update
                </button>
              </form>
            </div>
          )}

          {/* Assign */}
          {isOpen && (
            <div className="rounded-lg border border-line bg-surface p-5">
              <h2 className="mb-3 font-display text-sm font-semibold text-navy">Assign</h2>
              <form action={doAssign} className="flex flex-col gap-3">
                {staff.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs text-slate">Staff</label>
                    <select name="assigned_to" className={inputCls}>
                      <option value="">Unassigned</option>
                      {staff.map((u) => (
                        <option key={u.id} value={u.id}>{u.email}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs text-slate">Vendor</label>
                  <select name="vendor_id" className={inputCls}>
                    <option value="">{(vendor as { name?: string } | null)?.name ?? "No vendor"}</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="rounded-md bg-surface-gray px-4 py-2 text-sm font-semibold text-navy hover:bg-line">
                  Save assignment
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
