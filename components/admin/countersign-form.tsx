"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Icon } from "@/components/icon";
import { countersignAgreement } from "@/app/admin/agreement-actions";

export function CountersignForm({ agreementId }: { agreementId: string }) {
  const padRef = useRef<SignatureCanvas>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("Please draw your signature first.");
      return;
    }
    setPending(true);
    try {
      const dataUrl = padRef.current.toDataURL("image/png");
      await countersignAgreement(agreementId, dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to countersign.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-3 font-display text-sm font-semibold text-navy">Countersign as Manager</h2>
      <div className="overflow-hidden rounded-md border border-line bg-surface-gray">
        <SignatureCanvas
          ref={padRef}
          penColor="#0a2540"
          canvasProps={{ className: "h-40 w-full" }}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => padRef.current?.clear()}
          className="text-xs font-medium text-slate hover:text-navy"
        >
          Clear
        </button>
      </div>
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
