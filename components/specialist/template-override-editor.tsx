"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import {
  resetTemplateOverride,
  saveTemplateOverride,
  type FollowUpActionState,
} from "@/app/dashboard/specialist/follow-up-actions";
import { MERGE_FIELDS } from "@/lib/nurture/render";
import { renderSample, type PreviewSpecialist } from "@/lib/nurture/preview";
import {
  OVERRIDE_BODY_MAX,
  OVERRIDE_SUBJECT_MAX,
  parseOverrideInput,
} from "@/lib/nurture/override-validate";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";
const field = `w-full rounded-md border bg-surface px-3 text-base text-ink ${focus}`;
const primaryBtn = `inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 active:bg-navy disabled:opacity-60 ${focus}`;
const secondaryBtn = `inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-semibold text-navy transition-colors hover:bg-surface-gray disabled:opacity-60 ${focus}`;

const FIELD_HELP: Record<string, string> = {
  lead_first_name: "Customer's first name",
  lead_name: "Customer's full name",
  lead_email: "Customer's email",
  lead_phone: "Customer's phone",
  lead_url: "Link to the lead in your dashboard",
  specialist_name: "Your name",
  specialist_first_name: "Your first name",
  specialist_phone: "Your phone",
  specialist_email: "Your email",
  specialist_page_url: "Your public profile page",
  listing_title: "Listing they asked about",
  listing_url: "Link to that listing",
  personal_note: "Your personal note",
  site_url: "All Abode website",
  company_name: "All Abode Property Solutions",
};

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

export function EditedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-gold/50 bg-cream px-2 py-0.5 text-xs font-semibold text-navy">
      <Icon name="edit" size={14} />
      Edited by you
    </span>
  );
}

export function TemplateOverrideEditor({
  templateId,
  owner,
  override,
  specialist,
  note,
  siteUrl,
  unavailable,
}: {
  templateId: string;
  owner: { subject: string; body: string };
  override: { subject: string; body: string } | null;
  specialist: PreviewSpecialist;
  note: string;
  /** Public site URL from the server (keeps the server and browser previews identical). */
  siteUrl: string;
  /** The overrides table isn't there yet (migration not run). */
  unavailable?: boolean;
}) {
  const [subject, setSubject] = useState(override?.subject ?? owner.subject);
  const [body, setBody] = useState(override?.body ?? owner.body);
  const [touched, setTouched] = useState({ subject: false, body: false });
  const [hasOwn, setHasOwn] = useState(!!override);
  const [state, action, saving] = useActionState(async (prev: FollowUpActionState | null, fd: FormData) => {
    const res = await saveTemplateOverride(prev, fd);
    if (res.ok) setHasOwn(true);
    return res;
  }, null);
  const [confirming, setConfirming] = useState(false);
  const [resetState, setResetState] = useState<FollowUpActionState | null>(null);
  const [resetting, startReset] = useTransition();

  const check = useMemo(() => parseOverrideInput({ subject, body }, MERGE_FIELDS), [subject, body]);
  const localErrors = check.ok ? {} : check.errors;
  const subjectError = (touched.subject && localErrors.subject) || state?.errors?.subject;
  const bodyError = (touched.body && localErrors.body) || state?.errors?.body;

  const preview = useMemo(
    () => renderSample({ subject, body }, specialist, note, { specialistVersion: true, siteUrl }),
    [subject, body, specialist, note, siteUrl],
  );

  if (unavailable) {
    return (
      <p role="status" className="text-sm text-slate">
        Writing your own version isn&apos;t switched on yet. You&apos;ll be able to do it here once it is.
      </p>
    );
  }

  const id = `ov-${templateId}`;
  return (
    <div>
      <form action={action} noValidate>
        <input type="hidden" name="template_id" value={templateId} />
        <p className="text-sm text-slate">
          Your version is used only for your own leads. All Abode adds the unsubscribe link and company details at
          the bottom of every email; they can&apos;t be changed. Plain text only: links you type stay as text.
        </p>

        <label htmlFor={`${id}-subject`} className="label-caps mt-4 block text-slate">
          Subject
        </label>
        <input
          id={`${id}-subject`}
          name="subject"
          type="text"
          value={subject}
          maxLength={OVERRIDE_SUBJECT_MAX + 50}
          onChange={(e) => setSubject(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, subject: true }))}
          aria-invalid={!!subjectError}
          aria-describedby={`${id}-subject-count${subjectError ? ` ${id}-subject-err` : ""}`}
          className={`${field} mt-2 min-h-11 ${subjectError ? "border-error" : "border-line"}`}
        />
        <p id={`${id}-subject-count`} className={`mt-1 text-right text-sm ${subject.trim().length > OVERRIDE_SUBJECT_MAX ? "text-error" : "text-slate"}`}>
          {subject.trim().length} / {OVERRIDE_SUBJECT_MAX}
        </p>
        {subjectError && (
          <p id={`${id}-subject-err`} role="alert" className="text-sm text-error">
            {subjectError}
          </p>
        )}

        <label htmlFor={`${id}-body`} className="label-caps mt-4 block text-slate">
          Message
        </label>
        <textarea
          id={`${id}-body`}
          name="body"
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, body: true }))}
          aria-invalid={!!bodyError}
          aria-describedby={`${id}-body-count ${id}-fields${bodyError ? ` ${id}-body-err` : ""}`}
          className={`${field} mt-2 py-2 ${bodyError ? "border-error" : "border-line"}`}
        />
        <p id={`${id}-body-count`} className={`mt-1 text-right text-sm ${body.trim().length > OVERRIDE_BODY_MAX ? "text-error" : "text-slate"}`}>
          {body.trim().length.toLocaleString("en-US")} / {OVERRIDE_BODY_MAX.toLocaleString("en-US")}
        </p>
        {bodyError && (
          <p id={`${id}-body-err`} role="alert" className="text-sm text-error">
            {bodyError}
          </p>
        )}

        <details className="mt-3 rounded-md border border-line">
          <summary className={`flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-semibold text-navy ${focus}`}>
            <Icon name="info" size={16} />
            Merge fields you can use
          </summary>
          <ul id={`${id}-fields`} className="grid gap-x-4 gap-y-1 border-t border-line p-3 text-sm sm:grid-cols-2">
            {MERGE_FIELDS.map((f) => (
              <li key={f} className="min-w-0">
                <code className="break-all font-mono text-xs text-navy">{`{{${f}}}`}</code>
                <span className="text-slate"> {FIELD_HELP[f] ?? ""}</span>
              </li>
            ))}
          </ul>
        </details>

        <div className="mt-4 rounded-md border border-line bg-cream p-4">
          <p className="label-caps text-slate">Preview with sample details</p>
          <p className="mt-2 break-words text-sm font-medium text-ink">{preview.subject}</p>
          <pre className="mt-2 whitespace-pre-wrap break-words font-body text-sm text-ink">{preview.text}</pre>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="submit" disabled={saving || !check.ok} className={primaryBtn}>
            {saving ? "Saving..." : "Save my version"}
          </button>
          {hasOwn && !confirming && (
            <button type="button" onClick={() => setConfirming(true)} disabled={resetting} className={secondaryBtn}>
              <Icon name="undo" size={16} />
              Use All Abode&apos;s version
            </button>
          )}
        </div>
        <Feedback state={state} />
      </form>

      {hasOwn && confirming && (
        <div role="group" aria-label="Confirm going back" className="mt-3 rounded-md border border-line bg-surface-gray p-3">
          <p className="text-sm text-ink">Delete your version and use All Abode&apos;s email for your leads again?</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={resetting}
              className={primaryBtn}
              onClick={() =>
                startReset(async () => {
                  const res = await resetTemplateOverride(templateId);
                  setResetState(res);
                  if (res.ok) {
                    setHasOwn(false);
                    setSubject(owner.subject);
                    setBody(owner.body);
                    setTouched({ subject: false, body: false });
                  }
                  setConfirming(false);
                })
              }
            >
              {resetting ? "Switching..." : "Yes, use All Abode's version"}
            </button>
            <button type="button" disabled={resetting} onClick={() => setConfirming(false)} className={secondaryBtn}>
              Keep mine
            </button>
          </div>
        </div>
      )}
      <Feedback state={resetState} />
    </div>
  );
}
