"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { visibilityCopy } from "@/lib/team/admin-status";
import {
  ACCREDITATION_LABELS,
  ACCREDITATION_OPTION_NAMES,
  ACCREDITATION_TYPES,
  DESIGNATION_MAX,
  DESIGNATION_SUGGESTIONS,
  type AccreditationType,
} from "@/lib/team/license";
import {
  attachSpecialistDomainAction,
  reinstateSpecialist,
  removeSpecialistAction,
  resendSpecialistInviteAction,
  setSpecialistVisibility,
  suspendSpecialistAction,
  updateSpecialistTitle,
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

export type SubdomainUiState = "not-configured" | "not-attached" | "waiting" | "live";

const SUBDOMAIN_LABEL: Record<SubdomainUiState, string> = {
  "not-configured": "Not configured (Vercel API variables are missing)",
  "not-attached": "Not set up yet",
  waiting: "Waiting for DNS or certificate",
  live: "Live",
};

/** Subdomain status row + set up / re-check button. */
export function SubdomainControls({ id, slug, state }: { id: string; slug: string; state: SubdomainUiState }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<SpecialistActionState | null>(null);
  const address = `${slug}.allabodeph.com`;
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h2 className="font-display text-sm font-semibold text-navy">Subdomain</h2>
      <p className="mt-1 text-sm text-slate">
        Status: <strong className="text-ink">{SUBDOMAIN_LABEL[state]}</strong>
        {state === "live" && (
          <>
            {" · "}
            <a href={`https://${address}`} className="break-all text-navy-700 hover:underline">https://{address}</a>
          </>
        )}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending || state === "not-configured"}
          onClick={() => start(async () => setResult(await attachSpecialistDomainAction(id)))}
          className="min-h-11 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
          {pending ? "Checking…" : state === "live" ? "Re-check subdomain" : "Set up / re-check subdomain"}
        </button>
        <Notice state={result} />
      </div>
    </div>
  );
}

/** Staff switch: hide a specialist from the public website, or show them again.
 *  `available` is false until the visibility migration has been run. */
export function VisibilityControls({ id, visible, available }: { id: string; visible: boolean; available: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<SpecialistActionState | null>(null);
  const copy = visibilityCopy(visible);
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h2 className="font-display text-sm font-semibold text-navy">Website visibility</h2>
      {!available ? (
        <p className="mt-1 text-sm text-slate">Run the visibility migration to use this option.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink">
            <strong>{copy.state}</strong>
          </p>
          <p className="mt-1 text-sm text-slate">{copy.explanation}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" disabled={pending}
              onClick={() => {
                if (copy.confirm && !window.confirm(copy.confirm)) return;
                start(async () => setState(await setSpecialistVisibility(id, !visible)));
              }}
              className={visible
                ? "rounded-md border border-line px-5 py-3 text-sm font-semibold text-navy hover:bg-surface-gray disabled:opacity-50"
                : "rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"}>
              {pending ? "Saving…" : copy.button}
            </button>
            <Notice state={state} />
          </div>
        </>
      )}
    </div>
  );
}

/** Staff edit: custom designation (free text) and accreditation type. `available` is false until the migration has been run. */
export function TitleControls({
  id, designation, accreditation, available,
}: { id: string; designation: string; accreditation: AccreditationType; available: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<SpecialistActionState | null>(null);
  const [des, setDes] = useState(designation);
  const [acc, setAcc] = useState<AccreditationType>(accreditation);
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h2 className="font-display text-sm font-semibold text-navy">Designation and accreditation</h2>
      {!available ? (
        <p className="mt-1 text-sm text-slate">Run the designation migration (20261113100000_specialist_designation_accreditation.sql) to use this option.</p>
      ) : (
        <form
          className="mt-3 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => setState(await updateSpecialistTitle(id, des, acc)));
          }}
        >
          <div>
            <label htmlFor="designation" className="block text-sm font-medium text-ink">Designation</label>
            <input
              id="designation" list="designation-suggestions" value={des} maxLength={DESIGNATION_MAX} autoComplete="off"
              onChange={(e) => setDes(e.currentTarget.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink"
              aria-describedby="designation-hint"
            />
            <datalist id="designation-suggestions">
              {DESIGNATION_SUGGESTIONS.map((d) => <option key={d} value={d} />)}
            </datalist>
            <p id="designation-hint" className="mt-1 text-xs text-slate">Their job title on the page. Leave blank for the default wording.</p>
          </div>
          <div>
            <label htmlFor="accreditation" className="block text-sm font-medium text-ink">Accreditation</label>
            <select
              id="accreditation" value={acc}
              onChange={(e) => setAcc(e.currentTarget.value as AccreditationType)}
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink"
            >
              {ACCREDITATION_TYPES.map((t) => (
                <option key={t} value={t}>{ACCREDITATION_OPTION_NAMES[t]} ({ACCREDITATION_LABELS[t]})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending}
              className="min-h-11 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
              {pending ? "Saving…" : "Save"}
            </button>
            <Notice state={state} />
          </div>
        </form>
      )}
    </div>
  );
}
