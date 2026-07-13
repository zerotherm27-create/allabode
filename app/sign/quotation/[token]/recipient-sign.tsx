"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Field, Input } from "@/components/forms/fields";
import { SignatureInput, type SignatureInputHandle } from "@/components/forms/signature-input";
import { Icon } from "@/components/icon";
import {
  saveQuotationRecipientDetails, submitQuotationRecipientSignature, type QuotationRecord,
} from "@/app/sign/quotation-actions";
import { QuotationPreview } from "./quotation-preview";

const inputCls = "h-9";

export function QuotationRecipientSign({ token, initial }: { token: string; initial: QuotationRecord }) {
  const alreadySigned = !!initial.recipient_signature_data || initial.status !== "sent";
  const [done, setDone] = useState<null | { completed: boolean }>(
    alreadySigned ? { completed: initial.status === "completed" } : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const rd = initial.recipient_details ?? {};
  const [name, setName] = useState(rd.name ?? initial.recipient_name_hint ?? "");
  const [phone, setPhone] = useState(rd.phone ?? "");
  const [address, setAddress] = useState(rd.address ?? "");

  const [typedName, setTypedName] = useState(rd.name ?? initial.recipient_name_hint ?? "");
  const [agreeChecked, setAgreeChecked] = useState(false);
  const padRef = useRef<SignatureInputHandle>(null);

  async function sign() {
    setError("");
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!typedName.trim()) {
      setError("Please type your full legal name.");
      return;
    }
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("Please draw or upload your signature.");
      return;
    }
    if (!agreeChecked) {
      setError("Please confirm you have read and agree to the quotation.");
      return;
    }
    setSaving(true);
    try {
      const details = { name, phone, address, email: initial.recipient_email };
      const saveResult = await saveQuotationRecipientDetails(token, details);
      if (saveResult.error) {
        setError(saveResult.error);
        return;
      }
      const dataUrl = padRef.current.getDataUrl();
      if (!dataUrl) {
        setError("Please draw or upload your signature.");
        return;
      }
      const result = await submitQuotationRecipientSignature(token, { typedName, signatureDataUrl: dataUrl });
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
        <Image src="/logo/logo-primary.png" alt="All Abode Property Solutions" width={160} height={48} className="h-10 w-auto" />
        <p className="label-caps text-gold">Quotation — Your signature</p>
      </div>

      {done ? (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-available/10 text-available">
            <Icon name="check_circle" size={36} fill={1} />
          </span>
          <h3 className="mt-5 font-display text-2xl font-bold text-navy">
            {done.completed || initial.status === "completed" ? "Quotation fully executed" : "Signature received"}
          </h3>
          <p className="mt-3 max-w-md text-slate">
            {done.completed || initial.status === "completed"
              ? "Both parties have signed. Your copy is ready to download below."
              : "Your signature has been recorded. All Abode is finalizing the document — refresh this page shortly to download your copy."}
          </p>
          {(done.completed || initial.status === "completed") && (
            <a
              href={`/api/sign/quotation/${token}/pdf`}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Icon name="download" size={20} /> Download quotation
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="rounded-md bg-surface-gray px-4 py-3 text-xs text-slate">
            Please review the quotation below, confirm your details, and sign.
          </p>

          <div className="max-h-[45vh] overflow-y-auto rounded-md border border-line bg-surface-gray p-5">
            <QuotationPreview record={initial} />
          </div>

          <div className="border-t border-line pt-5">
            <h3 className="mb-3 text-sm font-semibold text-navy">Your details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <Input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>
            <Field label="Address">
              <Input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
          </div>

          <div className="border-t border-line pt-5">
            <h3 className="mb-3 text-sm font-semibold text-navy">Sign</h3>
            <Field label="Type your full legal name" required>
              <Input className={inputCls} value={typedName} onChange={(e) => setTypedName(e.target.value)} />
            </Field>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-navy">Your signature</label>
              <SignatureInput ref={padRef} />
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm text-slate">
              <input type="checkbox" checked={agreeChecked} onChange={(e) => setAgreeChecked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-navy" />
              <span>I have read and agree to this quotation, and I am electronically signing in accordance with R.A. 8792.</span>
            </label>
          </div>

          {error && <p role="alert" className="text-sm text-error">{error}</p>}

          <div className="flex justify-end">
            <button type="button" onClick={sign} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
              {saving ? <Icon name="progress_activity" size={18} className="animate-spin" /> : null}
              Sign quotation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
