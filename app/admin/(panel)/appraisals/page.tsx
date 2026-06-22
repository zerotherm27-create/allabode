import { createClient } from "@/lib/supabase/server";
import { StatusForm } from "@/components/admin/status-form";
import { updateAppraisal } from "@/app/admin/actions";

const STATUSES = ["New", "Reviewing", "Scheduled", "Inspected", "Report in progress", "Completed", "Closed"];

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  property_location: string | null;
  property_type: string | null;
  appraisal_purpose: string | null;
  preferred_inspection_date: string | null;
  message: string | null;
  status: string;
  internal_notes: string | null;
  created_at: string;
};

export default async function AdminAppraisalsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appraisal_requests")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-navy">Appraisal requests</h1>

      <div className="mt-6 flex flex-col gap-4">
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-line-strong bg-surface p-10 text-center text-slate">
            No appraisal requests yet.
          </p>
        )}
        {rows.map((r) => (
          <article key={r.id} className="rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-navy">{r.name}</h2>
                <p className="text-sm text-slate">
                  <a href={`mailto:${r.email}`} className="hover:text-navy-700">{r.email}</a>
                  {r.phone && <> · {r.phone}</>}
                </p>
              </div>
              <span className="rounded-full bg-navy/5 px-2.5 py-1 text-xs font-medium text-navy-700">
                {r.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-slate sm:grid-cols-2">
              {r.property_location && <span>Location: {r.property_location}</span>}
              {r.property_type && <span>Type: {r.property_type}</span>}
              {r.appraisal_purpose && <span>Purpose: {r.appraisal_purpose}</span>}
              {r.preferred_inspection_date && <span>Inspection: {r.preferred_inspection_date}</span>}
            </div>
            {r.message && <p className="mt-2 text-sm text-slate">{r.message}</p>}
            <p className="mt-1 text-xs text-slate">Received: {new Date(r.created_at).toLocaleDateString()}</p>
            <StatusForm
              action={updateAppraisal.bind(null, r.id)}
              statuses={STATUSES}
              current={r.status}
              notes={r.internal_notes}
            />
          </article>
        ))}
      </div>
    </div>
  );
}
