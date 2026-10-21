"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";
import {
  saveLeadNotes,
  updateLeadStage,
  type LeadActionState,
} from "@/app/dashboard/specialist/lead-actions";
import { LEAD_STAGES, MAX_NOTES_LENGTH } from "@/lib/leads/inbox";

const field =
  "w-full rounded-md border border-line bg-surface px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";
const primaryBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";

function Feedback({ state }: { state: LeadActionState | null }) {
  if (!state) return null;
  return state.ok ? (
    <p role="status" className="mt-2 flex items-center gap-1.5 text-sm text-navy">
      <Icon name="check_circle" size={16} />
      {state.message}
    </p>
  ) : (
    <p role="alert" className="mt-2 text-sm text-error">
      {state.message}
    </p>
  );
}

export function LeadStageForm({ leadId, stage }: { leadId: string; stage: string }) {
  const [state, action, pending] = useActionState(updateLeadStage.bind(null, leadId), null);
  return (
    <form action={action}>
      <label htmlFor="lead-stage" className="label-caps text-slate">
        Stage
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <select id="lead-stage" name="stage" defaultValue={stage} className={`${field} min-h-11 sm:max-w-xs`}>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" disabled={pending} className={primaryBtn}>
          {pending ? "Saving..." : "Update stage"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function LeadNotesForm({ leadId, notes }: { leadId: string; notes: string }) {
  const [state, action, pending] = useActionState(saveLeadNotes.bind(null, leadId), null);
  return (
    <form action={action}>
      <label htmlFor="lead-notes" className="label-caps text-slate">
        Private notes
      </label>
      <textarea
        id="lead-notes"
        name="notes"
        rows={6}
        maxLength={MAX_NOTES_LENGTH}
        defaultValue={notes}
        placeholder="Only you and All Abode staff can see these."
        className={`${field} mt-2 py-2`}
      />
      <div className="mt-3">
        <button type="submit" disabled={pending} className={primaryBtn}>
          {pending ? "Saving..." : "Save notes"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
