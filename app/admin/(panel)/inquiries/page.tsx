import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusForm } from "@/components/admin/status-form";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { Icon } from "@/components/icon";
import { updateInquiry, deleteInquiry } from "@/app/admin/actions";
import { specialistSourceLabel } from "@/lib/leads/specialist-lead";
import { isUnassignedSpecialistLead } from "@/lib/leads/intake";
import { PropertySubmission } from "@/components/admin/property-submission";
import { InquiryAssignForm } from "@/components/admin/inquiry-assign-form";

const STATUSES = ["New", "Contacted", "Scheduled", "In progress", "Closed", "Spam"];

type Row = {
  id: string;
  type: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  preferred_viewing_date: string | null;
  preferred_contact_method: string | null;
  status: string;
  internal_notes: string | null;
  created_at: string;
  details: Record<string, unknown> | null;
  specialist_id?: string | null;
  lead_stage?: string | null;
};

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: spData }] = await Promise.all([
    supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
    supabase.from("specialists").select("id,display_name").eq("status", "approved").order("display_name"),
  ]);
  const all = (data ?? []) as Row[];
  const specialists = ((spData ?? []) as { id: string; display_name: string }[]).map((x) => ({
    id: x.id,
    name: x.display_name,
  }));
  const nameById = new Map(specialists.map((x) => [x.id, x.name]));
  const gapCount = all.filter(isUnassignedSpecialistLead).length;
  const onlyGap = filter === "unassigned-specialist";
  const rows = onlyGap ? all.filter(isUnassignedSpecialistLead) : all;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-navy">Inquiries</h1>
      <p className="mt-1 text-sm text-slate">
        Listing inquiries, viewing requests, contact messages, and property submissions.
      </p>

      <nav aria-label="Inquiry filter" className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href="/admin/inquiries"
          aria-current={onlyGap ? undefined : "page"}
          className={`inline-flex h-11 items-center rounded-md border px-4 font-medium ${onlyGap ? "border-line text-slate hover:bg-surface-gray" : "border-navy bg-navy text-white"}`}
        >
          All ({all.length})
        </Link>
        <Link
          href="/admin/inquiries?filter=unassigned-specialist"
          aria-current={onlyGap ? "page" : undefined}
          className={`inline-flex h-11 items-center rounded-md border px-4 font-medium ${onlyGap ? "border-navy bg-navy text-white" : "border-line text-slate hover:bg-surface-gray"}`}
        >
          Unassigned specialist-page leads ({gapCount})
        </Link>
      </nav>

      <div className="mt-6 flex flex-col gap-4">
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-line-strong bg-surface p-10 text-center text-slate">
            {onlyGap ? "No unassigned specialist-page leads." : "No inquiries yet."}
          </p>
        )}
        {rows.map((r) => {
          const source = specialistSourceLabel(r.details);
          return (
          <article key={r.id} className="rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-navy">{r.name}</h2>
                <p className="text-sm text-slate">
                  <a href={`mailto:${r.email}`} className="hover:text-navy-700">{r.email}</a>
                  {r.phone && <> · {r.phone}</>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium capitalize text-navy">
                  {r.type}
                </span>
                <span className="rounded-full bg-navy/5 px-2.5 py-1 text-xs font-medium text-navy-700">
                  {r.status}
                </span>
                <ConfirmActionForm
                  action={deleteInquiry.bind(null, r.id)}
                  message={`Delete this inquiry from ${r.name}? This can't be undone.`}
                >
                  <button
                    type="submit"
                    aria-label="Delete inquiry"
                    className="flex h-9 w-9 items-center justify-center rounded-md text-error hover:bg-error-bg press"
                  >
                    <Icon name="delete" size={18} />
                  </button>
                </ConfirmActionForm>
              </div>
            </div>
            {isUnassignedSpecialistLead(r) && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-ink">
                <Icon name="error" size={14} />
                Specialist-page lead, not assigned
              </p>
            )}
            {source && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-navy-700">
                <Icon name="person" size={16} />
                {source}
              </p>
            )}
            {r.type === "list-property" ? (
              <PropertySubmission message={r.message} details={r.details} />
            ) : (
              r.message && <p className="mt-3 text-sm text-slate">{r.message}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate">
              {r.preferred_viewing_date && <span>Viewing: {r.preferred_viewing_date}</span>}
              {r.preferred_contact_method && <span>Contact via: {r.preferred_contact_method}</span>}
              <span>Received: {new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <p className="mt-3 text-xs text-slate">
              Specialist:{" "}
              <span className="font-medium text-navy">
                {r.specialist_id ? (nameById.get(r.specialist_id) ?? "Assigned (not approved)") : "Unassigned"}
              </span>
              {r.lead_stage && <> · Stage: <span className="font-medium text-navy">{r.lead_stage}</span></>}
            </p>
            <InquiryAssignForm inquiryId={r.id} current={r.specialist_id ?? null} specialists={specialists} />
            <StatusForm
              action={updateInquiry.bind(null, r.id)}
              statuses={STATUSES}
              current={r.status}
              notes={r.internal_notes}
            />
          </article>
          );
        })}
      </div>
    </div>
  );
}
