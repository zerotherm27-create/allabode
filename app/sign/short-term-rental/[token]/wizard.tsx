"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Field, Input, Select } from "@/components/forms/fields";
import { FileUploadButton } from "@/components/forms/file-upload-button";
import { SignatureInput, type SignatureInputHandle } from "@/components/forms/signature-input";
import { Icon } from "@/components/icon";
import {
  saveStrDraft, createStrIdUploadTicket, confirmStrIdUpload, submitStrTenantSignature,
  type StrAgreementRecord,
} from "@/app/sign/short-term-rental-actions";
import { createClient } from "@/lib/supabase/client";
import { AGREEMENTS_BUCKET } from "@/lib/storage";
import { SIGNING_ID_TYPES, tenantContactPrefill } from "@/lib/signing/form-helpers";
import { FullStrPreview } from "./full-str-preview";

type TenantForm = { name: string; address: string; contact: string; email: string };

const inputCls = "h-9";
const DONE_STEP = 4;

function initialTenantForm(r: StrAgreementRecord): TenantForm {
  return tenantContactPrefill(r);
}

function initialOccupants(r: StrAgreementRecord): string[] {
  const saved = (r.occupants ?? []).filter((o): o is string => typeof o === "string");
  return saved.length > 0 ? saved : [""];
}

function StepShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-5 font-display text-lg font-bold text-navy">{title}</h2>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

export function StrWizard({ token, initial }: { token: string; initial: StrAgreementRecord }) {
  const [step, setStep] = useState(initial.status === "tenant_signed" || initial.status === "completed" ? DONE_STEP : 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [tenant, setTenant] = useState(initialTenantForm(initial));
  const [occupants, setOccupants] = useState<string[]>(initialOccupants(initial));
  const [idType, setIdType] = useState(initial.tenant_id_type ?? "passport");
  const [idNumber, setIdNumber] = useState(initial.tenant_id_number ?? "");
  const [idIssuedDate, setIdIssuedDate] = useState(initial.tenant_id_issued_date ?? "");
  const [idUploaded, setIdUploaded] = useState(!!initial.tenant_id_document_path);
  const [idUploading, setIdUploading] = useState(false);

  const [typedName, setTypedName] = useState("");
  const [agreeChecked, setAgreeChecked] = useState(false);
  const padRef = useRef<SignatureInputHandle>(null);

  async function persist() {
    setSaving(true);
    try {
      const { error: err } = await saveStrDraft(token, {
        tenantDetails: { ...tenant },
        occupants: occupants.filter((o) => o.trim()),
        tenantIdType: idType,
        tenantIdNumber: idNumber || null,
        tenantIdIssuedDate: idIssuedDate || null,
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
      if (!tenant.name || !tenant.address || !tenant.email) {
        setError("Please fill in your name, address, and email.");
        return;
      }
      if (!idNumber || !idIssuedDate || !idUploaded) {
        setError("Please copy your ID number and issue date from the uploaded ID, then continue.");
        return;
      }
    }
    const ok = await persist();
    if (ok) setStep((s) => Math.min(s + 1, 3));
  }
  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function onIdFileChange(file: File) {
    setIdUploading(true);
    setError("");
    try {
      const ticket = await createStrIdUploadTicket(token, file.name, file.size, file.type);
      if (ticket.error || !ticket.signedUrl || !ticket.uploadToken || !ticket.path) {
        setError(ticket.error || "Could not prepare upload.");
        return;
      }
      // Browser -> Supabase Storage directly (not subject to server
      // request-body limits); the ticket is the credential.
      const { error: upErr } = await createClient()
        .storage.from(AGREEMENTS_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.uploadToken, file, { contentType: file.type });
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        return;
      }
      const { error: confirmErr } = await confirmStrIdUpload(token, ticket.path);
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
      setError("Please confirm you have read and agree to the Agreement.");
      return;
    }
    setSaving(true);
    try {
      const dataUrl = padRef.current.getDataUrl();
      if (!dataUrl) {
        setError("Please draw or upload your signature.");
        return;
      }
      const { error: err } = await submitStrTenantSignature(token, { typedName, signatureDataUrl: dataUrl });
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

  return (
    <div className="w-full max-w-2xl rounded-lg border border-line bg-surface p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Image src="/logo/logo-primary.png" alt="All Abode Brokerage and Valuation OPC" width={160} height={48} className="h-10 w-auto" />
        <p className="label-caps text-gold">Short Term Rental Agreement</p>
      </div>

      {step < DONE_STEP && (
        <div className="mb-6 flex items-center gap-1.5">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-navy" : "bg-surface-gray"}`} />
          ))}
        </div>
      )}

      {step === 1 && (
        <StepShell title="Your details">
          <p className="rounded-md bg-surface-gray px-4 py-3 text-xs text-slate">
            The booking terms (property, rates, fees, and deposit) have been prepared by All Abode — you&apos;ll
            review them in the next step. Here we only need your details.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full legal name" required>
              <Input className={inputCls} value={tenant.name} onChange={(e) => setTenant({ ...tenant, name: e.target.value })} />
            </Field>
            <Field label="Contact number">
              <Input className={inputCls} value={tenant.contact} onChange={(e) => setTenant({ ...tenant, contact: e.target.value })} />
            </Field>
          </div>
          <Field label="Residential address" required>
            <Input className={inputCls} value={tenant.address} onChange={(e) => setTenant({ ...tenant, address: e.target.value })} />
          </Field>
          <Field label="Email" required>
            <Input className={inputCls} type="email" value={tenant.email} onChange={(e) => setTenant({ ...tenant, email: e.target.value })} />
          </Field>

          <div className="mt-2 border-t border-line pt-5">
            <h3 className="mb-1 text-sm font-semibold text-navy">Registered occupants</h3>
            <p className="mb-3 text-xs text-slate">
              List everyone (besides you) who will stay at the Property under this agreement (Section 2.1).
            </p>
            <div className="flex flex-col gap-2">
              {occupants.map((o, i) => (
                <Input
                  key={i}
                  className={inputCls}
                  aria-label={`Occupant ${i + 1}`}
                  placeholder={`Occupant ${i + 1}`}
                  value={o}
                  onChange={(e) => setOccupants(occupants.map((x, j) => (j === i ? e.target.value : x)))}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOccupants([...occupants, ""])}
              className="mt-2 text-xs font-semibold text-navy-700 underline"
            >
              Add another occupant
            </button>
          </div>

          <div className="border-t border-line pt-5">
            <h3 className="mb-1 text-sm font-semibold text-navy">Identity verification</h3>
            <p className="mb-3 text-xs text-slate">Required before you can sign. A passport is preferred.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ID type" required>
                <Select value={idType} onChange={(e) => setIdType(e.target.value)}>
                  {SIGNING_ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="ID number" required>
                <Input className={inputCls} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
              </Field>
            </div>
            <Field label="Date issued" required>
              <Input className={inputCls} type="date" value={idIssuedDate} onChange={(e) => setIdIssuedDate(e.target.value)} />
            </Field>
            <Field label="Upload ID image" required hint="JPG, PNG, or PDF, up to 10 MB">
              <FileUploadButton
                accept="image/jpeg,image/png,application/pdf"
                disabled={idUploading}
                onFile={onIdFileChange}
                label={idUploaded ? "Replace ID file" : "Upload ID file"}
              />
            </Field>
            {idUploading && <p className="text-xs text-slate">Uploading…</p>}
            {idUploaded && !idUploading && (
              <p className="flex items-center gap-1.5 text-xs text-available"><Icon name="check_circle" size={16} fill={1} /> ID uploaded</p>
            )}
          </div>
        </StepShell>
      )}

      {step === 2 && (
        <StepShell title="Review your agreement">
          <p className="text-xs text-slate">
            Please read the full agreement below before signing. The notarial acknowledgment is handled separately
            and is not shown here.
          </p>
          <div className="max-h-[60vh] overflow-y-auto rounded-md border border-line bg-surface-gray p-5">
            <FullStrPreview
              record={initial}
              tenantDetails={{ ...tenant }}
              occupants={occupants}
            />
          </div>
        </StepShell>
      )}

      {step === 3 && (
        <StepShell title="Sign your agreement">
          <Field label="Type your full legal name" required>
            <Input className={inputCls} value={typedName} onChange={(e) => setTypedName(e.target.value)} />
          </Field>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">Your signature</label>
            <SignatureInput ref={padRef} />
          </div>
          <label className="flex items-start gap-3 text-sm text-slate">
            <input type="checkbox" checked={agreeChecked} onChange={(e) => setAgreeChecked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-navy" />
            <span>I have read and agree to the Short Term Rental Agreement, and I am electronically signing in accordance with R.A. 8792.</span>
          </label>
        </StepShell>
      )}

      {step === DONE_STEP && (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-available/10 text-available">
            <Icon name="check_circle" size={36} fill={1} />
          </span>
          <h3 className="mt-5 font-display text-2xl font-bold text-navy">
            {initial.status === "completed" ? "Agreement fully executed" : "Thank you for signing"}
          </h3>
          <p className="mt-3 max-w-md text-slate">
            {initial.status === "completed"
              ? "Both parties have signed. Your copy is ready to download below."
              : "We've received your signature. The landlord will sign next, and we'll email you once the agreement is fully executed."}
          </p>
          {initial.status === "completed" && (
            <a
              href={`/api/sign/short-term-rental/${token}/pdf`}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Icon name="download" size={20} /> Download signed agreement
            </a>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}

      {step < DONE_STEP && (
        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button type="button" onClick={back} className="text-sm font-medium text-slate hover:text-navy">Back</button>
          ) : <span />}
          {step < 3 ? (
            <button type="button" onClick={next} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
              {saving ? <Icon name="progress_activity" size={18} className="animate-spin" /> : null}
              Next
            </button>
          ) : (
            <button type="button" onClick={sign} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
              {saving ? <Icon name="progress_activity" size={18} className="animate-spin" /> : null}
              Sign agreement
            </button>
          )}
        </div>
      )}
    </div>
  );
}
