import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { CountersignForm } from "@/components/admin/countersign-form";
import { AnnexBForm } from "@/components/admin/annex-b-form";
import { SpaToggle } from "@/components/admin/spa-toggle";
import { sendAgreementLink, updateAnnexB, getAgreementPdfSignedUrl } from "@/app/admin/agreement-actions";

type Agreement = {
  id: string;
  status: string;
  owner_email: string;
  owner_name_hint: string | null;
  owner_details: { name?: string; nationality?: string; civilStatus?: string; address?: string; email?: string; contact?: string } | null;
  property_details: { condo?: string; unit?: string; address?: string } | null;
  service_selections: Record<string, unknown> | null;
  annex_c: Record<string, unknown> | null;
  annex_b: Record<string, unknown> | null;
  effective_date: string | null;
  owner_id_type: string | null;
  owner_id_number: string | null;
  owner_id_document_path: string | null;
  intake_profile: Record<string, string> | null;
  owner_typed_name: string | null;
  owner_signed_at: string | null;
  manager_signed_at: string | null;
  created_at: string;
  linked_owner_id: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent — awaiting owner",
  owner_signed: "Owner signed — awaiting countersign",
  completed: "Fully executed",
  voided: "Voided",
};

export default async function AdminContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data }, { data: { user } }] = await Promise.all([
    supabase.from("agreements").select("*").eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!data) notFound();
  const a = data as Agreement;

  const [{ data: staffRow }, { data: ownerRow }, pdfUrl] = await Promise.all([
    user ? supabase.from("users").select("is_signatory").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("owners").select("id,spa_authorization_received").ilike("email", a.owner_email).maybeSingle(),
    a.status === "completed" ? getAgreementPdfSignedUrl(id) : Promise.resolve(null),
  ]);

  const isSignatory = !!staffRow?.is_signatory;
  const od = a.owner_details ?? {};
  const pd = a.property_details ?? {};
  const intake = a.intake_profile ?? {};
  const doSendLink = sendAgreementLink.bind(null, id);
  const doUpdateAnnexB = updateAnnexB.bind(null, id);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/contracts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to contracts
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">{od.name || a.owner_name_hint || a.owner_email}</h1>
          <p className="mt-1 text-sm text-slate">{a.owner_email}</p>
        </div>
        <span className="rounded-full bg-surface-gray px-3 py-1 text-sm font-medium text-navy">
          {STATUS_LABEL[a.status] ?? a.status}
        </span>
      </div>

      {a.status === "draft" && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-5">
          <p className="text-sm text-slate">This agreement hasn&#x2019;t been sent yet.</p>
          <form action={doSendLink} className="mt-3">
            <button type="submit" className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
              Send signing link
            </button>
          </form>
        </div>
      )}

      {a.status === "sent" && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-5">
          <p className="text-sm text-slate">Awaiting the owner to fill out and sign their copy.</p>
          <form action={doSendLink} className="mt-3">
            <button type="submit" className="text-sm font-medium text-navy-700 underline">Resend link</button>
          </form>
        </div>
      )}

      {(a.status === "owner_signed" || a.status === "completed") && (
        <div className="mt-6 rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-3 font-display text-sm font-semibold text-navy">Submitted details</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {[
              ["Nationality", od.nationality], ["Civil status", od.civilStatus], ["Address", od.address],
              ["Contact", od.contact], ["Property", pd.condo], ["Unit", pd.unit],
              ["Effective date", a.effective_date], ["Owner typed name", a.owner_typed_name],
              ["Government ID", a.owner_id_type ? `${a.owner_id_type} — ${a.owner_id_number}` : null],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-line pb-2">
                <dt className="text-slate">{k}</dt>
                <dd className="text-right font-medium text-navy">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {a.status === "owner_signed" && (
        isSignatory ? (
          <div className="mt-6">
            <CountersignForm agreementId={id} />
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-line bg-surface-gray p-5 text-sm text-slate">
            Only a designated signatory account can countersign this agreement.
          </div>
        )
      )}

      {a.status === "completed" && pdfUrl && (
        <div className="mt-6 rounded-lg border border-available/30 bg-available/5 p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-available">
            <Icon name="verified" size={18} fill={1} /> Fully executed
          </p>
          <a href={pdfUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 underline">
            <Icon name="picture_as_pdf" size={18} /> View signed PDF
          </a>
        </div>
      )}

      {a.status !== "draft" && (
        <div className="mt-6">
          <AnnexBForm action={doUpdateAnnexB} initial={a.annex_b as never} />
        </div>
      )}

      <div className="mt-6 rounded-lg border border-line bg-surface p-5">
        <h2 className="mb-1 font-display text-sm font-semibold text-navy">Reference Info</h2>
        <p className="mb-3 text-xs text-slate">Internal use — not part of the signed contract.</p>
        {Object.keys(intake).length === 0 ? (
          <p className="text-sm text-slate">No additional reference info submitted.</p>
        ) : (
          <dl className="flex flex-col gap-2 text-sm">
            {Object.entries(intake).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-line pb-2 last:border-0">
                <dt className="capitalize text-slate">{k.replace(/_/g, " ")}</dt>
                <dd className="text-right font-medium text-navy">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-4 border-t border-line pt-4">
          {ownerRow ? (
            <SpaToggle ownerId={ownerRow.id} initial={!!ownerRow.spa_authorization_received} />
          ) : (
            <p className="text-sm text-slate">
              SPA / Authorization Letter reminder will be available once the owner record exists (after signing).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
