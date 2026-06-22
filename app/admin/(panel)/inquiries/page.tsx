import { createClient } from "@/lib/supabase/server";
import { StatusForm } from "@/components/admin/status-form";
import { updateInquiry } from "@/app/admin/actions";

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
};

export default async function AdminInquiriesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-navy">Inquiries</h1>
      <p className="mt-1 text-sm text-slate">
        Listing inquiries, viewing requests, contact messages, and property submissions.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-line-strong bg-surface p-10 text-center text-slate">
            No inquiries yet.
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
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-surface-gray px-2.5 py-1 text-xs font-medium capitalize text-navy">
                  {r.type}
                </span>
                <span className="rounded-full bg-navy/5 px-2.5 py-1 text-xs font-medium text-navy-700">
                  {r.status}
                </span>
              </div>
            </div>
            {r.message && <p className="mt-3 text-sm text-slate">{r.message}</p>}
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate">
              {r.preferred_viewing_date && <span>Viewing: {r.preferred_viewing_date}</span>}
              {r.preferred_contact_method && <span>Contact via: {r.preferred_contact_method}</span>}
              <span>Received: {new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <StatusForm
              action={updateInquiry.bind(null, r.id)}
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
