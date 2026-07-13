"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { countersignQuotationAsCompany } from "@/app/admin/quotations-actions";
import { SignatureInput, type SignatureInputHandle } from "@/components/forms/signature-input";

/**
 * In-dashboard company signature (designated signatory only) — used when the
 * preparer is themselves a signatory and wants to sign immediately while
 * preparing the quotation, instead of sending a remote pre-sign link to a
 * colleague. This is the first signature in the flow; it does not complete
 * the quotation (the recipient signs last).
 */
export function QuotationCountersignForm({ quotationId, defaultName = "" }: { quotationId: string; defaultName?: string }) {
  const padRef = useRef<SignatureInputHandle>(null);
  const [typedName, setTypedName] = useState(defaultName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!typedName.trim()) {
      setError("Please enter your name as it should appear on the quotation.");
      return;
    }
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("Please draw or upload the signature first.");
      return;
    }
    const dataUrl = padRef.current.getDataUrl();
    if (!dataUrl) {
      setError("Please draw or upload the signature first.");
      return;
    }
    setPending(true);
    try {
      await countersignQuotationAsCompany(quotationId, dataUrl, typedName.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-1 font-display text-sm font-semibold text-navy">Sign now as Company Representative</h2>
      <p className="mb-3 text-xs text-slate">
        Signs immediately in the dashboard — the quotation can then be sent to the recipient for their signature.
      </p>
      <label className="mb-3 block text-sm">
        <span className="mb-1 block font-medium text-navy">Your name</span>
        <span className="block text-xs text-slate">Printed on the quotation as the signatory (e.g. &#x201c;Prepared by&#x201d;)</span>
        <input
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
        />
      </label>
      <SignatureInput ref={padRef} />
      {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
      >
        {pending ? <Icon name="progress_activity" size={18} className="animate-spin" /> : <Icon name="verified" size={18} />}
        {pending ? "Signing…" : "Sign & continue"}
      </button>
    </div>
  );
}
