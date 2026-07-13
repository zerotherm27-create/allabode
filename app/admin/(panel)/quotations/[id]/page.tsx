import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { CopyLink } from "@/components/admin/copy-link";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { QuotationCountersignForm } from "@/components/admin/quotation-countersign-form";
import { QuotationTermsForm, type QuotationTermsInitial } from "@/components/admin/quotation-terms-form";
import {
  sendQuotationRecipientLink, sendQuotationCompanyLink, updateQuotationTerms,
  finalizeQuotation, voidQuotation, deleteQuotation, getQuotationPdfSignedUrl,
} from "@/app/admin/quotations-actions";
import { getPublicSiteUrl } from "@/lib/url";
import { isAiConfigured } from "@/lib/ai/client";
import {
  computeCategoryTotals, computeGrandTotal, resolveGrandTotal, formatPeso, LINE_ITEM_CATEGORY_LABEL,
  type QuotationLineItem, type ProgressMilestone, type QuotationBankDetails,
} from "@/lib/quotation/totals";
import { DEFAULT_BANK_DETAILS } from "@/lib/pm/tenancy-clauses";

// Mirrors form-kit's inputCls — that module is "use client", so a server
// component can't import its string constants directly.
const inputCls =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";

type Quotation = {
  id: string;
  access_token: string | null;
  company_access_token: string;
  company_token_expires_at: string | null;
  created_by: string | null;
  status: string;
  quotation_number: string;
  recipient_email: string;
  recipient_name_hint: string | null;
  recipient_phone_hint: string | null;
  recipient_address_hint: string | null;
  recipient_details: { name?: string; email?: string; phone?: string; address?: string } | null;
  company_email: string | null;
  company_name_hint: string | null;
  quotation_date: string | null;
  valid_until: string | null;
  title: string | null;
  property_reference: string | null;
  line_items: QuotationLineItem[] | null;
  grand_total_override: number | null;
  scope_of_work: string | null;
  notes: string | null;
  payment_terms_type: "cash" | "progress_billing" | null;
  payment_terms_notes: string | null;
  progress_milestones: ProgressMilestone[] | null;
  terms_payment: string | null;
  terms_completion: string | null;
  terms_warranty: string | null;
  terms_validity: string | null;
  bank_details: Partial<QuotationBankDetails> | null;
  company_typed_name: string | null;
  company_signed_at: string | null;
  company_signed_via: string | null;
  company_signature_data: string | null;
  recipient_typed_name: string | null;
  recipient_signed_at: string | null;
  recipient_signature_data: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft — awaiting company signature",
  company_signed: "Company signed — ready to send",
  sent: "Sent — awaiting recipient",
  completed: "Fully executed — binding agreement",
  voided: "Voided",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-surface-gray text-slate",
  company_signed: "bg-reserved/15 text-reserved",
  sent: "bg-gold/15 text-gold-bright",
  completed: "bg-available/15 text-available",
  voided: "bg-error/10 text-error",
};

function toTermsInitial(q: Quotation): QuotationTermsInitial {
  const rd = q.recipient_details ?? {};
  return {
    recipientNameHint: q.recipient_name_hint ?? "",
    recipientEmail: q.recipient_email,
    recipientPhoneHint: q.recipient_phone_hint ?? rd.phone ?? "",
    recipientAddressHint: q.recipient_address_hint ?? rd.address ?? "",
    quotationDate: q.quotation_date ?? "",
    validUntil: q.valid_until ?? "",
    title: q.title ?? "",
    propertyReference: q.property_reference ?? "",
    lineItems: q.line_items ?? [],
    grandTotalOverride: q.grand_total_override != null ? Number(q.grand_total_override) : null,
    scopeOfWork: q.scope_of_work ?? "",
    notes: q.notes ?? "",
    paymentTermsType: q.payment_terms_type ?? "cash",
    paymentTermsNotes: q.payment_terms_notes ?? "",
    progressMilestones: q.progress_milestones ?? [],
    termsPayment: q.terms_payment ?? "",
    termsCompletion: q.terms_completion ?? "",
    termsWarranty: q.terms_warranty ?? "",
    termsValidity: q.terms_validity ?? "",
    bankDetails: { ...DEFAULT_BANK_DETAILS, ...(q.bank_details ?? {}) },
  };
}

export default async function AdminQuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data }, { data: { user } }] = await Promise.all([
    supabase.from("quotations").select("*").eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!data) notFound();
  const q = data as Quotation;

  const [{ data: staffRow }, pdfUrl] = await Promise.all([
    user ? supabase.from("users").select("is_signatory,name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    q.status === "completed" ? getQuotationPdfSignedUrl(id) : Promise.resolve(null),
  ]);

  const isSignatory = !!staffRow?.is_signatory;
  const isCreator = !!user && user.id === q.created_by;
  const canSignNow = isSignatory || isCreator;
  const termsEditable = q.status === "draft";
  const rd = q.recipient_details ?? {};
  const lineItems = q.line_items ?? [];
  const categoryTotals = computeCategoryTotals(lineItems);
  const computedTotal = computeGrandTotal(lineItems);
  const grandTotal = resolveGrandTotal(lineItems, q.grand_total_override);

  const doSendRecipientLink = sendQuotationRecipientLink.bind(null, id);
  const doSendCompanyLink = sendQuotationCompanyLink.bind(null, id);
  const doUpdateTerms = updateQuotationTerms.bind(null, id);
  const doFinalize = finalizeQuotation.bind(null, id);
  const doVoid = voidQuotation.bind(null, id);
  const doDelete = deleteQuotation.bind(null, id);

  const recipientLink = q.access_token ? `${getPublicSiteUrl()}/sign/quotation/${q.access_token}` : null;
  const companyLink = `${getPublicSiteUrl()}/sign/quotation/company/${q.company_access_token}`;
  const companyLinkExpired = !!q.company_token_expires_at && new Date(q.company_token_expires_at) < new Date();
  const awaitingFinalize = q.status === "sent" && !!q.recipient_signature_data;

  const tcRows = [
    ["Payment terms", q.terms_payment],
    ["Completion timeline", q.terms_completion],
    ["Warranty", q.terms_warranty],
    ["Quotation validity", q.terms_validity],
  ] as const;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/quotations" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to quotations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-caps text-gold">{q.quotation_number}</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy">{rd.name || q.recipient_name_hint || q.recipient_email}</h1>
          <p className="mt-1 text-sm text-slate">
            {q.recipient_email}{q.title ? ` · ${q.title}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLOR[q.status] ?? "bg-surface-gray text-navy"}`}>
          {STATUS_LABEL[q.status] ?? q.status}
        </span>
      </div>

      {q.status === "draft" && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {canSignNow ? (
            <QuotationCountersignForm quotationId={id} defaultName={staffRow?.name ?? ""} />
          ) : (
            <div className="rounded-lg border border-line bg-surface-gray p-5 text-sm text-slate">
              Only the quotation&#x2019;s preparer or a designated signatory can sign here — send the pre-signing link to one instead.
            </div>
          )}
          <div className="rounded-lg border border-line bg-surface p-5">
            <h2 className="mb-1 font-display text-sm font-semibold text-navy">Send pre-signing link to a colleague</h2>
            <p className="mb-3 text-xs text-slate">
              A designated signatory reviews and signs remotely, before this ever reaches the recipient.
            </p>
            <form action={doSendCompanyLink} className="flex flex-col gap-2">
              <input
                name="company_name_hint"
                defaultValue={q.company_name_hint ?? ""}
                placeholder="Signatory name"
                className={inputCls}
              />
              <input
                name="company_email"
                type="email"
                defaultValue={q.company_email ?? ""}
                placeholder="signatory@allabodeph.com"
                className={inputCls}
              />
              <button type="submit" className="self-start rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
                {q.company_token_expires_at ? "Resend pre-signing link" : "Send pre-signing link"}
              </button>
            </form>
            {q.company_token_expires_at && (
              <div className="mt-3">
                <CopyLink link={companyLink} ownerName={q.company_name_hint ?? undefined} />
                <p className={`mt-2 text-xs ${companyLinkExpired ? "text-error" : "text-slate"}`}>
                  {companyLinkExpired
                    ? "This link has expired — resend to issue a fresh validity window."
                    : `Valid until ${new Date(q.company_token_expires_at).toLocaleDateString("en-PH")}.`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {q.status === "company_signed" && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-5">
          <p className="text-sm text-slate">Signed by the company representative — ready to send to the recipient.</p>
          <form action={doSendRecipientLink} className="mt-3">
            <button type="submit" className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
              Send signing link to recipient
            </button>
          </form>
        </div>
      )}

      {q.status === "sent" && recipientLink && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-5">
          <p className="text-sm text-slate">Awaiting the recipient to review and sign.</p>
          <CopyLink link={recipientLink} ownerName={rd.name || q.recipient_name_hint || undefined} />
          <form action={doSendRecipientLink} className="mt-3">
            <button type="submit" className="text-sm font-medium text-navy-700 underline">Resend email</button>
          </form>
        </div>
      )}

      {(q.status === "company_signed" || q.status === "sent" || q.status === "completed") && (
        <div className="mt-6 rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-3 font-display text-sm font-semibold text-navy">Company representative&#x2019;s signature</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {[
              ["Typed name", q.company_typed_name],
              ["Signed via", q.company_signed_via === "remote" ? "Remote signing link" : q.company_signed_via === "countersign" ? "In-dashboard" : null],
              ["Signed at", q.company_signed_at ? new Date(q.company_signed_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : null],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-2 border-b border-line pb-2">
                <dt className="text-slate">{k}</dt>
                <dd className="text-right font-medium text-navy">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Staff-set terms summary (always) */}
      <div className="mt-6 rounded-lg border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-sm font-semibold text-navy">Quotation details</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {[
            ["Quotation date", q.quotation_date],
            ["Valid until", q.valid_until],
            ["Property reference", q.property_reference],
            ["Payment terms", q.payment_terms_type === "progress_billing" ? "Progress billing" : q.payment_terms_type === "cash" ? "Cash" : null],
            ["Bank", { ...DEFAULT_BANK_DETAILS, ...(q.bank_details ?? {}) }.bank],
            ["Account number", { ...DEFAULT_BANK_DETAILS, ...(q.bank_details ?? {}) }.accountNumber],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between gap-2 border-b border-line pb-2">
              <dt className="text-slate">{k}</dt>
              <dd className="text-right font-medium text-navy">{v || "—"}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-navy">Line items</h3>
          {lineItems.length === 0 ? (
            <p className="text-sm text-slate">No line items.</p>
          ) : (
            <div className="flex flex-col gap-1 text-sm">
              {lineItems.map((item, i) => (
                <div key={i} className="flex justify-between gap-2 border-b border-line pb-1">
                  <span className="text-slate">
                    {LINE_ITEM_CATEGORY_LABEL[item.category]} — {item.item || "—"}{item.description ? ` — ${item.description}` : ""}{" "}
                    ({item.pricingMode === "lump_sum" ? "lump sum" : `${item.quantity} ${item.unit}`})
                  </span>
                  <span className="font-medium text-navy">{formatPeso(item.amount)}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between text-xs text-slate">
                <span>Furnishing subtotal</span><span>{formatPeso(categoryTotals.furnishing)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate">
                <span>Repairs subtotal</span><span>{formatPeso(categoryTotals.repairs)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate">
                <span>Others subtotal</span><span>{formatPeso(categoryTotals.others)}</span>
              </div>
              {q.grand_total_override != null && (
                <div className="flex justify-between text-xs text-slate">
                  <span>Itemized sum</span><span>{formatPeso(computedTotal)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between font-semibold text-navy">
                <span>Grand total{q.grand_total_override != null ? " (custom)" : ""}</span><span>{formatPeso(grandTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {q.scope_of_work && (
          <div className="mt-4">
            <h3 className="mb-1 text-sm font-semibold text-navy">Scope of work</h3>
            <p className="whitespace-pre-wrap text-sm text-slate">{q.scope_of_work}</p>
          </div>
        )}

        {q.payment_terms_type === "progress_billing" && (q.progress_milestones ?? []).length > 0 && (
          <div className="mt-4">
            <h3 className="mb-1 text-sm font-semibold text-navy">Payment milestones</h3>
            <div className="flex flex-col gap-1 text-sm">
              {(q.progress_milestones ?? []).map((m, i) => (
                <div key={i} className="flex justify-between gap-2 border-b border-line pb-1 text-slate">
                  <span>{m.description}</span>
                  <span>{m.percentageOrAmount}{m.triggerCondition ? ` — ${m.triggerCondition}` : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {q.payment_terms_type === "cash" && q.payment_terms_notes && (
          <div className="mt-4">
            <h3 className="mb-1 text-sm font-semibold text-navy">Cash payment notes</h3>
            <p className="whitespace-pre-wrap text-sm text-slate">{q.payment_terms_notes}</p>
          </div>
        )}

        {tcRows.some(([, v]) => !!v) && (
          <div className="mt-4">
            <h3 className="mb-1 text-sm font-semibold text-navy">Terms &amp; Conditions</h3>
            <div className="flex flex-col gap-2">
              {tcRows.map(([label, text]) => text ? (
                <div key={label} className="text-sm">
                  <span className="font-medium text-navy">{label}: </span>
                  <span className="text-slate">{text}</span>
                </div>
              ) : null)}
            </div>
          </div>
        )}

        {q.notes && (
          <div className="mt-4">
            <h3 className="mb-1 text-sm font-semibold text-navy">Notes</h3>
            <p className="whitespace-pre-wrap text-sm text-slate">{q.notes}</p>
          </div>
        )}

        {termsEditable && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-navy-700">Edit terms</summary>
            <p className="mt-2 text-xs text-slate">Terms lock automatically once the company representative signs.</p>
            <div className="mt-4">
              <QuotationTermsForm
                action={doUpdateTerms}
                initial={toTermsInitial(q)}
                submitLabel="Save terms"
                lockRecipient
                aiEnabled={isAiConfigured()}
              />
            </div>
          </details>
        )}
      </div>

      {(q.status === "sent" || q.status === "completed") && (
        <div className="mt-6 rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-3 font-display text-sm font-semibold text-navy">Recipient&#x2019;s submitted details</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {[
              ["Name", rd.name], ["Address", rd.address], ["Phone", rd.phone], ["Email", rd.email],
              ["Typed name", q.recipient_typed_name],
              ["Signed at", q.recipient_signed_at ? new Date(q.recipient_signed_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : null],
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
            The recipient has signed, but finalization didn&#x2019;t finish (PDF generation).
          </p>
          <form action={doFinalize} className="mt-3">
            <button type="submit" className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
              Finalize quotation
            </button>
          </form>
        </div>
      )}

      {q.status === "voided" && (
        <div className="mt-4 rounded-lg border border-error/30 bg-error/5 p-5 text-sm text-error">
          This quotation has been voided. Both signing links no longer work.
        </div>
      )}

      {q.status === "completed" && (
        <div className="mt-6 rounded-lg border border-available/30 bg-available/5 p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-available">
            <Icon name="verified" size={18} fill={1} /> Fully executed — binding agreement
          </p>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 underline">
              <Icon name="picture_as_pdf" size={18} /> View signed PDF
            </a>
          )}
        </div>
      )}

      {q.status !== "voided" && (
        <div className="mt-6 rounded-lg border border-error/30 bg-error/5 p-5">
          <h2 className="mb-1 font-display text-sm font-semibold text-error">Danger Zone</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <ConfirmActionForm
              action={doVoid}
              message="Void this quotation? This invalidates both signing links, but keeps the record for history. This can't be undone."
            >
              <button type="submit" className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-navy hover:bg-surface-gray">
                Void quotation
              </button>
            </ConfirmActionForm>
            {q.status !== "draft" ? (
              <p className="flex items-center text-xs text-slate">
                A quotation with a signature on file can&#x2019;t be deleted — void it instead to preserve the record.
              </p>
            ) : (
              <ConfirmActionForm
                action={doDelete}
                message="Permanently delete this quotation? This can't be undone."
              >
                <button type="submit" className="rounded-md bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-error/90">
                  Delete quotation
                </button>
              </ConfirmActionForm>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
