import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { Panel } from "@/components/dashboard/shell";
import { LeadNotesForm, LeadStageForm } from "@/components/specialist/lead-controls";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/role";
import { consentState, isMigrationMissing } from "@/lib/leads/inbox";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  type: string;
  listing_id: string | null;
  lead_stage: string;
  internal_notes: string | null;
  consent_followup: boolean | null;
  unsubscribed_at: string | null;
  preferred_viewing_date: string | null;
  preferred_contact_method: string | null;
  created_at: string;
};
type Send = {
  id: string;
  status: string;
  due_at: string;
  sent_at: string | null;
  skip_reason: string | null;
  email_templates: { name: string; subject: string } | { name: string; subject: string }[] | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function SpecialistLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { specialistId } = await getCurrentRole();
  if (!specialistId) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select(
      "id,name,email,phone,message,type,listing_id,lead_stage,internal_notes,consent_followup,unsubscribed_at,preferred_viewing_date,preferred_contact_method,created_at",
    )
    .eq("id", id)
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (error && !isMigrationMissing(error)) console.error("[specialist/leads] detail failed:", error);
  const lead = data as Lead | null;
  if (!lead) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard/specialist/leads" className={`inline-flex min-h-11 items-center gap-1 text-sm font-medium text-navy-700 ${focus}`}>
          <Icon name="arrow_back" size={16} /> Back to leads
        </Link>
        <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-8 text-center text-sm text-slate">
          {error ? "Lead tracking isn't available right now. Please try again later." : "This lead could not be found."}
        </p>
      </div>
    );
  }

  // Listing link (public listing slug), only if the listing is readable.
  let listing: { slug: string; title: string } | null = null;
  if (lead.listing_id) {
    const { data: l } = await supabase.from("listings").select("slug,title").eq("id", lead.listing_id).maybeSingle();
    listing = (l as { slug: string; title: string } | null) ?? null;
  }

  // Email history (read-only, fail-soft).
  const { data: sendData, error: sendErr } = await supabase
    .from("lead_email_sends")
    .select("id,status,due_at,sent_at,skip_reason,email_templates(name,subject)")
    .eq("inquiry_id", lead.id)
    .order("due_at", { ascending: true });
  if (sendErr && !isMigrationMissing(sendErr)) console.error("[specialist/leads] sends failed:", sendErr);
  const sends = ((sendData ?? []) as unknown as Send[]).map((s) => ({
    ...s,
    tpl: Array.isArray(s.email_templates) ? s.email_templates[0] : s.email_templates,
  }));

  const consent = consentState(lead);
  const row = "flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4";
  const linkCls = `inline-flex min-h-11 items-center gap-2 text-navy-700 underline ${focus}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/specialist/leads" className={`inline-flex min-h-11 items-center gap-1 text-sm font-medium text-navy-700 ${focus}`}>
        <Icon name="arrow_back" size={16} /> Back to leads
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-navy">{lead.name}</h1>
      <p className="mt-1 text-sm text-slate">Received {when(lead.created_at)}</p>

      <div className="mt-6 space-y-6">
        <Panel title="Contact">
          <dl className="space-y-1 text-sm">
            <div className={row}>
              <dt className="w-28 shrink-0 text-slate">Email</dt>
              <dd>
                <a href={`mailto:${lead.email}`} className={linkCls}>
                  <Icon name="mail" size={16} /> {lead.email}
                </a>
              </dd>
            </div>
            {lead.phone && (
              <div className={row}>
                <dt className="w-28 shrink-0 text-slate">Phone</dt>
                <dd>
                  <a href={`tel:${lead.phone.replace(/[^+\d]/g, "")}`} className={linkCls}>
                    <Icon name="call" size={16} /> {lead.phone}
                  </a>
                </dd>
              </div>
            )}
            {lead.preferred_contact_method && (
              <div className={row}>
                <dt className="w-28 shrink-0 text-slate">Prefers</dt>
                <dd className="text-ink">{lead.preferred_contact_method}</dd>
              </div>
            )}
            {lead.preferred_viewing_date && (
              <div className={row}>
                <dt className="w-28 shrink-0 text-slate">Viewing date</dt>
                <dd className="text-ink">{lead.preferred_viewing_date}</dd>
              </div>
            )}
            <div className={row}>
              <dt className="w-28 shrink-0 text-slate">Source</dt>
              <dd className="text-ink">
                {listing ? (
                  <Link href={`/listings/${listing.slug}`} className={linkCls}>
                    {lead.type === "viewing" ? "Viewing request" : "Inquiry"} on {listing.title}
                    <Icon name="open_in_new" size={14} />
                  </Link>
                ) : lead.type === "viewing" ? (
                  "Viewing request"
                ) : (
                  "Your profile page"
                )}
              </dd>
            </div>
            <div className={row}>
              <dt className="w-28 shrink-0 text-slate">Follow-up emails</dt>
              <dd>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    consent === "consented" ? "bg-available/15 text-navy" : "bg-surface-gray text-navy"
                  }`}
                >
                  {consent === "consented"
                    ? "Agreed to follow-up emails"
                    : consent === "unsubscribed"
                      ? `Unsubscribed ${when(lead.unsubscribed_at as string)}`
                      : "No follow-up consent"}
                </span>
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Message">
          <p className="whitespace-pre-wrap text-sm text-ink">{lead.message?.trim() || "No message."}</p>
        </Panel>

        <Panel title="Progress">
          <LeadStageForm leadId={lead.id} stage={lead.lead_stage} />
        </Panel>

        <Panel title="Notes">
          <LeadNotesForm leadId={lead.id} notes={lead.internal_notes ?? ""} />
        </Panel>

        <Panel title="Email history">
          {sends.length === 0 ? (
            <p className="text-sm text-slate">No automatic follow-up emails for this lead yet.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {sends.map((s) => (
                <li key={s.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="block font-medium text-navy">{s.tpl?.name ?? "Follow-up email"}</span>
                    {s.tpl?.subject && <span className="block text-slate">{s.tpl.subject}</span>}
                  </span>
                  <span className="text-xs text-slate">
                    <span className="mr-2 rounded-full bg-surface-gray px-2.5 py-1 font-medium capitalize text-navy">
                      {s.status}
                    </span>
                    {s.status === "sent" && s.sent_at
                      ? when(s.sent_at)
                      : s.status === "queued"
                        ? `Due ${when(s.due_at)}`
                        : s.status === "skipped" && s.skip_reason
                          ? s.skip_reason.replace(/_/g, " ")
                          : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
