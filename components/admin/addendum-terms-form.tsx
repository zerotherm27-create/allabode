"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { F, Group, inputCls, SubmitButton } from "@/components/admin/form-kit";
import { createClient } from "@/lib/supabase/client";
import { AGREEMENTS_BUCKET } from "@/lib/storage";
import {
  DEFAULT_ADDENDUM_BANK_DETAILS, PARENT_TYPE_TITLE, addendumRoles,
  type AddendumFeeItem, type AddendumScheduleRow, type AddendumBankDetails,
  type AddendumPartyChange, type AddendumAmendedClause, type AddendumParentType,
  type AddendumParentSource,
} from "@/lib/pm/addendum-clauses";
// From lib/pm, not lib/ai — this is a client component, and the AI module
// pulls in the OpenAI SDK.
import { CONTRACT_UPLOAD_MIMES, type ContractExtraction, type ExtractedClause } from "@/lib/pm/parent-contract";
import { analyzeUploadedContract, type ParentContractOption } from "@/app/admin/addendum-actions";

export type AddendumTermsInitial = {
  parentSource: AddendumParentSource;
  parentType: AddendumParentType | "";
  parentId: string;
  parentContractTitle: string;
  parentReferenceCode: string;
  parentAgreementDate: string;
  parentPropertyDescription: string;
  /** Uploaded-parent only: the executed original in the private `agreements` bucket. */
  parentDocumentPath: string;
  parentDocumentName: string;
  parentExtraction: ContractExtraction | null;

  tenantNameHint: string;
  tenantEmail: string;
  tenantAddress: string;
  tenantContact: string;

  landlordName: string;
  landlordAddress: string;
  landlordEmail: string;

  agreementDate: string;
  effectiveDate: string;

  newStartDate: string;
  newEndDate: string;

  feeItems: AddendumFeeItem[];
  paymentSchedule: AddendumScheduleRow[];
  bankDetails: AddendumBankDetails;

  partyChanges: AddendumPartyChange[];
  amendedClauses: AddendumAmendedClause[];
};

export function emptyAddendumTerms(): AddendumTermsInitial {
  return {
    parentSource: "system", parentType: "", parentId: "",
    parentContractTitle: "", parentReferenceCode: "", parentAgreementDate: "", parentPropertyDescription: "",
    parentDocumentPath: "", parentDocumentName: "", parentExtraction: null,
    tenantNameHint: "", tenantEmail: "", tenantAddress: "", tenantContact: "",
    landlordName: "", landlordAddress: "", landlordEmail: "",
    agreementDate: "", effectiveDate: "",
    newStartDate: "", newEndDate: "",
    feeItems: [], paymentSchedule: [],
    bankDetails: { ...DEFAULT_ADDENDUM_BANK_DETAILS },
    partyChanges: [], amendedClauses: [],
  };
}

type UploadState = "idle" | "uploading" | "reading";

/**
 * Progress for the two-stage attach: the browser→storage upload, then the AI
 * read. The read is the slow one — a long contract can take the better part of
 * a minute — so it carries a running elapsed count. Without it the form looks
 * hung and staff re-pick the file, which starts the whole thing over.
 */
function ElapsedSeconds() {
  const [secs, setSecs] = useState(0);
  // Counts from mount, so each read starts at zero without ever resetting
  // state from inside the effect.
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setSecs(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return secs > 0 ? <> · {secs}s</> : null;
}

function ContractReadProgress({ state, fileName }: { state: UploadState; fileName: string }) {
  if (state === "idle") return null;
  const reading = state === "reading";

  return (
    <div className="mt-4 rounded-md border border-line bg-cream p-4" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-semibold text-navy">
        <Icon name="progress_activity" size={18} className="animate-spin" />
        {reading ? "Reading the contract…" : "Uploading the file…"}
      </p>

      {/* items-start, not items-center: a long filename wraps to two or three
          lines on mobile and the marker belongs beside the first one. */}
      <ol className="mt-3 flex flex-col gap-1.5 text-sm">
        <li className="flex items-start gap-2">
          {reading ? (
            <Icon name="check_circle" size={16} className="mt-0.5 shrink-0 text-available" />
          ) : (
            <Icon name="progress_activity" size={16} className="mt-0.5 shrink-0 animate-spin text-slate" />
          )}
          <span className={reading ? "text-slate" : "text-ink"}>
            Uploading {fileName || "the file"}
          </span>
        </li>
        <li className="flex items-start gap-2">
          {reading ? (
            <Icon name="progress_activity" size={16} className="mt-0.5 shrink-0 animate-spin text-slate" />
          ) : (
            <Icon name="radio_button_unchecked" size={16} className="mt-0.5 shrink-0 text-line" />
          )}
          <span className={reading ? "text-ink" : "text-slate"}>
            Reading the parties, property, dates and clauses
            {reading && <ElapsedSeconds />}
          </span>
        </li>
      </ol>

      {reading && (
        <p className="mt-3 text-xs text-slate">
          A long contract can take up to a minute. Everything it finds comes back for you to check — please stay on
          this page.
        </p>
      )}
    </div>
  );
}

const PESO = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Everything the model read, laid out for a human to correct. The four fields
 * that actually print on the Addendum are editable inputs; the rest is a
 * read-only summary of the original's terms, shown as context only — it is
 * never copied into the amendment sections, which must stay deliberate.
 */
function ExtractionReview({
  t, set, extraction,
}: {
  t: AddendumTermsInitial;
  set: (patch: Partial<AddendumTermsInitial>) => void;
  extraction: ContractExtraction | null;
}) {
  const x = extraction?.raw_ai_json ?? null;
  const confidence = extraction?.confidence;
  const warnings = extraction?.warnings ?? [];
  const term = [x?.term?.start_date, x?.term?.end_date].filter(Boolean).join(" → ");
  const occupants = (x?.occupants ?? []).map((o) => o.name).filter(Boolean).join(", ");

  const reference: [string, string][] = [
    ["Original term", term],
    ["Monthly rent", x?.monthly_rent != null ? PESO(x.monthly_rent) : ""],
    ["Security deposit", x?.security_deposit != null ? PESO(x.security_deposit) : ""],
    ["Advance rent", x?.advance_rent != null ? PESO(x.advance_rent) : ""],
    ["Occupants", occupants],
    ["Bank on file", [x?.bank_details?.bank, x?.bank_details?.branch, x?.bank_details?.account_number].filter(Boolean).join(" · ")],
    ["Sections found", x?.clauses?.length ? `${x.clauses.length}` : ""],
  ];
  const shown = reference.filter(([, v]) => v);

  return (
    <div className="mt-5 border-t border-line pt-5">
      {extraction ? (
        <p className="mb-4 rounded-md bg-cream px-4 py-3 text-xs text-slate" role="status">
          Read automatically from the uploaded file
          {typeof confidence === "number" ? ` (confidence ${Math.round(confidence * 100)}%)` : ""}. Check every
          field against the document before sending — these values print on the Addendum.
        </p>
      ) : (
        <p className="mb-4 rounded-md bg-cream px-4 py-3 text-xs text-slate">
          Fill in the original contract&rsquo;s details as they appear on the document. These values print on the
          Addendum.
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="mb-4 list-disc space-y-1 pl-5 text-xs text-slate">
          {warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <F label="Kind of contract" hint="Sets the party labels and the addendum's title">
          <select
            name="parent_kind"
            aria-label="Kind of contract"
            value={t.parentType || "tenancy"}
            onChange={(e) => set({ parentType: e.target.value as AddendumParentType })}
            className={inputCls}
          >
            {(Object.keys(PARENT_TYPE_TITLE) as AddendumParentType[]).map((k) => (
              <option key={k} value={k}>{PARENT_TYPE_TITLE[k]}</option>
            ))}
          </select>
        </F>
        <F label="Contract title" hint="As the document titles itself">
          <input
            name="parent_contract_title"
            required
            value={t.parentContractTitle}
            onChange={(e) => set({ parentContractTitle: e.target.value })}
            className={inputCls}
          />
        </F>
        <F label="Reference number" hint="Leave blank if the original carries none">
          <input
            name="parent_reference_code"
            value={t.parentReferenceCode}
            onChange={(e) => set({ parentReferenceCode: e.target.value })}
            className={inputCls}
          />
        </F>
        <F label="Date executed">
          <input
            name="parent_agreement_date"
            type="date"
            value={t.parentAgreementDate}
            onChange={(e) => set({ parentAgreementDate: e.target.value })}
            className={inputCls}
          />
        </F>
        <F label="Property" span hint="Printed in the recitals as the property covered">
          <input
            name="parent_property_description"
            required
            value={t.parentPropertyDescription}
            onChange={(e) => set({ parentPropertyDescription: e.target.value })}
            className={inputCls}
          />
        </F>
      </div>

      {shown.length > 0 && (
        <div className="mt-5 rounded-md border border-line bg-cream p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate">
            From the original contract
          </h4>
          <p className="mb-3 text-xs text-slate">
            Reference only — nothing here is carried into the amendment. Enter what changes in the sections below.
          </p>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {shown.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="shrink-0 text-slate">{k}:</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

export function AddendumTermsForm({
  action, initial = null, submitLabel, parentOptions = [], lockParent = false, lockTenant = false,
}: {
  action: (fd: FormData) => Promise<void>;
  /** null = blank create form (server components can't call client helpers). */
  initial?: AddendumTermsInitial | null;
  submitLabel: string;
  parentOptions?: ParentContractOption[];
  /** The amended contract can't change once the addendum exists. */
  lockParent?: boolean;
  /** On the edit form the recipient can't change (the link is already out). */
  lockTenant?: boolean;
}) {
  const [t, setT] = useState(initial ?? emptyAddendumTerms());
  const [init] = useState(t);
  const set = (patch: Partial<AddendumTermsInitial>) => setT((prev) => ({ ...prev, ...patch }));

  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Named separately from parentDocumentName so the progress panel can show the
  // file straight away, while the form only records it once it is really stored.
  const [pendingFileName, setPendingFileName] = useState("");

  const roles = addendumRoles((t.parentType || "tenancy") as AddendumParentType);
  const uploaded = t.parentSource === "uploaded";
  const extracted = t.parentExtraction?.raw_ai_json ?? null;
  const clauseIndex: ExtractedClause[] = extracted?.clauses ?? [];

  /** Selecting a parent snapshots its identity and prefills both parties. */
  function onParentChange(key: string) {
    const opt = parentOptions.find((o) => `${o.parentType}:${o.parentId}` === key);
    if (!opt) {
      set({ parentType: "", parentId: "" });
      return;
    }
    set({
      parentType: opt.parentType,
      parentId: opt.parentId,
      parentContractTitle: opt.contractTitle,
      parentReferenceCode: opt.referenceCode,
      parentAgreementDate: opt.agreementDate?.slice(0, 10) ?? "",
      parentPropertyDescription: opt.propertyDescription,
      tenantNameHint: t.tenantNameHint || opt.counterpartyName,
      tenantEmail: t.tenantEmail || opt.counterpartyEmail,
      landlordName: t.landlordName || opt.landlordName,
    });
  }

  /**
   * The file goes straight from the browser to the private `agreements` bucket
   * — staff sessions already satisfy its RLS, and a multi-megabyte scan has no
   * business travelling through a server action body. Only the resulting path
   * is handed to the server, which downloads it again to read it.
   */
  async function onContractFile(file: File) {
    setUploadError(null);
    if (!CONTRACT_UPLOAD_MIMES.includes(file.type)) {
      setUploadError("Upload the contract as a PDF, JPG, PNG or WebP file.");
      return;
    }

    setPendingFileName(file.name);
    setUploadState("uploading");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80) || "contract.pdf";
    const path = `addendum/uploads/${crypto.randomUUID()}/${safeName}`;
    const { error } = await createClient().storage
      .from(AGREEMENTS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setUploadState("idle");
      setUploadError(`The file could not be uploaded: ${error.message}`);
      return;
    }

    // The file is attached from here on, whatever the reader makes of it.
    set({ parentSource: "uploaded", parentDocumentPath: path, parentDocumentName: file.name });

    setUploadState("reading");
    const fd = new FormData();
    fd.set("path", path);
    fd.set("mime", file.type);
    fd.set("file_name", file.name);
    const res = await analyzeUploadedContract({}, fd);
    setUploadState("idle");

    if (!res.ok) {
      setUploadError(res.error ?? "The contract could not be read.");
      return;
    }
    applyExtraction(res.extraction);
  }

  /** Fills the review fields from the model's reading. Every one stays editable. */
  function applyExtraction(extraction: ContractExtraction) {
    const x = extraction.raw_ai_json;
    const kind: AddendumParentType =
      x.contract_kind === "pm" || x.contract_kind === "parking" || x.contract_kind === "short_term_rental"
        ? x.contract_kind
        : "tenancy";
    const property =
      x.property?.description?.trim() ||
      [x.property?.unit_number, x.property?.building_name, x.property?.address].filter(Boolean).join(", ");

    set({
      parentExtraction: extraction,
      parentType: kind,
      parentContractTitle: x.contract_title?.trim() || PARENT_TYPE_TITLE[kind],
      parentReferenceCode: x.reference_code?.trim() || "",
      parentAgreementDate: x.agreement_date?.slice(0, 10) ?? "",
      parentPropertyDescription: property,
      tenantNameHint: t.tenantNameHint || x.tenant?.name || "",
      tenantEmail: t.tenantEmail || x.tenant?.email || "",
      tenantAddress: t.tenantAddress || x.tenant?.address || "",
      tenantContact: t.tenantContact || x.tenant?.contact || "",
      landlordName: t.landlordName || x.landlord?.name || "",
      landlordAddress: t.landlordAddress || x.landlord?.address || "",
      landlordEmail: t.landlordEmail || x.landlord?.email || "",
    });
  }

  /** Picking a section of the original fills its number, heading and current wording. */
  function onClauseRefPick(i: number, ref: string) {
    const c = clauseIndex.find((x) => x.ref === ref);
    setAmendedClause(i, c ? { ref: c.ref, heading: c.heading ?? "", newText: c.text ?? "" } : { ref: "" });
  }

  function setFeeItem(i: number, patch: Partial<AddendumFeeItem>) {
    set({ feeItems: t.feeItems.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }
  function setScheduleRow(i: number, patch: Partial<AddendumScheduleRow>) {
    set({ paymentSchedule: t.paymentSchedule.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }
  function setPartyChange(i: number, patch: Partial<AddendumPartyChange>) {
    set({ partyChanges: t.partyChanges.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }
  function setAmendedClause(i: number, patch: Partial<AddendumAmendedClause>) {
    set({ amendedClauses: t.amendedClauses.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }

  const feeTotal = t.feeItems.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const removeCls = "self-center text-sm font-semibold text-slate hover:text-error";
  const addCls = "mt-3 text-xs font-semibold text-navy-700 underline";

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="parent_source" value={t.parentSource} />
      <input type="hidden" name="parent_type" value={t.parentType} />
      <input type="hidden" name="parent_id" value={t.parentId} />
      <input type="hidden" name="parent_document_path" value={t.parentDocumentPath} />
      <input type="hidden" name="parent_document_name" value={t.parentDocumentName} />
      <input type="hidden" name="parent_extraction" value={t.parentExtraction ? JSON.stringify(t.parentExtraction) : ""} />
      {/* An uploaded parent's identity is reviewed in visible fields below; a
          system parent's is snapshotted from the row it was picked from. */}
      {!uploaded && (
        <>
          <input type="hidden" name="parent_contract_title" value={t.parentContractTitle} />
          <input type="hidden" name="parent_reference_code" value={t.parentReferenceCode} />
          <input type="hidden" name="parent_agreement_date" value={t.parentAgreementDate} />
          <input type="hidden" name="parent_property_description" value={t.parentPropertyDescription} />
        </>
      )}
      <input type="hidden" name="fee_items" value={JSON.stringify(t.feeItems.filter((r) => r.label.trim()))} />
      <input type="hidden" name="payment_schedule" value={JSON.stringify(t.paymentSchedule.filter((r) => r.dueDate.trim() || r.amount.trim()))} />
      <input type="hidden" name="party_changes" value={JSON.stringify(t.partyChanges.filter((r) => r.name.trim()))} />
      <input type="hidden" name="amended_clauses" value={JSON.stringify(t.amendedClauses.filter((r) => r.ref.trim() && r.newText.trim()))} />
      {lockTenant && <input type="hidden" name="tenant_email" value={init.tenantEmail} />}

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Contract being amended</legend>
        {lockParent ? (
          uploaded ? (
            // The identity of an uploaded parent was AI-read, so it stays
            // correctable until the tenant signs against it.
            <>
              {t.parentDocumentName && (
                <p className="mb-4 flex items-center gap-1.5 text-sm text-ink">
                  <Icon name="description" size={16} /> {t.parentDocumentName}
                </p>
              )}
              <ExtractionReview t={t} set={set} extraction={t.parentExtraction} />
            </>
          ) : (
            <p className="text-sm text-ink">
              <span className="font-semibold">{t.parentContractTitle}</span>
              {t.parentReferenceCode ? ` · ${t.parentReferenceCode}` : ""}
              {t.parentPropertyDescription ? ` · ${t.parentPropertyDescription}` : ""}
            </p>
          )
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:gap-6">
              {([
                ["system", "A contract in the system"],
                ["uploaded", "Upload a signed copy"],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex min-h-[44px] items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="parent_source_choice"
                    value={value}
                    checked={t.parentSource === value}
                    onChange={() =>
                      // An uploaded contract has no picker to set the kind, and
                      // extraction may never run (no API key, unreadable scan) —
                      // so the review dropdown needs a real value from the start.
                      set(value === "uploaded" ? { parentSource: value, parentType: t.parentType || "tenancy" } : { parentSource: value })
                    }
                    className="h-4 w-4 accent-navy"
                  />
                  {label}
                </label>
              ))}
            </div>

            {!uploaded ? (
              <>
                <F label="Original agreement" hint="Only fully executed contracts can be amended">
                  <select
                    aria-label="Original agreement"
                    value={t.parentType && t.parentId ? `${t.parentType}:${t.parentId}` : ""}
                    onChange={(e) => onParentChange(e.target.value)}
                    className={inputCls}
                    required
                  >
                    <option value="">Select a contract…</option>
                    {parentOptions.map((o) => (
                      <option key={`${o.parentType}:${o.parentId}`} value={`${o.parentType}:${o.parentId}`}>
                        {o.referenceCode} · {o.contractTitle} · {o.counterpartyName} · {o.propertyDescription}
                      </option>
                    ))}
                  </select>
                </F>
                {parentOptions.length === 0 && (
                  <p className="mt-2 text-xs text-slate">
                    There are no fully executed contracts to amend yet — upload a signed copy instead.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mb-4 text-xs text-slate">
                  For contracts signed on paper or in Word, before they were handled here. The signed copy is
                  attached to the addendum, shown to both parties on their signing link, and filed in the
                  tenant&rsquo;s portal documents once everything is signed.
                </p>

                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border border-line bg-cream px-4 text-sm font-semibold text-navy hover:border-navy-700">
                  <Icon name="upload_file" size={18} />
                  {t.parentDocumentName ? "Replace the file" : "Choose the signed contract"}
                  <input
                    type="file"
                    accept={CONTRACT_UPLOAD_MIMES.join(",")}
                    className="sr-only"
                    disabled={uploadState !== "idle"}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void onContractFile(file);
                    }}
                  />
                </label>

                <ContractReadProgress state={uploadState} fileName={pendingFileName} />

                {t.parentDocumentName && uploadState === "idle" && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-ink">
                    <Icon name="description" size={16} /> {t.parentDocumentName}
                  </p>
                )}
                {uploadError && (
                  <p className="mt-3 text-sm text-error" role="alert">{uploadError}</p>
                )}

                {t.parentDocumentPath && <ExtractionReview t={t} set={set} extraction={t.parentExtraction} />}
              </>
            )}
          </>
        )}
      </fieldset>

      <Group title={roles.counterparty}>
        <F label={`${roles.counterparty} name`} hint="Used in the email greeting and as a fallback label">
          <input name="tenant_name_hint" value={t.tenantNameHint} onChange={(e) => set({ tenantNameHint: e.target.value })} className={inputCls} />
        </F>
        <F label={`${roles.counterparty} email`} hint={lockTenant ? "The signing link was already issued to this address" : "The signing link is sent here"}>
          <input name="tenant_email" type="email" required value={t.tenantEmail} onChange={(e) => set({ tenantEmail: e.target.value })} disabled={lockTenant} className={inputCls} />
        </F>
        <F label={`${roles.counterparty} address`} span>
          <input name="tenant_address" value={t.tenantAddress} onChange={(e) => set({ tenantAddress: e.target.value })} className={inputCls} />
        </F>
        <F label={`${roles.counterparty} contact number`}>
          <input name="tenant_contact" value={t.tenantContact} onChange={(e) => set({ tenantContact: e.target.value })} className={inputCls} />
        </F>
      </Group>

      <Group title={roles.principal}>
        <F label={`${roles.principal} full name`}>
          <input name="landlord_name_hint" required value={t.landlordName} onChange={(e) => set({ landlordName: e.target.value })} className={inputCls} />
        </F>
        <F label={`${roles.principal} address`} span>
          <input name="landlord_address" value={t.landlordAddress} onChange={(e) => set({ landlordAddress: e.target.value })} className={inputCls} />
        </F>
        <F label={`${roles.principal} email`} hint={`Their signing link is sent here after the ${roles.counterparty.toLowerCase()} signs (optional if staff will countersign)`}>
          <input name="landlord_email" type="email" value={t.landlordEmail} onChange={(e) => set({ landlordEmail: e.target.value })} className={inputCls} />
        </F>
      </Group>

      <Group title="Dates">
        <F label="Addendum date" hint="“made and entered into this __ day of ____”">
          <input name="agreement_date" type="date" defaultValue={init.agreementDate} className={inputCls} />
        </F>
        <F label="Effective date" hint="When the amendments take effect">
          <input name="effective_date" type="date" defaultValue={init.effectiveDate} className={inputCls} />
        </F>
      </Group>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Amendment of term</legend>
        <p className="mb-4 text-xs text-slate">
          Leave both blank to omit this section from the addendum entirely.
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <F label="Amended commencement date">
            <input name="new_start_date" type="date" defaultValue={init.newStartDate} className={inputCls} />
          </F>
          <F label="Amended expiration date">
            <input name="new_end_date" type="date" defaultValue={init.newEndDate} className={inputCls} />
          </F>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Amendment of rent and fees</legend>
        <p className="mb-4 text-xs text-slate">
          Leave empty to omit this section. Amounts here supersede the corresponding amounts in the original contract.
        </p>
        <div className="flex flex-col gap-2">
          {t.feeItems.length > 0 && (
            <div className="hidden grid-cols-[2fr_1fr_2rem] gap-2 text-xs font-semibold text-slate sm:grid">
              <span>Item</span><span>Amount (₱)</span><span />
            </div>
          )}
          {t.feeItems.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_2rem]">
              <input aria-label="Fee item" placeholder="e.g. Monthly rent" value={r.label} onChange={(e) => setFeeItem(i, { label: e.target.value })} className={inputCls} />
              <input aria-label="Amount" type="number" min={0} step="0.01" value={r.amount} onChange={(e) => setFeeItem(i, { amount: Number(e.target.value) || 0 })} className={inputCls} />
              <button type="button" aria-label="Remove fee item" onClick={() => set({ feeItems: t.feeItems.filter((_, j) => j !== i) })} className={removeCls}>×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set({ feeItems: [...t.feeItems, { label: "", amount: 0 }] })} className={addCls}>
          Add fee item
        </button>
        {t.feeItems.length > 0 && (
          <p className="mt-3 text-sm font-semibold text-navy">
            Total: ₱{feeTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}

        {t.feeItems.length > 0 && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-navy">Payment schedule (optional)</h4>
            <div className="flex flex-col gap-2">
              {t.paymentSchedule.map((r, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.2fr_1.2fr_2rem]">
                  <input aria-label="Date due" placeholder="Date due" value={r.dueDate} onChange={(e) => setScheduleRow(i, { dueDate: e.target.value })} className={inputCls} />
                  <input aria-label="Amount" placeholder="Amount" value={r.amount} onChange={(e) => setScheduleRow(i, { amount: e.target.value })} className={inputCls} />
                  <input aria-label="Bank/branch" placeholder="Bank / branch" value={r.bankBranch} onChange={(e) => setScheduleRow(i, { bankBranch: e.target.value })} className={inputCls} />
                  <input aria-label="Coverage" placeholder="Coverage" value={r.coverage} onChange={(e) => setScheduleRow(i, { coverage: e.target.value })} className={inputCls} />
                  <button type="button" aria-label="Remove schedule row" onClick={() => set({ paymentSchedule: t.paymentSchedule.filter((_, j) => j !== i) })} className={removeCls}>×</button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => set({ paymentSchedule: [...t.paymentSchedule, { dueDate: "", amount: "", bankBranch: `${t.bankDetails.bank} / ${t.bankDetails.branch}`, coverage: "" }] })}
              className={addCls}
            >
              Add schedule row
            </button>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <F label="Account name">
                <input name="bank_name" defaultValue={init.bankDetails.name} className={inputCls} />
              </F>
              <F label="Bank">
                <input name="bank_bank" defaultValue={init.bankDetails.bank} className={inputCls} />
              </F>
              <F label="Branch">
                <input name="bank_branch" defaultValue={init.bankDetails.branch} className={inputCls} />
              </F>
              <F label="Account number">
                <input name="bank_account_number" defaultValue={init.bankDetails.accountNumber} className={inputCls} />
              </F>
            </div>
          </>
        )}
      </fieldset>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Change of parties and occupants</legend>
        <p className="mb-4 text-xs text-slate">
          Leave empty to omit this section. Anyone added or substituted must upload a valid ID when signing.
        </p>
        <div className="flex flex-col gap-2">
          {t.partyChanges.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.4fr_1.4fr_2rem]">
              <select aria-label="Action" value={r.action} onChange={(e) => setPartyChange(i, { action: e.target.value as AddendumPartyChange["action"] })} className={inputCls}>
                <option value="add">Add</option>
                <option value="remove">Remove</option>
                <option value="substitute">Substitute</option>
              </select>
              <input aria-label="Role" placeholder="Role (e.g. occupant)" value={r.role} onChange={(e) => setPartyChange(i, { role: e.target.value })} className={inputCls} />
              <input aria-label="Name" placeholder="Name" value={r.name} onChange={(e) => setPartyChange(i, { name: e.target.value })} className={inputCls} />
              {r.action === "substitute" ? (
                <input aria-label="Outgoing name" placeholder="Person being replaced" value={r.outgoingName ?? ""} onChange={(e) => setPartyChange(i, { outgoingName: e.target.value })} className={inputCls} />
              ) : (
                <input aria-label="Notes" placeholder="Notes (optional)" value={r.notes ?? ""} onChange={(e) => setPartyChange(i, { notes: e.target.value })} className={inputCls} />
              )}
              <button type="button" aria-label="Remove change" onClick={() => set({ partyChanges: t.partyChanges.filter((_, j) => j !== i) })} className={removeCls}>×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set({ partyChanges: [...t.partyChanges, { action: "add", role: "occupant", name: "" }] })} className={addCls}>
          Add party change
        </button>
      </fieldset>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Amended provisions</legend>
        <p className="mb-4 text-xs text-slate">
          Leave empty to omit this section. Each item names a section of the original contract and its new wording.
          {clauseIndex.length > 0 && " Pick a section to load its current wording, then edit it."}
        </p>
        <div className="flex flex-col gap-4">
          {t.amendedClauses.map((r, i) => (
            <div key={i} className="rounded-md border border-line p-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.6fr_1fr_2rem]">
                {clauseIndex.length > 0 ? (
                  <select
                    aria-label="Section reference"
                    value={clauseIndex.some((c) => c.ref === r.ref) ? r.ref : ""}
                    onChange={(e) => onClauseRefPick(i, e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Other section…</option>
                    {clauseIndex.map((c) => (
                      <option key={c.ref} value={c.ref}>
                        {c.ref}{c.heading ? ` — ${c.heading}` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input aria-label="Section reference" placeholder="Section no. (e.g. 4.2)" value={r.ref} onChange={(e) => setAmendedClause(i, { ref: e.target.value })} className={inputCls} />
                )}
                <input aria-label="Section heading" placeholder="Section heading (optional)" value={r.heading ?? ""} onChange={(e) => setAmendedClause(i, { heading: e.target.value })} className={inputCls} />
                <select aria-label="Amendment mode" value={r.mode} onChange={(e) => setAmendedClause(i, { mode: e.target.value as AddendumAmendedClause["mode"] })} className={inputCls}>
                  <option value="replace">Replace in full</option>
                  <option value="add">Add to it</option>
                </select>
                <button type="button" aria-label="Remove provision" onClick={() => set({ amendedClauses: t.amendedClauses.filter((_, j) => j !== i) })} className={removeCls}>×</button>
              </div>
              {/* "Other section…" — the model's index missed it, or it is a new
                  provision being inserted. Type the number by hand. */}
              {clauseIndex.length > 0 && !clauseIndex.some((c) => c.ref === r.ref) && (
                <input
                  aria-label="Section number"
                  placeholder="Section no. (e.g. 4.2)"
                  value={r.ref}
                  onChange={(e) => setAmendedClause(i, { ref: e.target.value })}
                  className={`${inputCls} mt-2`}
                />
              )}
              <textarea
                aria-label="New wording"
                placeholder="The new wording, exactly as it should appear in the addendum"
                value={r.newText}
                onChange={(e) => setAmendedClause(i, { newText: e.target.value })}
                rows={4}
                className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
              />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set({ amendedClauses: [...t.amendedClauses, { ref: "", heading: "", mode: "replace", newText: "" }] })} className={addCls}>
          Add amended provision
        </button>
      </fieldset>

      <div className="flex items-center justify-end gap-4">
        {uploadState !== "idle" && (
          <p className="text-xs text-slate">Waiting for the contract to finish reading…</p>
        )}
        <SubmitButton label={submitLabel} disabled={uploadState !== "idle"} />
      </div>
    </form>
  );
}
