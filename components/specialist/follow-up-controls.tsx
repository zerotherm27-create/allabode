"use client";

import { useActionState, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import {
  savePersonalNote,
  sendTestEmail,
  setFollowUpsEnabled,
  setTemplateEnabled,
  type FollowUpActionState,
} from "@/app/dashboard/specialist/follow-up-actions";
import { MAX_NOTE_LENGTH } from "@/lib/leads/follow-ups";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";
const field = `w-full rounded-md border border-line bg-surface px-3 text-base text-ink ${focus}`;
const primaryBtn = `inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 active:bg-navy disabled:opacity-60 ${focus}`;
const secondaryBtn = `inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-semibold text-navy transition-colors hover:bg-surface-gray disabled:opacity-60 ${focus}`;

function Feedback({ state }: { state: FollowUpActionState | null }) {
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

/** Accessible switch. Saves on click; reverts and shows the error if the save fails. */
function Switch({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex min-h-11 min-w-14 shrink-0 items-center justify-center rounded-md ${focus} disabled:opacity-60`}
    >
      <span
        aria-hidden
        className={`relative block h-6 w-11 shrink-0 overflow-hidden rounded-sm border transition-colors ${
          checked ? "border-navy bg-navy" : "border-line bg-surface-gray"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-4 rounded-sm bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          } ${checked ? "" : "border border-line"}`}
        />
      </span>
    </button>
  );
}

export function MasterSwitch({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [state, setState] = useState<FollowUpActionState | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-base font-semibold text-navy">Automatic follow-up emails</p>
          <p className="mt-1 text-sm text-slate">
            {on
              ? "On. New enquiries get the emails you leave switched on below."
              : "Off. No follow-up emails are sent for your leads."}
          </p>
        </div>
        <Switch
          label="Automatic follow-up emails"
          checked={on}
          disabled={pending}
          onToggle={() => {
            const next = !on;
            setOn(next);
            start(async () => {
              const res = await setFollowUpsEnabled(next);
              setState(res);
              if (!res.ok) setOn(!next);
            });
          }}
        />
      </div>
      <Feedback state={state} />
    </div>
  );
}

export function TemplateToggle({ templateId, name, enabled }: { templateId: string; name: string; enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [state, setState] = useState<FollowUpActionState | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <Switch
        label={`Send "${name}"`}
        checked={on}
        disabled={pending}
        onToggle={() => {
          const next = !on;
          setOn(next);
          start(async () => {
            const res = await setTemplateEnabled(templateId, next);
            setState(res);
            if (!res.ok) setOn(!next);
          });
        }}
      />
      {state && !state.ok && (
        <p role="alert" className="text-sm text-error">
          {state.message}
        </p>
      )}
    </div>
  );
}

export function TestEmailButton({ templateId, disabledReason }: { templateId: string; disabledReason?: string }) {
  const [state, setState] = useState<FollowUpActionState | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        type="button"
        disabled={pending || !!disabledReason}
        title={disabledReason}
        onClick={() =>
          start(async () => {
            setState(null);
            setState(await sendTestEmail(templateId));
          })
        }
        className={secondaryBtn}
      >
        <Icon name="send" size={16} />
        {pending ? "Sending..." : "Send me a test email"}
      </button>
      <Feedback state={state} />
    </div>
  );
}

export function PersonalNoteForm({ note }: { note: string }) {
  const [state, action, pending] = useActionState(savePersonalNote, null);
  const [value, setValue] = useState(note);
  const left = MAX_NOTE_LENGTH - value.length;
  const [touched, setTouched] = useState(false);
  const tooLong = left < 0;
  return (
    <form action={action} noValidate>
      <label htmlFor="personal-note" className="label-caps text-slate">
        Your personal note
      </label>
      <textarea
        id="personal-note"
        name="note"
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={tooLong}
        aria-describedby="personal-note-help personal-note-count"
        placeholder="For example: I'm free for viewings on weekends, just reply to this email."
        className={`${field} mt-2 py-2`}
      />
      <div className="mt-1 flex items-start justify-between gap-4 text-sm">
        <p id="personal-note-help" className="text-slate">
          Added to your emails wherever the template includes it. Leave it empty to skip it.
        </p>
        <p id="personal-note-count" className={tooLong ? "text-error" : "text-slate"}>
          {left} left
        </p>
      </div>
      {touched && tooLong && (
        <p role="alert" className="mt-1 text-sm text-error">
          Keep the note to {MAX_NOTE_LENGTH} characters or fewer.
        </p>
      )}
      <div className="mt-3">
        <button type="submit" disabled={pending || tooLong} className={primaryBtn}>
          {pending ? "Saving..." : "Save note"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
