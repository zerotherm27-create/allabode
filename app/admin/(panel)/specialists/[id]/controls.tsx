"use client";

import { useState, useTransition } from "react";
import {
  reinstateSpecialist,
  suspendSpecialistAction,
  type SpecialistActionState,
} from "@/app/admin/specialist-actions";

function Notice({ state }: { state: SpecialistActionState | null }) {
  if (!state?.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-available" : "text-error"}`}>
      {state.message}
    </p>
  );
}

export function StatusControls({
  id, canSuspend, canReinstate,
}: { id: string; canSuspend: boolean; canReinstate: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<SpecialistActionState | null>(null);
  if (!canSuspend && !canReinstate) return null;
  const run = (fn: (id: string) => Promise<SpecialistActionState>) =>
    start(async () => setState(await fn(id)));
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h2 className="font-display text-sm font-semibold text-navy">Account access</h2>
      <p className="mt-1 text-sm text-slate">
        {canSuspend
          ? "Suspending removes the public profile and turns their listings into house listings."
          : "Reinstating restores the profile. Their earlier listings stay as house listings."}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {canSuspend && (
          <button type="button" disabled={pending} onClick={() => {
              if (window.confirm("Suspend this specialist? Their profile is removed and their listings become house listings.")) {
                run(suspendSpecialistAction);
              }
            }}
            className="rounded-md border border-line px-5 py-3 text-sm font-semibold text-error hover:bg-error-bg disabled:opacity-50">
            {pending ? "Suspending…" : "Suspend"}
          </button>
        )}
        {canReinstate && (
          <button type="button" disabled={pending} onClick={() => run(reinstateSpecialist)}
            className="rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
            {pending ? "Reinstating…" : "Reinstate"}
          </button>
        )}
        <Notice state={state} />
      </div>
    </div>
  );
}
