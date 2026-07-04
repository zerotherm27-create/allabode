import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { CopyLink } from "@/components/admin/copy-link";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { ParkingCountersignForm } from "@/components/admin/parking-countersign-form";
import { ParkingTermsForm, type ParkingTermsInitial } from "@/components/admin/parking-terms-form";
import {
  sendParkingTenantLink, sendParkingLandlordLink, updateParkingTerms,
  finalizeParkingAgreement, voidParkingAgreement, deleteParkingAgreement, getParkingPdfSignedUrl,
} from "@/app/admin/parking-actions";
import { getPublicSiteUrl } from "@/lib/url";
import {
  DEFAULT_PARKING_BANK_DETAILS,
  type ParkingScheduleRow, type ParkingBankDetails,
} from "@/lib/pm/parking-clauses";

// Mirrors form-kit's inputCls — that module is "use client", so a server
// component can't import its string constants directly.
const inputCls =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";

type ParkingAgreement = {
  id: string;
  access_token: string;
  landlord_access_token: string | null;
  landlord_token_expires_at: string | null;
  status: string;
  tenant_email: string;
  tenant_name_hint: string | null;
  landlord_email: string | null;
  landlord_name_hint: string | null;
  agreement_date: string | null;
  agreement_city: string | null;
  landlord_details: { name?: string; idNumber?: string; address?: string } | null;
  parking_details: { slotLabel?: string; buildingName?: string; address?: string } | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  rent_amount: number | null;
  rent_amount_words: string | null;
  signing_total_amount: number | null;
  signing_total_words: string | null;
  sticker_amount: number | null;
  rent_due_day: number | null;
  payment_schedule: ParkingScheduleRow[] | null;
  bank_details: Partial<ParkingBankDetails> | null;
  tenant_details: { name?: string; address?: string; contact?: string; email?: string } | null;
  vehicle_details: { makeModel?: string; plateNo?: string; color?: string } | null;
  tenant_id_type: string | null;
  tenant_id_number: string | null;
  tenant_id_issued_date: string | null;
  tenant_typed_name: string | null;
  tenant_signed_at: string | null;
  landlord_typed_name: string | null;
  landlord_signed_at: string | null;
  landlord_signed_via: string | null;
  landlord_signature_data: string | null;
  created_at: string;
  linked_tenant_id: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent — awaiting tenant",
  tenant_signed: "Tenant signed — awaiting landlord",
  completed: "Fully executed",
  voided: "Voided",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-surface-gray text-slate",
  sent: "bg-gold/15 text-gold-bright",
  tenant_signed: "bg-reserved/15 text-reserved",
  completed: "bg-available/15 text-available",
  voided: "bg-error/10 text-error",
};

function toTermsInitial(a: ParkingAgreement): ParkingTermsInitial {
  const ld = a.landlord_details ?? {};
  const pd = a.parking_details ?? {};
  return {
    tenantNameHint: a.tenant_name_hint ?? "",
    tenantEmail: a.tenant_email,
    landlordName: ld.name ?? "",
    landlordIdNumber: ld.idNumber ?? "",
    landlordAddress: ld.address ?? "",
    landlordEmail: a.landlord_email ?? "",
    agreementDate: a.agreement_date ?? "",
    agreementCity: a.agreement_city ?? "Makati City",
    slotLabel: pd.slotLabel ?? "",
    buildingName: pd.buildingName ?? "",
    parkingAddress: pd.address ?? "",
    leaseStartDate: a.lease_start_date ?? "",
    leaseEndDate: a.lease_end_date ?? "",
    rentAmount: a.rent_amount !== null ? String(a.rent_amount) : "",
    rentAmountWords: a.rent_amount_words ?? "",
    signingTotalAmount: a.signing_total_amount !== null ? String(a.signing_total_amount) : "",
    signingTotalWords: a.signing_total_words ?? "",
    stickerAmount: a.sticker_amount !== null ? String(a.sticker_amount) : "",
    rentDueDay: a.rent_due_day !== null ? String(a.rent_due_day) : "",
    paymentSchedule: a.payment_schedule ?? [],
    bankDetails: { ...DEFAULT_PARKING_BANK_DETAILS, ...(a.bank_details ?? {}) },
  };
}

export default async function AdminParkingContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data }, { data: { user } }] = await Promise.all([
    supabase.from("parking_agreements").select("*").eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!data) notFound();
  const a = data as ParkingAgreement;

  const [{ data: staffRow }, pdfUrl] = await Promise.all([
    user ? supabase.from("users").select("is_signatory").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    a.status === "completed" ? getParkingPdfSignedUrl(id) : Promise.resolve(null),
  ]);

  const isSignatory = !!staffRow?.is_signatory;
  const termsEditable = a.status === "draft" || a.status === "sent";
  const td = a.tenant_details ?? {};
  const ld = a.landlord_details ?? {};
  const pd = a.parking_details ?? {};
  const vd = a.vehicle_details ?? {};
  const doSendTenantLink = sendParkingTenantLink.bind(null, id);
  const doSendLandlordLink = sendParkingLandlordLink.bind(null, id);
  const doUpdateTerms = updateParkingTerms.bind(null, id);
  const doFinalize = finalizeParkingAgreement.bind(null, id);
  const doVoid = voidParkingAgreement.bind(null, id);
  const doDelete = deleteParkingAgreement.bind(null, id);
  const tenantLink = `${getPublicSiteUrl()}/sign/parking/${a.access_token}`;
  const landlordLink = a.landlord_access_token ? `${getPublicSiteUrl()}/sign/parking/landlord/${a.landlord_access_token}` : null;
  const landlordLinkExpired = !!a.landlord_token_expires_at && new Date(a.landlord_token_expires_at) < new Date();
  const awaitingFinalize = a.status === "tenant_signed" && !!a.landlord_signature_data;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/contracts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to contracts
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-caps text-gold">Parking Space Rental Agreement</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy">{td.name || a.tenant_name_hint || a.tenant_email}</h1>
          <p className="mt-1 text-sm text-slate">
            {a.tenant_email}{pd.slotLabel ? ` · ${pd.slotLabel}${pd.buildingName ? `, ${pd.buildingName}` : ""}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLOR[a.status] ?? "bg-surface-gray text-navy"}`}>
          {STATUS_LABEL[a.status] ?? a.status}
        </span>
      </div>

      {a.status === "draft" && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-5">
          <p className="text-sm text-slate">This agreement hasn&#x2019;t been sent to the tenant yet.</p>
          <form action={doSendTenantLink} className="mt-3">
            <button type="submit" className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
              Send signing link to tenant
            </button>
          </form>
          <p className="mt-3 text-xs text-slate">Or copy the link below to share it directly:</p>
          <CopyLink link={tenantLink} ownerName={td.name || a.tenant_name_hint || undefined} />
        </div>
      )}

      {a.status === "sent" && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-5">
          <p className="text-sm text-slate">Awaiting the tenant to fill in their details and sign.</p>
          <CopyLink link={tenantLink} ownerName={td.name || a.tenant_name_hint || undefined} />
          <form action={doSendTenantLink} className="mt-3">
            <button type="submit" className="text-sm font-medium text-navy-700 underline">Resend email</button>
          </form>
        </div>
      )}

      {/* Staff-set terms summary (always) */}
      <div className="mt-6 rounded-lg border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-sm font-semibold text-navy">Rental terms</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {[
            ["Landlord", ld.name],
            ["Landlord email", a.landlord_email],
            ["Parking space", pd.slotLabel],
            ["Building", pd.buildingName],
            ["Rental period", a.lease_start_date ? `${a.lease_start_date} — ${a.lease_end_date ?? "?"}` : null],
            ["Monthly rate", a.rent_amount !== null ? `₱${Number(a.rent_amount).toLocaleString("en-PH")}` : null],
            ["Rent due day", a.rent_due_day ? `Every ${a.rent_due_day}` : null],
            ["Due upon signing", a.signing_total_amount !== null ? `₱${Number(a.signing_total_amount).toLocaleString("en-PH")}` : null],
            ["Parking sticker", a.sticker_amount !== null ? `₱${Number(a.sticker_amount).toLocaleString("en-PH")}` : null],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between gap-2 border-b border-line pb-2">
              <dt className="text-slate">{k}</dt>
              <dd className="text-right font-medium text-navy">{v || "—"}</dd>
            </div>
          ))}
        </dl>
        {termsEditable && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-navy-700">Edit terms</summary>
            <p className="mt-2 text-xs text-slate">Terms lock automatically once the tenant signs against them.</p>
            <div className="mt-4">
              <ParkingTermsForm
                action={doUpdateTerms}
                initial={toTermsInitial(a)}
                submitLabel="Save terms"
                lockTenant
              />
            </div>
          </details>
        )}
      </div>

      {(a.status === "tenant_signed" || a.status === "completed") && (
        <div className="mt-6 rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-3 font-display text-sm font-semibold text-navy">Tenant&#x2019;s submitted details</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {[
              ["Name", td.name], ["Address", td.address], ["Contact", td.contact], ["Email", td.email],
              ["Typed name", a.tenant_typed_name],
              ["Vehicle", [vd.makeModel, vd.color].filter(Boolean).join(", ") || null],
              ["Plate no.", vd.plateNo],
              ["Government ID", a.tenant_id_type ? `${a.tenant_id_type} — ${a.tenant_id_number}` : null],
              ["ID issued date", a.tenant_id_issued_date],
              ["Signed at", a.tenant_signed_at ? new Date(a.tenant_signed_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : null],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-2 border-b border-line pb-2">
                <dt className="text-slate">{k}</dt>
                <dd className="text-right font-medium text-navy">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {awaitingFinalize && (
        <div className="mt-6 rounded-lg border border-gold/40 bg-gold/5 p-5">
          <p className="text-sm font-medium text-navy">
            The landlord has signed, but finalization didn&#x2019;t finish (PDF, tenant record, portal account).
          </p>
          <form action={doFinalize} className="mt-3">
            <button type="submit" className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
              Finalize agreement
            </button>
          </form>
        </div>
      )}

      {a.status === "tenant_signed" && !awaitingFinalize && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface p-5">
            <h2 className="mb-1 font-display text-sm font-semibold text-navy">Send to the landlord</h2>
            <p className="mb-3 text-xs text-slate">
              The landlord reviews the signed agreement, confirms their ID, and signs on their own secure link.
            </p>
            <form action={doSendLandlordLink} className="flex flex-col gap-2">
              <input
                name="landlord_email"
                type="email"
                defaultValue={a.landlord_email ?? ""}
                placeholder="landlord@email.com"
                className={inputCls}
              />
              <button type="submit" className="self-start rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
                {a.landlord_access_token ? "Resend landlord link" : "Send landlord link"}
              </button>
            </form>
            {landlordLink && (
              <div className="mt-3">
                <CopyLink link={landlordLink} ownerName={ld.name || a.landlord_name_hint || undefined} />
                <p className={`mt-2 text-xs ${landlordLinkExpired ? "text-error" : "text-slate"}`}>
                  {landlordLinkExpired
                    ? "This link has expired — resend to issue a fresh validity window."
                    : a.landlord_token_expires_at
                      ? `Valid until ${new Date(a.landlord_token_expires_at).toLocaleDateString("en-PH")}.`
                      : null}
                </p>
              </div>
            )}
          </div>
          {isSignatory ? (
            <ParkingCountersignForm agreementId={id} />
          ) : (
            <div className="rounded-lg border border-line bg-surface-gray p-5 text-sm text-slate">
              Only a designated signatory account can countersign for the landlord. Send the landlord their signing
              link instead.
            </div>
          )}
        </div>
      )}

      {a.status === "voided" && (
        <div className="mt-4 rounded-lg border border-error/30 bg-error/5 p-5 text-sm text-error">
          This agreement has been voided. Both signing links no longer work.
        </div>
      )}

      {a.status === "completed" && (
        <div className="mt-6 rounded-lg border border-available/30 bg-available/5 p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-available">
            <Icon name="verified" size={18} fill={1} /> Fully executed
            {a.landlord_signed_via ? ` — landlord signed via ${a.landlord_signed_via === "remote" ? "their signing link" : "staff countersign"}` : ""}
          </p>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 underline">
              <Icon name="picture_as_pdf" size={18} /> View signed PDF
            </a>
          )}
          {a.linked_tenant_id && (
            <div className="mt-3 text-sm">
              <Link href={`/admin/tenants/${a.linked_tenant_id}/edit`} className="text-navy-700 underline">Tenant record</Link>
            </div>
          )}
        </div>
      )}

      {a.status !== "voided" && (
        <div className="mt-6 rounded-lg border border-error/30 bg-error/5 p-5">
          <h2 className="mb-1 font-display text-sm font-semibold text-error">Danger Zone</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <ConfirmActionForm
              action={doVoid}
              message="Void this agreement? This invalidates both signing links, but keeps the record for history. This can't be undone."
            >
              <button type="submit" className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-navy hover:bg-surface-gray">
                Void agreement
              </button>
            </ConfirmActionForm>
            {a.status === "completed" ? (
              <p className="flex items-center text-xs text-slate">
                Fully executed agreements can&#x2019;t be deleted — void it instead to invalidate it while keeping the signed record.
              </p>
            ) : (
              <ConfirmActionForm
                action={doDelete}
                message="Permanently delete this agreement and its uploaded files? This can't be undone."
              >
                <button type="submit" className="rounded-md bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-error/90">
                  Delete agreement
                </button>
              </ConfirmActionForm>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
