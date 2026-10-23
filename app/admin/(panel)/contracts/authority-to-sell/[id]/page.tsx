import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { AtsCountersignForm } from "@/components/admin/ats-countersign-form";
import { CopyLink } from "@/components/admin/copy-link";
import { ActionRow, ActionButton } from "@/components/admin/action-row";
import {
  sendAuthorityToSellLink, finalizeAuthorityToSell, getAuthorityToSellPdfSignedUrl,
  voidAuthorityToSell, deleteAuthorityToSell,
} from "@/app/admin/authority-to-sell-actions";
import { getPublicSiteUrl } from "@/lib/url";
import { ownerIdTypeLabel } from "@/lib/pm/agreement-labels";
import {
  BROKER, atsPaymentTermsLabel, formatAtsDate, formatAtsMoney,
  type AtsOwnerDetails, type AtsPropertyDetails, type AtsSaleTerms,
} from "@/lib/pm/authority-to-sell-clauses";
import { CONTRACT_STATUS_COLOR, PM_STATUS_LABEL } from "@/lib/admin/contract-rows";

type Ats = {
  id: string;
  access_token: string;
  status: string;
  owner_email: string;
  owner_name_hint: string | null;
  owner_details: AtsOwnerDetails | null;
  property_details: AtsPropertyDetails | null;
  sale_terms: AtsSaleTerms | null;
  execution_date: string | null;
  owner_id_type: string | null;
  owner_id_number: string | null;
  owner_id_issued_date: string | null;
  owner_typed_name: string | null;
  broker_signature_data: string | null;
};

export default async function AdminAuthorityToSellDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data }, { data: { user } }] = await Promise.all([
    supabase.from("authority_to_sell_agreements").select("*").eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!data) notFound();
  const a = data as Ats;

  const [{ data: staffRow }, pdfUrl] = await Promise.all([
    user ? supabase.from("users").select("is_signatory").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    a.status === "completed" ? getAuthorityToSellPdfSignedUrl(id) : Promise.resolve(null),
  ]);

  const isSignatory = !!staffRow?.is_signatory;
  const od = a.owner_details ?? {};
  const pd = a.property_details ?? {};
  const st = a.sale_terms ?? {};
  const displayName = od.name || a.owner_name_hint || a.owner_email;
  const doSendLink = sendAuthorityToSellLink.bind(null, id);
  const doFinalize = finalizeAuthorityToSell.bind(null, id);
  const doVoid = voidAuthorityToSell.bind(null, id);
  const doDelete = deleteAuthorityToSell.bind(null, id);
  const signingLink = `${getPublicSiteUrl()}/sign/authority-to-sell/${a.access_token}`;

  return (
    <ActionRow>
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/contracts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
          <Icon name="arrow_back" size={18} /> Back to contracts
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-caps text-gold">Authority to Sell</p>
            <h1 className="font-display text-2xl font-bold text-navy">{displayName}</h1>
            <p className="mt-1 text-sm text-slate">{a.owner_email}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${CONTRACT_STATUS_COLOR[a.status] ?? "bg-surface-gray text-navy"}`}>
            {PM_STATUS_LABEL[a.status] ?? a.status}
          </span>
        </div>

        {a.status === "draft" && (
          <div className="mt-4 rounded-lg border border-line bg-surface p-5">
            <p className="text-sm text-slate">This Authority to Sell hasn&#x2019;t been sent yet.</p>
            <div className="mt-3">
              <ActionButton actionKey="send-link" action={doSendLink} label="Send signing link"
                className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800" />
            </div>
            <p className="mt-3 text-xs text-slate">Or copy the link below to share it directly:</p>
            <CopyLink link={signingLink} ownerName={displayName} />
          </div>
        )}

        {a.status === "sent" && (
          <div className="mt-4 rounded-lg border border-line bg-surface p-5">
            <p className="text-sm text-slate">Awaiting the owner to fill out and sign.</p>
            <CopyLink link={signingLink} ownerName={displayName} />
            <div className="mt-3">
              <ActionButton actionKey="send-link" action={doSendLink} label="Resend email"
                className="text-sm font-medium text-navy-700 underline" />
            </div>
          </div>
        )}

        {(a.status === "owner_signed" || a.status === "completed") && (
          <div className="mt-6 rounded-lg border border-line bg-surface p-5">
            <h2 className="mb-3 font-display text-sm font-semibold text-navy">Submitted details</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                ["Address", od.address], ["Contact", od.contact],
                ["Property type", pd.propertyType], ["Location", pd.location],
                ["Title / Tax Dec. No.", pd.titleNo], ["Area", pd.area],
                ["Authority", st.authorityType === "exclusive" ? "Exclusive" : st.authorityType === "non_exclusive" ? "Non-exclusive" : null],
                ["Gross selling price", st.grossPrice ? `PHP ${formatAtsMoney(st.grossPrice)}` : null],
                ["Minimum price", st.minPrice ? `PHP ${formatAtsMoney(st.minPrice)}` : null],
                ["Payment terms", atsPaymentTermsLabel(st)],
                ["Commission", st.commissionPct ? `${st.commissionPct}%` : null],
                ["Period", st.periodLength ? `${st.periodLength} ${st.periodUnit}, ${formatAtsDate(st.periodStart)} – ${formatAtsDate(st.periodEnd)}` : null],
                ["Protection period", st.protectionDays ? `${st.protectionDays} days` : null],
                ["Signed on", a.execution_date ? `${formatAtsDate(a.execution_date)}, ${st.executionPlace ?? ""}` : null],
                ["Owner typed name", a.owner_typed_name],
                ["Government ID", a.owner_id_type ? `${ownerIdTypeLabel(a.owner_id_type)} — ${a.owner_id_number}` : null],
                ["ID issued date", a.owner_id_issued_date],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-line pb-2">
                  <dt className="text-slate">{k}</dt>
                  <dd className="text-right font-medium text-navy">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-6 rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-3 font-display text-sm font-semibold text-navy">Broker (fixed defaults)</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {[
              ["Name", BROKER.name], ["PRC License No.", BROKER.prcLicenseNo], ["PTR No.", BROKER.ptrNo],
              ["DHSUD/HLURB Reg. No.", BROKER.dhsudRegNo], ["Contact No.", BROKER.contactNo], ["Address", BROKER.address],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-line pb-2">
                <dt className="text-slate">{k}</dt>
                <dd className="text-right font-medium text-navy">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {a.status === "owner_signed" && !a.broker_signature_data && (
          isSignatory ? (
            <div className="mt-6"><AtsCountersignForm agreementId={id} /></div>
          ) : (
            <div className="mt-6 rounded-lg border border-line bg-surface-gray p-5 text-sm text-slate">
              Only a designated signatory account can countersign this Authority to Sell.
            </div>
          )
        )}

        {a.status === "owner_signed" && a.broker_signature_data && (
          <div className="mt-6 rounded-lg border border-reserved/30 bg-reserved/5 p-5">
            <p className="text-sm text-slate">
              The broker has countersigned but the final document wasn&#x2019;t generated. Retry to finish.
            </p>
            <div className="mt-3">
              <ActionButton actionKey="finalize" action={doFinalize} label="Finalize Authority to Sell"
                className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800" />
            </div>
          </div>
        )}

        {a.status === "voided" && (
          <div className="mt-4 rounded-lg border border-error/30 bg-error/5 p-5 text-sm text-error">
            This Authority to Sell has been voided. The signing link no longer works and it can&#x2019;t be countersigned.
          </div>
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

        {a.status !== "voided" && (
          <div className="mt-6 rounded-lg border border-error/30 bg-error/5 p-5">
            <h2 className="mb-1 font-display text-sm font-semibold text-error">Danger Zone</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              <ActionButton actionKey="void" action={doVoid} label="Void Authority to Sell"
                className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-navy hover:bg-surface-gray"
                confirmMessage="Void this Authority to Sell? This invalidates the signing link and blocks countersigning, but keeps the record for history. This can't be undone." />
              {a.status === "completed" ? (
                <p className="flex items-center text-xs text-slate">
                  Fully executed documents can&#x2019;t be deleted — void it instead to invalidate it while keeping the signed record.
                </p>
              ) : (
                <ActionButton actionKey="delete" action={doDelete} label="Delete Authority to Sell"
                  className="rounded-md bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-error/90"
                  confirmMessage="Permanently delete this Authority to Sell and its uploaded files? This can't be undone." />
              )}
            </div>
          </div>
        )}
      </div>
    </ActionRow>
  );
}
