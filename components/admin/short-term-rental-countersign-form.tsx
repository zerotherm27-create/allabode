"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { countersignStrAgreement } from "@/app/admin/short-term-rental-actions";
import { SignatureInput, type SignatureInputHandle } from "@/components/forms/signature-input";

/**
 * In-dashboard landlord signature (designated signatory only) — used when
 * staff want to sign on the landlord's behalf immediately, instead of
 * sending a remote signing link. This is the second signature in the flow
 * (the tenant signs first); it completes the agreement once submitted.
 */
export function StrCountersignForm({ agreementId, defaultName = "" }: { agreementId: string; defaultName?: string }) {
  const padRef = useRef<SignatureInputHandle>(null);
  const [typedName, setTypedName] = useState(defaultName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!typedName.trim()) {
      setError("Please enter your name as it should appear on the agreement.");
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
      await countersignStrAgreement(agreementId, dataUrl, typedName.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-1 font-display text-sm font-semibold text-navy">Sign now as Landlord&#x2019;s representative</h2>
      <p className="mb-3 text-xs text-slate">
        Signs immediately in the dashboard on the landlord&#x2019;s behalf.
      </p>
      <label className="mb-3 block text-sm">
        <span className="mb-1 block font-medium text-navy">Your name</span>
        <span className="block text-xs text-slate">Printed on the agreement as the signatory</span>
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
        {pending ? "Signing…" : "Sign & complete"}
      </button>
    </div>
  );
}
