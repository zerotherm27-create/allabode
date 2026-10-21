"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  saveTemplate,
  sendAdminTestEmail,
  setTemplateActive,
  type TemplateActionState,
} from "@/app/admin/follow-up-actions";
import { MERGE_FIELDS } from "@/lib/nurture/render";
import { renderAdminSample } from "@/lib/nurture/preview";
import {
  AUDIENCE_LABEL,
  AUDIENCES,
  BODY_MAX,
  NAME_MAX,
  SUBJECT_MAX,
  unknownFields,
} from "@/lib/admin/follow-up-templates";

export type EditorTemplate = {
  id: string | null;
  template_key: string;
  name: string;
  subject: string;
  body: string;
  delay_days: number;
  position: number;
  audience: "lead" | "specialist";
  is_active: boolean;
};

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";
const input = `min-h-11 w-full rounded-md border border-line bg-surface px-3 text-base text-ink ${focus}`;
const primaryBtn = `inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 active:bg-navy disabled:opacity-60 ${focus}`;
const secondaryBtn = `inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-semibold text-navy transition-colors hover:bg-surface-gray disabled:opacity-60 ${focus}`;

const FIELD_HELP: Record<string, string> = {
  lead_first_name: "Lead's first name",
  lead_name: "Lead's full name",
  lead_email: "Lead's email",
  lead_phone: "Lead's phone",
  lead_url: "Link to the lead in the specialist dashboard",
  specialist_name: "Property specialist's name",
  specialist_first_name: "Property specialist's first name",
  specialist_phone: "Property specialist's phone",
  specialist_email: "Property specialist's email",
  specialist_page_url: "Link to the specialist's public page",
  listing_title: "Title of the listing they asked about",
  listing_url: "Link to that listing",
  personal_note: "The specialist's own short note (may be blank)",
  site_url: "Website address",
  company_name: "Company name",
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-error">
      {message}
    </p>
  );
}

export function FollowUpTemplateEditor({ template, siteUrl }: { template: EditorTemplate; siteUrl: string }) {
  const router = useRouter();
  const isNew = template.id === null;
  const [state, formAction, saving] = useActionState<TemplateActionState | null, FormData>(saveTemplate, null);

  const [key, setKey] = useState(template.template_key);
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [audience, setAudience] = useState(template.audience);
  const [active, setActive] = useState(template.is_active);
  const [savedActive, setSavedActive] = useState(template.is_active);

  const [testState, setTestState] = useState<TemplateActionState | null>(null);
  const [activeState, setActiveState] = useState<TemplateActionState | null>(null);
  const [testing, startTest] = useTransition();
  const [toggling, startToggle] = useTransition();

  useEffect(() => {
    if (state?.ok && state.savedId) router.replace(`/admin/follow-ups/${state.savedId}`);
  }, [state, router]);

  const unknown = useMemo(
    () => [...new Set([...unknownFields(subject, MERGE_FIELDS), ...unknownFields(body, MERGE_FIELDS)])],
    [subject, body],
  );
  const preview = useMemo(
    () => renderAdminSample({ subject, body }, audience, siteUrl),
    [subject, body, audience, siteUrl],
  );
  const errors = state?.errors ?? {};

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <form action={formAction} className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-5 sm:p-6" noValidate>
        {template.id && <input type="hidden" name="id" value={template.id} />}

        <div>
          <label htmlFor="fu-name" className="text-sm font-medium text-navy">Name</label>
          <input
            id="fu-name" name="name" value={name} maxLength={NAME_MAX} required
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name} aria-describedby={errors.name ? "fu-name-err" : undefined}
            className={`${input} mt-1.5`}
          />
          <FieldError id="fu-name-err" message={errors.name} />
        </div>

        <div>
          <label htmlFor="fu-key" className="text-sm font-medium text-navy">Key</label>
          <input
            id="fu-key" name="template_key" value={key} required readOnly={!isNew}
            onChange={(e) => setKey(e.target.value)}
            aria-invalid={!!errors.template_key} aria-describedby={errors.template_key ? "fu-key-err" : "fu-key-help"}
            className={`${input} mt-1.5 font-mono text-sm ${isNew ? "" : "bg-surface-gray text-slate"}`}
          />
          <p id="fu-key-help" className="mt-1 text-xs text-slate">
            {isNew ? "A short identifier, for example day-3-viewing. It can't be changed later." : "The key can't be changed."}
          </p>
          <FieldError id="fu-key-err" message={errors.template_key} />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="fu-audience" className="text-sm font-medium text-navy">Sent to</label>
            <select
              id="fu-audience" name="audience" value={audience}
              onChange={(e) => setAudience(e.target.value as "lead" | "specialist")}
              aria-invalid={!!errors.audience}
              className={`${input} mt-1.5`}
            >
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>
              ))}
            </select>
            <FieldError id="fu-aud-err" message={errors.audience} />
          </div>
          <div>
            <label htmlFor="fu-delay" className="text-sm font-medium text-navy">Delay (days)</label>
            <input
              id="fu-delay" name="delay_days" type="number" inputMode="numeric" min={0} max={365} step={1}
              defaultValue={template.delay_days} required
              aria-invalid={!!errors.delay_days} aria-describedby={errors.delay_days ? "fu-delay-err" : undefined}
              className={`${input} mt-1.5`}
            />
            <FieldError id="fu-delay-err" message={errors.delay_days} />
          </div>
          <div>
            <label htmlFor="fu-pos" className="text-sm font-medium text-navy">Position</label>
            <input
              id="fu-pos" name="position" type="number" inputMode="numeric" step={1}
              defaultValue={template.position}
              aria-invalid={!!errors.position} aria-describedby={errors.position ? "fu-pos-err" : undefined}
              className={`${input} mt-1.5`}
            />
            <FieldError id="fu-pos-err" message={errors.position} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-slate">
          Delay counts from when the enquiry arrived (0 sends right away). Position only sets the order in lists.
        </p>

        <div>
          <label htmlFor="fu-subject" className="text-sm font-medium text-navy">Subject</label>
          <input
            id="fu-subject" name="subject" value={subject} required
            onChange={(e) => setSubject(e.target.value)}
            aria-invalid={!!errors.subject || subject.length > SUBJECT_MAX}
            aria-describedby={errors.subject ? "fu-subject-err" : "fu-subject-count"}
            className={`${input} mt-1.5`}
          />
          <p id="fu-subject-count" className={`mt-1 text-xs ${subject.length > SUBJECT_MAX ? "text-error" : "text-slate"}`}>
            {subject.length}/{SUBJECT_MAX}
          </p>
          <FieldError id="fu-subject-err" message={errors.subject} />
        </div>

        <div>
          <label htmlFor="fu-body" className="text-sm font-medium text-navy">Body</label>
          <textarea
            id="fu-body" name="body" value={body} rows={14} required
            onChange={(e) => setBody(e.target.value)}
            aria-invalid={!!errors.body || body.length > BODY_MAX}
            aria-describedby={errors.body ? "fu-body-err" : "fu-body-help"}
            className={`${input} mt-1.5 py-2 leading-relaxed`}
          />
          <p id="fu-body-help" className={`mt-1 text-xs ${body.length > BODY_MAX ? "text-error" : "text-slate"}`}>
            Plain text. A blank line starts a new paragraph. Web addresses become links. {body.length.toLocaleString("en-US")}/{BODY_MAX.toLocaleString("en-US")}
          </p>
          <FieldError id="fu-body-err" message={errors.body} />
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-navy">Merge fields</legend>
          <p className="mt-1 text-xs text-slate">
            Type these as written, with double curly braces. Anything else is left blank in the sent email.
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            {MERGE_FIELDS.map((f) => (
              <li key={f} className="text-xs text-slate">
                <code className="rounded bg-surface-gray px-1 py-0.5 font-mono text-navy">{`{{${f}}}`}</code>{" "}
                {FIELD_HELP[f]}
              </li>
            ))}
          </ul>
        </fieldset>

        {unknown.length > 0 && (
          <p role="status" className="flex gap-2 rounded-md border border-reserved/30 bg-reserved/10 px-3 py-2 text-sm text-ink">
            <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-reserved" />
            <span>
              Unknown merge field{unknown.length === 1 ? "" : "s"}: {unknown.map((u) => `{{${u}}}`).join(", ")}. They will be left blank.
            </span>
          </p>
        )}

        <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-navy">
          <input
            type="checkbox" name="is_active" checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className={`size-5 rounded border-line accent-navy ${focus}`}
          />
          Active (this email is sent when it comes due)
        </label>

        {state && !state.ok && (
          <p role="alert" className="flex gap-2 rounded-md border border-error/30 bg-error-bg px-3 py-2 text-sm text-ink">
            <Icon name="error" size={18} className="mt-0.5 shrink-0 text-error" />
            {state.message}
          </p>
        )}
        {state?.ok && (
          <div role="status" className="text-sm text-navy">
            <p className="flex items-center gap-1.5"><Icon name="check_circle" size={16} />{state.message}</p>
            {state.warnings?.map((w) => (
              <p key={w} className="mt-1 text-slate">{w}</p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? "Saving…" : isNew ? "Create email" : "Save changes"}
          </button>
          <button
            type="button" disabled={testing}
            className={secondaryBtn}
            onClick={() =>
              startTest(async () => {
                setTestState(await sendAdminTestEmail({ subject, body, audience }));
              })
            }
          >
            <Icon name="send" size={18} />
            {testing ? "Sending…" : "Send test to me"}
          </button>
          {template.id && (
            <button
              type="button" disabled={toggling}
              className={secondaryBtn}
              onClick={() =>
                startToggle(async () => {
                  const next = !savedActive;
                  const res = await setTemplateActive(template.id as string, next);
                  setActiveState(res);
                  if (res.ok) {
                    setActive(next);
                    setSavedActive(next);
                  }
                })
              }
            >
              {toggling ? "Working…" : savedActive ? "Deactivate" : "Reactivate"}
            </button>
          )}
        </div>
        {testState && (
          <p role={testState.ok ? "status" : "alert"} className={`text-sm ${testState.ok ? "text-navy" : "text-error"}`}>
            {testState.message}
          </p>
        )}
        {activeState && (
          <p role={activeState.ok ? "status" : "alert"} className={`text-sm ${activeState.ok ? "text-navy" : "text-error"}`}>
            {activeState.message}
          </p>
        )}
        {template.id && (
          <p className="text-xs text-slate">
            Emails can be deactivated but not deleted, so the send log keeps its history.
          </p>
        )}
      </form>

      <section aria-labelledby="fu-preview-h" className="h-fit rounded-lg border border-line bg-surface p-5 sm:p-6">
        <h2 id="fu-preview-h" className="font-display text-lg font-semibold text-navy">Preview</h2>
        <p className="mt-1 text-xs text-slate">
          Shown with sample data for a made-up lead and specialist. The text version is shown; the sent email also has a formatted version.
        </p>
        <p className="label-caps mt-4 text-slate">Subject</p>
        <p className="mt-1 break-words text-base font-medium text-ink">{preview.subject || "(empty)"}</p>
        <p className="label-caps mt-4 text-slate">Body</p>
        <pre className="mt-1 whitespace-pre-wrap break-words rounded-md bg-surface-gray p-4 font-body text-sm leading-relaxed text-ink">
          {preview.text}
        </pre>
      </section>
    </div>
  );
}
