"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { countersignAgreement } from "@/app/admin/agreement-actions";
import { SignatureInput, type SignatureInputHandle } from "@/components/forms/signature-input";

export function CountersignForm({ agreementId }: { agreementId: string }) {
  const padRef = useRef<SignatureInputHandle>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("Please draw or upload your signature first.");
      return;
    }
    const dataUrl = padRef.current.getDataUrl();
    if (!dataUrl) {
      setError("Please draw or upload your signature first.");
      return;
    }
    setPending(true);
    try {
      await countersignAgreement(agreementId, dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to countersign.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-3 font-display text-sm font-semibold text-navy">Countersign as Manager</h2>
      <SignatureInput ref={padRef} />
      {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
      >
        {pending ? <Icon name="progress_activity" size={18} className="animate-spin" /> : <Icon name="verified" size={18} />}
        {pending ? "Signing…" : "Countersign agreement"}
      </button>
    </div>
  );
}
