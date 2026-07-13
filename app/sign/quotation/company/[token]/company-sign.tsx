"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Field, Input } from "@/components/forms/fields";
import { SignatureInput, type SignatureInputHandle } from "@/components/forms/signature-input";
import { Icon } from "@/components/icon";
import {
  submitQuotationCompanySignature, type QuotationRecord,
} from "@/app/sign/quotation-actions";
import { QuotationPreview } from "../../[token]/quotation-preview";

const inputCls = "h-9";

export function QuotationCompanySign({ token, initial }: { token: string; initial: QuotationRecord }) {
  const alreadySigned = !!initial.company_signature_data || initial.status === "completed";
  const [done, setDone] = useState<null | { completed: boolean }>(
    alreadySigned ? { completed: initial.status === "completed" } : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [typedName, setTypedName] = useState(initial.company_typed_name ?? "");
  const [agreeChecked, setAgreeChecked] = useState(false);
  const padRef = useRef<SignatureInputHandle>(null);

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
      setError("Please confirm you have read and agree to the quotation.");
      return;
    }
    setSaving(true);
    try {
      const dataUrl = padRef.current.getDataUrl();
      if (!dataUrl) {
        setError("Please draw or upload your signature.");
        return;
      }
      const result = await submitQuotationCompanySignature(token, { typedName, signatureDataUrl: dataUrl });
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
        <p className="label-caps text-gold">Quotation — Company representative signature</p>
      </div>

      {done ? (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-available/10 text-available">
            <Icon name="check_circle" size={36} fill={1} />
          </span>
          <h3 className="mt-5 font-display text-2xl font-bold text-navy">
            {done.completed ? "Quotation fully executed" : "Signature received"}
          </h3>
          <p className="mt-3 max-w-md text-slate">
            {done.completed
              ? "Both parties have signed. Your copy is ready to download below."
              : "Your signature has been recorded. All Abode is finalizing the document — you'll be able to download the executed copy from this link shortly."}
          </p>
          {done.completed && (
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
            {(initial.recipient_details?.name || "The recipient")} signed this quotation
            {initial.recipient_signed_at ? ` on ${new Date(initial.recipient_signed_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", dateStyle: "long" })}` : ""}.
            Please review and sign below as company representative.
          </p>

          <div className="max-h-[45vh] overflow-y-auto rounded-md border border-line bg-surface-gray p-5">
            <QuotationPreview record={initial} />
          </div>

          <div className="border-t border-line pt-5">
            <h3 className="mb-3 text-sm font-semibold text-navy">Sign as Company Representative</h3>
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
