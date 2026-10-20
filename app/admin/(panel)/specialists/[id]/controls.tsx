"use client";

import { useActionState, useState, useTransition } from "react";
import {
  approveSpecialist,
  rejectSpecialist,
  reinstateSpecialist,
  suspendSpecialistAction,
  updateSpecialistLicence,
  type SpecialistActionState,
} from "@/app/admin/specialist-actions";
import { F, Group, SubmitButton, inputCls } from "@/components/admin/form-kit";

function Notice({ state }: { state: SpecialistActionState | null }) {
  if (!state?.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-available" : "text-error"}`}>
      {state.message}
    </p>
  );
}

export function ApprovalControls({
  id, status, defaultSubdomain, canApprove, canReject,
}: { id: string; status: string; defaultSubdomain: string; canApprove: boolean; canReject: boolean }) {
  const [approveState, approve] = useActionState(approveSpecialist, null);
  const [rejectState, reject] = useActionState(rejectSpecialist, null);
  if (!canApprove && !canReject) return null;
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h2 className="font-display text-sm font-semibold text-navy">
        {status === "rejected" ? "Reconsider application" : "Review application"}
      </h2>
      <form action={approve} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="specialist_id" value={id} />
        <F label="Subdomain" hint="3–30 letters, numbers or hyphens. Becomes their public address.">
          <input name="subdomain" defaultValue={defaultSubdomain} required className={inputCls} />
        </F>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton label="Approve" pendingLabel="Approving…" />
          <Notice state={approveState} />
        </div>
      </form>
      {canReject && (
        <form action={reject} className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <input type="hidden" name="specialist_id" value={id} />
          <button type="submit" className="rounded-md border border-line px-5 py-3 text-sm font-semibold text-error hover:bg-error-bg">
            Reject application
          </button>
          <Notice state={rejectState} />
        </form>
      )}
    </div>
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
          <button type="button" disabled={pending} onClick={() => run(suspendSpecialistAction)}
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

export function LicenceForm({
  id, mode, no, expiry,
}: { id: string; mode: string; no: string; expiry: string }) {
  const [state, action] = useActionState(updateSpecialistLicence, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="specialist_id" value={id} />
      <Group title="Licence">
        <F label="Licence type">
          <select name="license_mode" defaultValue={mode} className={inputCls}>
            <option value="accredited">Accredited under the broker</option>
            <option value="own">Own PRC licence</option>
          </select>
        </F>
        <F label="PRC licence number" hint="Required for an own licence.">
          <input name="license_no" defaultValue={no} maxLength={40} className={inputCls} />
        </F>
        <F label="Licence expiry">
          <input type="date" name="license_expiry" defaultValue={expiry} className={inputCls} />
        </F>
      </Group>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label="Save licence" />
        <Notice state={state} />
      </div>
    </form>
  );
}
