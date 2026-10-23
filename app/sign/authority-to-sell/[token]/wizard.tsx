"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Field, Input, Textarea, Select } from "@/components/forms/fields";
import { FileUploadButton } from "@/components/forms/file-upload-button";
import { SignatureInput, type SignatureInputHandle } from "@/components/forms/signature-input";
import { Icon } from "@/components/icon";
import {
  saveAuthorityToSellDraft, createAuthorityToSellIdUploadTicket, confirmAuthorityToSellIdUpload,
  submitAuthorityToSellOwnerSignature, type AuthorityToSellRecord,
} from "@/app/sign/authority-to-sell-actions";
import { createClient } from "@/lib/supabase/client";
import { AGREEMENTS_BUCKET } from "@/lib/storage";
import { SIGNING_ID_TYPES } from "@/lib/signing/form-helpers";
import {
  DEFAULT_COMMISSION_PCT, atsTermsError,
  type AtsOwnerDetails, type AtsPaymentTerm, type AtsPropertyDetails, type AtsSaleTerms,
} from "@/lib/pm/authority-to-sell-clauses";
import { FullAtsPreview } from "./full-ats-preview";

const inputCls = "h-9";
const LAST_FORM_STEP = 5;
const DONE_STEP = 6;

type OwnerForm = Required<AtsOwnerDetails>;
type PropertyForm = Required<AtsPropertyDetails>;
type TermsForm = Required<AtsSaleTerms>;

function initOwner(r: AuthorityToSellRecord): OwnerForm {
  const d = (r.owner_details ?? {}) as AtsOwnerDetails;
  return {
    name: d.name ?? "", nationality: d.nationality ?? "Filipino", civilStatus: d.civilStatus ?? "",
    address: d.address ?? "", email: d.email ?? r.owner_email, contact: d.contact ?? "",
  };
}
function initProperty(r: AuthorityToSellRecord): PropertyForm {
  const d = (r.property_details ?? {}) as AtsPropertyDetails;
  return {
    propertyType: d.propertyType ?? "", location: d.location ?? "", titleNo: d.titleNo ?? "",
    area: d.area ?? "", improvements: d.improvements ?? "",
  };
}
function initTerms(r: AuthorityToSellRecord): TermsForm {
  const d = (r.sale_terms ?? {}) as AtsSaleTerms;
  return {
    authorityType: d.authorityType ?? "", grossPrice: d.grossPrice ?? "", minPrice: d.minPrice ?? "",
    paymentTerms: d.paymentTerms ?? [], paymentOther: d.paymentOther ?? "",
    commissionPct: d.commissionPct ?? String(DEFAULT_COMMISSION_PCT),
    periodLength: d.periodLength ?? "", periodUnit: d.periodUnit ?? "months",
    periodStart: d.periodStart ?? "", periodEnd: d.periodEnd ?? "",
    protectionDays: d.protectionDays ?? "90", terminationNoticeDays: d.terminationNoticeDays ?? "30",
    executionPlace: d.executionPlace ?? "",
  };
}

function StepShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-5 font-display text-lg font-bold text-navy">{title}</h2>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

const PAYMENT_OPTIONS: { value: AtsPaymentTerm; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_financing", label: "Bank Financing" },
  { value: "installment", label: "Installment" },
  { value: "others", label: "Others" },
];

function todayManila() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

export function AuthorityToSellWizard({ token, initial }: { token: string; initial: AuthorityToSellRecord }) {
  const [step, setStep] = useState(initial.status === "owner_signed" || initial.status === "completed" ? DONE_STEP : 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [owner, setOwner] = useState(initOwner(initial));
  const [property, setProperty] = useState(initProperty(initial));
  const [terms, setTerms] = useState(initTerms(initial));
  const [executionDate, setExecutionDate] = useState<string>(initial.execution_date ?? todayManila());
  const [ownerIdType, setOwnerIdType] = useState(initial.owner_id_type ?? "passport");
  const [ownerIdNumber, setOwnerIdNumber] = useState(initial.owner_id_number ?? "");
  const [ownerIdIssuedDate, setOwnerIdIssuedDate] = useState(initial.owner_id_issued_date ?? "");
  const [idUploaded, setIdUploaded] = useState(!!initial.owner_id_document_path);
  const [idUploading, setIdUploading] = useState(false);

  const [typedName, setTypedName] = useState("");
  const [agreeChecked, setAgreeChecked] = useState(false);
  const padRef = useRef<SignatureInputHandle>(null);

  async function persist() {
    setSaving(true);
    try {
      const { error: err } = await saveAuthorityToSellDraft(token, {
        ownerDetails: owner, propertyDetails: property, saleTerms: terms,
        executionDate: executionDate || null,
        ownerIdType, ownerIdNumber,
        ownerIdIssuedDate: ownerIdIssuedDate || null,
      });
      if (err) {
        setError(err);
        return false;
      }
      return true;
    } catch {
      setError("Couldn't save your progress — please check your connection and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function next() {
    setError("");
    if (step === 1) {
      if (!owner.name || !owner.address || !owner.email) {
        setError("Please fill in your name, address, and email.");
        return;
      }
      if (!ownerIdNumber || !ownerIdIssuedDate || !idUploaded) {
        setError("Please enter your ID number and issue date, and upload a copy of your valid ID before continuing.");
        return;
      }
    }
    if (step === 2 && (!property.propertyType.trim() || !property.location.trim())) {
      setError("Please enter the property type and location.");
      return;
    }
    if (step === 3) {
      const termsErr = atsTermsError(property, terms, executionDate);
      if (termsErr) {
        setError(termsErr);
        return;
      }
    }
    const ok = await persist();
    if (ok) setStep((s) => Math.min(s + 1, LAST_FORM_STEP));
  }
  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function onIdFileChange(file: File) {
    setIdUploading(true);
    setError("");
    try {
      const ticket = await createAuthorityToSellIdUploadTicket(token, file.name, file.size, file.type);
      if (ticket.error || !ticket.signedUrl || !ticket.uploadToken || !ticket.path) {
        setError(ticket.error || "Could not prepare upload.");
        return;
      }
      const { error: upErr } = await createClient()
        .storage.from(AGREEMENTS_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.uploadToken, file, { contentType: file.type });
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        return;
      }
      const { error: confirmErr } = await confirmAuthorityToSellIdUpload(token, ticket.path);
      if (confirmErr) {
        setError(confirmErr);
        return;
      }
      setIdUploaded(true);
    } catch {
      setError("Upload failed — please check your connection and try again.");
    } finally {
      setIdUploading(false);
    }
  }

  async function sign() {
    setError("");
    if (!typedName.trim()) {
      setError("Please type your full legal name.");
      return;
    }
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("Please draw or upload your signature.");
      return;
    }
    if (!agreeChecked) {
      setError("Please confirm you have read and agree to the Authority to Sell.");
      return;
    }
    setSaving(true);
    try {
      const dataUrl = padRef.current.getDataUrl();
      if (!dataUrl) {
        setError("Please draw or upload your signature.");
        return;
      }
      const { error: err } = await submitAuthorityToSellOwnerSignature(token, { typedName, signatureDataUrl: dataUrl });
      if (err) {
        setError(err);
        return;
      }
      setStep(DONE_STEP);
    } catch {
      setError("Couldn't submit your signature — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function togglePayment(v: AtsPaymentTerm, on: boolean) {
    const set = new Set(terms.paymentTerms);
    if (on) set.add(v); else set.delete(v);
    setTerms({ ...terms, paymentTerms: PAYMENT_OPTIONS.map((o) => o.value).filter((o) => set.has(o)) });
  }

  return (
    <div className="w-full max-w-2xl rounded-lg border border-line bg-surface p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Image src="/logo/logo-primary.png" alt="All Abode Property Solutions" width={160} height={48} className="h-10 w-auto" />
        <p className="label-caps text-gold">Authority to Sell</p>
      </div>

      {step <= LAST_FORM_STEP && (
        <div className="mb-6 flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-navy" : "bg-surface-gray"}`} />
          ))}
        </div>
      )}

      {step === 1 && (
        <StepShell title="Your details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full legal name" required>
              <Input className={inputCls} value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} />
            </Field>
            <Field label="Civil status">
              <Input className={inputCls} value={owner.civilStatus} onChange={(e) => setOwner({ ...owner, civilStatus: e.target.value })} />
            </Field>
          </div>
          <Field label="Address" required>
            <Input className={inputCls} value={owner.address} onChange={(e) => setOwner({ ...owner, address: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" required>
              <Input className={inputCls} type="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} />
            </Field>
            <Field label="Contact number">
              <Input className={inputCls} value={owner.contact} onChange={(e) => setOwner({ ...owner, contact: e.target.value })} />
            </Field>
          </div>

          <div className="border-t border-line pt-5">
            <h3 className="mb-1 text-sm font-semibold text-navy">Identity verification</h3>
            <p className="mb-3 text-xs text-slate">Required before you can sign. A passport is preferred.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ID type" required>
                <Select value={ownerIdType} onChange={(e) => setOwnerIdType(e.target.value)}>
                  {SIGNING_ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="ID number" required>
                <Input className={inputCls} value={ownerIdNumber} onChange={(e) => setOwnerIdNumber(e.target.value)} />
              </Field>
            </div>
            <Field label="Date issued" required>
              <Input className={inputCls} type="date" value={ownerIdIssuedDate} onChange={(e) => setOwnerIdIssuedDate(e.target.value)} />
            </Field>
            <Field label="Upload ID image" required hint="JPG or PNG image, up to 10 MB">
              <FileUploadButton
                accept="image/jpeg,image/png"
                disabled={idUploading}
                onFile={onIdFileChange}
                label={idUploaded ? "Replace ID file" : "Upload ID file"}
              />
            </Field>
            {idUploading && <p className="text-xs text-slate">Uploading…</p>}
            {idUploaded && !idUploading && (
              <p className="flex items-center gap-1.5 text-xs text-available"><Icon name="check_circle" size={16} fill={1} /> ID uploaded</p>
            )}
            {!idUploaded && !idUploading && (
              <p className="flex items-center gap-1.5 text-xs text-slate"><Icon name="info" size={16} /> Required — you cannot continue until your ID image is uploaded.</p>
            )}
          </div>
        </StepShell>
      )}

      {step === 2 && (
        <StepShell title="Property for sale">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Property type" required hint="e.g. Condominium unit, house and lot, lot only">
              <Input className={inputCls} value={property.propertyType} onChange={(e) => setProperty({ ...property, propertyType: e.target.value })} />
            </Field>
            <Field label="Title No. / Tax Declaration No.">
              <Input className={inputCls} value={property.titleNo} onChange={(e) => setProperty({ ...property, titleNo: e.target.value })} />
            </Field>
          </div>
          <Field label="Location" required>
            <Input className={inputCls} value={property.location} onChange={(e) => setProperty({ ...property, location: e.target.value })} />
          </Field>
          <Field label="Lot area / floor area" hint="e.g. 45 sqm">
            <Input className={inputCls} value={property.area} onChange={(e) => setProperty({ ...property, area: e.target.value })} />
          </Field>
          <Field label="Improvements (if any)">
            <Textarea value={property.improvements} onChange={(e) => setProperty({ ...property, improvements: e.target.value })} />
          </Field>
        </StepShell>
      )}

      {step === 3 && (
        <StepShell title="Authority, price and terms">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium text-navy">Type of authority <span className="text-error">*</span></legend>
            <label className="flex items-start gap-3 rounded-md border border-line p-3 text-sm">
              <input type="radio" name="authorityType" checked={terms.authorityType === "exclusive"} onChange={() => setTerms({ ...terms, authorityType: "exclusive" })} className="mt-0.5 h-4 w-4 accent-navy" />
              <span><span className="font-semibold text-navy">Exclusive Authority to Sell</span><br />
                <span className="text-slate">All Abode is your sole and exclusive agent; commission is due regardless of who procures the buyer during the term.</span></span>
            </label>
            <label className="flex items-start gap-3 rounded-md border border-line p-3 text-sm">
              <input type="radio" name="authorityType" checked={terms.authorityType === "non_exclusive"} onChange={() => setTerms({ ...terms, authorityType: "non_exclusive" })} className="mt-0.5 h-4 w-4 accent-navy" />
              <span><span className="font-semibold text-navy">Non-Exclusive Authority to Sell</span><br />
                <span className="text-slate">You may appoint other brokers or sell personally; commission is due only to the broker who introduces the buyer.</span></span>
            </label>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Gross selling price (PHP)" required>
              <Input className={inputCls} inputMode="decimal" value={terms.grossPrice} onChange={(e) => setTerms({ ...terms, grossPrice: e.target.value })} />
            </Field>
            <Field label="Minimum acceptable price (PHP)" hint="Optional">
              <Input className={inputCls} inputMode="decimal" value={terms.minPrice} onChange={(e) => setTerms({ ...terms, minPrice: e.target.value })} />
            </Field>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-navy">Terms of payment <span className="text-error">*</span></legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {PAYMENT_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={terms.paymentTerms.includes(o.value)} onChange={(e) => togglePayment(o.value, e.target.checked)} className="h-4 w-4 accent-navy" />
                  {o.label}
                </label>
              ))}
            </div>
            {terms.paymentTerms.includes("others") && (
              <Input className={inputCls} placeholder="Describe the other payment term" value={terms.paymentOther} onChange={(e) => setTerms({ ...terms, paymentOther: e.target.value })} />
            )}
          </fieldset>

          <Field label="Broker's commission (% of the Gross Selling Price)" required hint={`The prevailing rate is ${DEFAULT_COMMISSION_PCT}%`}>
            <Input className={inputCls} inputMode="decimal" value={terms.commissionPct} onChange={(e) => setTerms({ ...terms, commissionPct: e.target.value })} />
          </Field>

          <div className="border-t border-line pt-5">
            <h3 className="mb-3 text-sm font-semibold text-navy">Authority period</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valid for" required>
                <Input className={inputCls} inputMode="numeric" value={terms.periodLength} onChange={(e) => setTerms({ ...terms, periodLength: e.target.value })} />
              </Field>
              <Field label="Unit" required>
                <Select value={terms.periodUnit} onChange={(e) => setTerms({ ...terms, periodUnit: e.target.value as "days" | "months" })}>
                  <option value="months">Months</option>
                  <option value="days">Days</option>
                </Select>
              </Field>
              <Field label="Commencing on" required>
                <Input className={inputCls} type="date" value={terms.periodStart} onChange={(e) => setTerms({ ...terms, periodStart: e.target.value })} />
              </Field>
              <Field label="Ending on" required>
                <Input className={inputCls} type="date" value={terms.periodEnd} onChange={(e) => setTerms({ ...terms, periodEnd: e.target.value })} />
              </Field>
              <Field label="Protection period after expiry (days)" required>
                <Input className={inputCls} inputMode="numeric" value={terms.protectionDays} onChange={(e) => setTerms({ ...terms, protectionDays: e.target.value })} />
              </Field>
              <Field label="Termination notice (days)" required>
                <Input className={inputCls} inputMode="numeric" value={terms.terminationNoticeDays} onChange={(e) => setTerms({ ...terms, terminationNoticeDays: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <Field label="Date of signing" required>
              <Input className={inputCls} type="date" value={executionDate} onChange={(e) => setExecutionDate(e.target.value)} />
            </Field>
            <Field label="Place of signing" required hint="City or municipality">
              <Input className={inputCls} value={terms.executionPlace} onChange={(e) => setTerms({ ...terms, executionPlace: e.target.value })} />
            </Field>
          </div>
        </StepShell>
      )}

      {step === 4 && (
        <StepShell title="Review your Authority to Sell">
          <p className="text-xs text-slate">
            Please read the full document below before signing. The witness lines and notarial acknowledgment are
            completed separately and are not shown here.
          </p>
          <div className="max-h-[60vh] overflow-y-auto rounded-md border border-line bg-surface-gray p-5">
            <FullAtsPreview ownerDetails={owner} propertyDetails={property} saleTerms={terms} executionDate={executionDate} />
          </div>
        </StepShell>
      )}

      {step === 5 && (
        <StepShell title="Sign your Authority to Sell">
          <Field label="Type your full legal name" required>
            <Input className={inputCls} value={typedName} onChange={(e) => setTypedName(e.target.value)} />
          </Field>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">Your signature</label>
            <SignatureInput ref={padRef} />
          </div>
          <label className="flex items-start gap-3 text-sm text-slate">
            <input type="checkbox" checked={agreeChecked} onChange={(e) => setAgreeChecked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-navy" />
            <span>I have read and agree to the Authority to Sell, and I am electronically signing in accordance with R.A. 8792.</span>
          </label>
        </StepShell>
      )}

      {step === DONE_STEP && (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-available/10 text-available">
            <Icon name="check_circle" size={36} fill={1} />
          </span>
          <h3 className="mt-5 font-display text-2xl font-bold text-navy">
            {initial.status === "completed" ? "Authority to Sell fully executed" : "Thank you for signing"}
          </h3>
          <p className="mt-3 max-w-md text-slate">
            {initial.status === "completed"
              ? "Both parties have signed. Your copy is ready to download below."
              : "We've received your signature. The broker will countersign shortly and we'll email you once the document is fully executed."}
          </p>
          {initial.status === "completed" && (
            <a
              href={`/api/sign/authority-to-sell/${token}/pdf`}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Icon name="download" size={20} /> Download signed Authority to Sell
            </a>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}

      {step <= LAST_FORM_STEP && (
        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button type="button" onClick={back} className="text-sm font-medium text-slate hover:text-navy">Back</button>
          ) : <span />}
          {step < LAST_FORM_STEP ? (
            <button type="button" onClick={next} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
              {saving ? <Icon name="progress_activity" size={18} className="animate-spin" /> : null}
              Next
            </button>
          ) : (
            <button type="button" onClick={sign} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
              {saving ? <Icon name="progress_activity" size={18} className="animate-spin" /> : null}
              Sign Authority to Sell
            </button>
          )}
        </div>
      )}
    </div>
  );
}
