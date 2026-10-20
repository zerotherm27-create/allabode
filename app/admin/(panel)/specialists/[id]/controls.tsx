"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  reinstateSpecialist,
  removeSpecialistAction,
  resendSpecialistInviteAction,
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

/** Resend the sign-in link (any approved, linked specialist); remove the
 *  specialist entirely only while they have never signed in (the typo case). */
export function InviteControls({ id, email, canResend, canRemove }: { id: string; email: string; canResend: boolean; canRemove: boolean }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"resend" | "remove" | null>(null);
  const [state, setState] = useState<SpecialistActionState | null>(null);
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h2 className="font-display text-sm font-semibold text-navy">{canRemove ? "Invitation" : "Sign-in link"}</h2>
      <p className="mt-1 text-sm text-slate">
        {canRemove ? (
          <>An invitation to set a password was emailed to <span className="break-all font-medium text-ink">{email}</span>.
          They haven&rsquo;t signed in yet. Added the wrong email? Remove them and add them again.</>
        ) : (
          <>Stuck without a password? Email a new link to set or reset it to <span className="break-all font-medium text-ink">{email}</span>.</>
        )}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {canResend && (
          <button type="button" disabled={pending} onClick={() => {
              setBusy("resend");
              start(async () => setState(await resendSpecialistInviteAction(id)));
            }}
            className="min-h-11 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
            {pending && busy === "resend" ? "Sending…" : "Resend sign-in link"}
          </button>
        )}
        {canRemove && (
        <button type="button" disabled={pending} onClick={() => {
            if (!window.confirm(`Remove this specialist and delete the login for ${email}? This can't be undone.`)) return;
            setBusy("remove");
            start(async () => setState(await removeSpecialistAction(id)));
          }}
          className="min-h-11 rounded-md border border-line px-5 py-3 text-sm font-semibold text-error hover:bg-error-bg disabled:opacity-50">
          {pending && busy === "remove" ? "Removing…" : "Remove specialist"}
        </button>
        )}
        <Notice state={state} />
        {state?.ok && busy === "remove" && (
          <Link href="/admin/specialists" className="inline-flex min-h-11 items-center text-sm font-medium text-navy-700 hover:underline">
            Back to specialists
          </Link>
        )}
      </div>
    </div>
  );
}
