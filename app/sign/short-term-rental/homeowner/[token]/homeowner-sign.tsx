"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Field, Input, Select } from "@/components/forms/fields";
import { FileUploadButton } from "@/components/forms/file-upload-button";
import { SignatureInput, type SignatureInputHandle } from "@/components/forms/signature-input";
import { Icon } from "@/components/icon";
import {
  createStrHomeownerIdUploadTicket, confirmStrHomeownerIdUpload, submitStrHomeownerSignature,
  type StrAgreementRecord,
} from "@/app/sign/short-term-rental-actions";
import { createClient } from "@/lib/supabase/client";
import { AGREEMENTS_BUCKET } from "@/lib/storage";
import { SIGNING_ID_TYPES } from "@/lib/signing/form-helpers";
import { FullStrPreview } from "../../[token]/full-str-preview";

const inputCls = "h-9";

export function StrHomeownerSign({ token, initial }: { token: string; initial: StrAgreementRecord }) {
  const alreadySigned = !!initial.homeowner_signature_data || initial.status === "completed";
  const [done, setDone] = useState<null | { completed: boolean }>(
    alreadySigned ? { completed: initial.status === "completed" } : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [idType, setIdType] = useState(initial.homeowner_id_type ?? "passport");
  const [idNumber, setIdNumber] = useState(initial.homeowner_id_number ?? "");
  const [idIssuedDate, setIdIssuedDate] = useState(initial.homeowner_id_issued_date ?? "");
  const [idUploaded, setIdUploaded] = useState(!!initial.homeowner_id_document_path);
  const [idUploading, setIdUploading] = useState(false);

  const [typedName, setTypedName] = useState(initial.homeowner_details?.name ?? "");
  const [agreeChecked, setAgreeChecked] = useState(false);
  const padRef = useRef<SignatureInputHandle>(null);

  async function onIdFileChange(file: File) {
    setError("");
    if (!idNumber.trim() || !idIssuedDate) {
      setError("Please enter your ID number and issue date before uploading the image.");
      return;
    }
    setIdUploading(true);
    try {
      const ticket = await createStrHomeownerIdUploadTicket(token, file.name, file.size, file.type);
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
      const { error: confirmErr } = await confirmStrHomeownerIdUpload(token, {
        idType, idNumber, idIssuedDate, path: ticket.path,
      });
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
    if (!idNumber || !idIssuedDate || !idUploaded) {
      setError("Please complete the ID verification (number, issue date, and image) before signing.");
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
      const result = await submitStrHomeownerSignature(token, { typedName, signatureDataUrl: dataUrl });
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone({ completed: !!result.completed });
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
        <p className="label-caps text-gold">Short Term Rental Agreement — Homeowner signature</p>
      </div>

      {done ? (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-available/10 text-available">
            <Icon name="check_circle" size={36} fill={1} />
          </span>
          <h3 className="mt-5 font-display text-2xl font-bold text-navy">
            {done.completed ? "Agreement fully executed" : "Signature received"}
          </h3>
          <p className="mt-3 max-w-md text-slate">
            {done.completed
              ? "Both parties have signed. Your copy is ready to download below."
              : "Your signature has been recorded. All Abode is finalizing the document — you'll be able to download the executed copy from this link shortly."}
          </p>
          {done.completed && (
            <a
              href={`/api/sign/short-term-rental/${token}/pdf`}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Icon name="download" size={20} /> Download signed agreement
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="rounded-md bg-surface-gray px-4 py-3 text-xs text-slate">
            {(initial.tenant_details?.name || "The tenant")} signed this agreement
            {initial.tenant_signed_at ? ` on ${new Date(initial.tenant_signed_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", dateStyle: "long" })}` : ""}.
            Please review the full agreement, verify your ID, and sign below.
          </p>

          <div className="max-h-[55vh] overflow-y-auto rounded-md border border-line bg-surface-gray p-5">
            <FullStrPreview
              record={initial}
              tenantDetails={initial.tenant_details ?? {}}
              occupants={initial.occupants ?? []}
            />
          </div>

          <div className="border-t border-line pt-5">
            <h3 className="mb-1 text-sm font-semibold text-navy">Identity verification</h3>
            <p className="mb-3 text-xs text-slate">
              Required before you can sign — your ID appears on the agreement&#x2019;s &quot;Copy of Valid IDs&quot; page.
            </p>
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
            <Field label="Upload ID image" required hint="JPG, PNG, or PDF, up to 10 MB — enter the ID number and issue date first">
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

          <div className="border-t border-line pt-5">
            <h3 className="mb-3 text-sm font-semibold text-navy">Sign as Homeowner</h3>
            <Field label="Type your full legal name" required>
              <Input className={inputCls} value={typedName} onChange={(e) => setTypedName(e.target.value)} />
            </Field>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-navy">Your signature</label>
              <SignatureInput ref={padRef} />
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm text-slate">
              <input type="checkbox" checked={agreeChecked} onChange={(e) => setAgreeChecked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-navy" />
              <span>I have read and agree to the Short Term Rental Agreement, and I am electronically signing in accordance with R.A. 8792.</span>
            </label>
          </div>

          {error && <p role="alert" className="text-sm text-error">{error}</p>}

          <div className="flex justify-end">
            <button type="button" onClick={sign} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
              {saving ? <Icon name="progress_activity" size={18} className="animate-spin" /> : null}
              Sign agreement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
