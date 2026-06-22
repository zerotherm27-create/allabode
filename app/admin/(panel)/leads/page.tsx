import { createClient } from "@/lib/supabase/server";
import { StatusForm } from "@/components/admin/status-form";
import { updatePmLead } from "@/app/admin/actions";

const STATUSES = ["New", "Contacted", "Proposal sent", "Onboarding", "Active", "Closed"];

type Row = {
  id: string;
  owner_name: string;
  email: string;
  phone: string | null;
  property_location: string | null;
  property_type: string | null;
  number_of_units: number | null;
  occupancy_status: string | null;
  needed_service: string | null;
  message: string | null;
  status: string;
  internal_notes: string | null;
  created_at: string;
};

export default async function AdminLeadsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("property_management_leads")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-navy">Property management leads</h1>

      <div className="mt-6 flex flex-col gap-4">
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-line-strong bg-surface p-10 text-center text-slate">
            No property management leads yet.
          </p>
        )}
        {rows.map((r) => (
          <article key={r.id} className="rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-navy">{r.owner_name}</h2>
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
              {r.number_of_units != null && <span>Units: {r.number_of_units}</span>}
              {r.occupancy_status && <span>Occupancy: {r.occupancy_status}</span>}
              {r.needed_service && <span>Service: {r.needed_service}</span>}
            </div>
            {r.message && <p className="mt-2 text-sm text-slate">{r.message}</p>}
            <p className="mt-1 text-xs text-slate">Received: {new Date(r.created_at).toLocaleDateString()}</p>
            <StatusForm
              action={updatePmLead.bind(null, r.id)}
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
