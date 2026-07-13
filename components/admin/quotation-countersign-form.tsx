"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { countersignQuotation } from "@/app/admin/quotations-actions";
import { SignatureInput, type SignatureInputHandle } from "@/components/forms/signature-input";

/**
 * Staff fallback for the company representative's signature (designated
 * signatory only) — used when the company rep signs in the admin dashboard
 * instead of via their own remote link.
 */
export function QuotationCountersignForm({ quotationId }: { quotationId: string }) {
  const padRef = useRef<SignatureInputHandle>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
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
      await countersignQuotation(quotationId, dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to countersign.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-1 font-display text-sm font-semibold text-navy">Countersign as Company Representative</h2>
      <p className="mb-3 text-xs text-slate">
        Fallback when the company rep won&#x2019;t sign remotely — completes the quotation immediately.
      </p>
      <SignatureInput ref={padRef} />
      {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
      >
        {pending ? <Icon name="progress_activity" size={18} className="animate-spin" /> : <Icon name="verified" size={18} />}
        {pending ? "Signing…" : "Countersign & complete"}
      </button>
    </div>
  );
}
