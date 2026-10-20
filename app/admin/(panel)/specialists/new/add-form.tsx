"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Field, Input } from "@/components/forms/fields";
import {
  addSpecialist,
  resendSpecialistInviteAction,
  type AddSpecialistState,
  type SpecialistActionState,
} from "@/app/admin/specialist-actions";
import { validateSubdomain } from "@/lib/team/subdomain";
import { NEW_SPECIALIST_LIMITS, validateNewSpecialist } from "@/lib/team/admin-status";

type FieldName = "full_name" | "email" | "phone" | "subdomain" | "tagline";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="press inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-6 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Icon name="progress_activity" size={18} className="animate-spin" />
          Sending invitation…
        </>
      ) : (
        <>
          <Icon name="person_add" size={18} />
          Add specialist
        </>
      )}
    </button>
  );
}

/** Client-side check for one field on blur (the action re-validates everything). */
function checkField(name: FieldName, value: string): string {
  if (name === "subdomain") {
    const r = validateSubdomain(value);
    return r.ok ? "" : r.error;
  }
  const r = validateNewSpecialist({
    full_name: name === "full_name" ? value : "Valid Name",
    email: name === "email" ? value : "valid@example.com",
    phone: name === "phone" ? value : "",
    tagline: name === "tagline" ? value : "",
  });
  return r.ok ? "" : (r.errors[name as keyof typeof r.errors] ?? "");
}

function ResendInvite({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<SpecialistActionState | null>(null);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setResult(await resendSpecialistInviteAction(id)))}
        className="press inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-4 text-sm font-medium text-navy hover:bg-surface-gray disabled:opacity-60"
      >
        <Icon name="send" size={18} />
        {pending ? "Sending…" : "Resend sign-in link"}
      </button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`text-sm ${result.ok ? "text-available" : "text-error"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}

export function AddSpecialistForm() {
  const [state, action] = useActionState<AddSpecialistState | null, FormData>(addSpecialist, null);
  const [blurErrors, setBlurErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [subdomain, setSubdomain] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [dismissed, setDismissed] = useState<AddSpecialistState | null>(null);

  const success = state?.ok && state !== dismissed ? state : null;
  const serverErrors = state && !state.ok && state !== dismissed ? state.errors ?? {} : {};
  // A blur check (even a passing one, "") takes over from the last server error.
  const err = (n: FieldName) => (n in blurErrors ? blurErrors[n] : serverErrors[n]) || undefined;
  const kept = state && !state.ok && state !== dismissed ? state.values ?? {} : {};
  // Read the value before queueing the update: React nulls `currentTarget` once the
  // handler returns, and a functional updater can run later, during render.
  const onBlur = (n: FieldName) => (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setBlurErrors((prev) => ({ ...prev, [n]: checkField(n, value) }));
  };

  if (success) {
    return (
      <div role="status">
        {success.emailSent === false ? (
          <>
            <p role="alert" className="flex items-start gap-2 text-sm font-medium text-error">
              <Icon name="warning" size={20} className="mt-0.5 shrink-0" />
              {success.message}
            </p>
            {success.specialistId && <ResendInvite id={success.specialistId} />}
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 font-display text-lg font-semibold text-navy">
              <Icon name="check_circle" size={22} className="text-navy-700" />
              {success.message}
            </p>
            <p className="mt-3 text-sm text-slate">
              They&rsquo;ll get an email with a link to set their password, then sign in at /portal/login.
              Their profile is already listed on the Team page.
            </p>
          </>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {success.specialistId && (
            <Link
              href={`/admin/specialists/${success.specialistId}`}
              className="press inline-flex min-h-11 items-center rounded-md bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              View specialist
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setDismissed(state);
              setBlurErrors({});
              setSubdomain("");
              setFormKey((k) => k + 1);
            }}
            className="press inline-flex min-h-11 items-center rounded-md border border-line px-5 text-sm font-medium text-navy hover:bg-surface-gray"
          >
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form key={formKey} action={(fd) => { setBlurErrors({}); action(fd); }} noValidate className="flex flex-col gap-5">
      <Field label="Full name" required error={err("full_name")}>
        <Input name="full_name" defaultValue={kept.full_name} autoComplete="off" maxLength={NEW_SPECIALIST_LIMITS.name} onBlur={onBlur("full_name")} />
      </Field>
      <Field
        label="Email"
        required
        hint="We'll create their account and email them a link to set a password."
        error={err("email")}
      >
        <Input name="email" type="email" defaultValue={kept.email} autoComplete="off" maxLength={NEW_SPECIALIST_LIMITS.email} onBlur={onBlur("email")} />
      </Field>
      <Field label="Mobile number" hint="Optional." error={err("phone")}>
        <Input name="phone" type="tel" defaultValue={kept.phone} autoComplete="off" maxLength={NEW_SPECIALIST_LIMITS.phone} onBlur={onBlur("phone")} />
      </Field>
      <Field
        label="Web address"
        required
        hint={`Their page will be ${subdomain.trim().toLowerCase() || "name"}.allabodeph.com (3–30 letters, numbers or hyphens).`}
        error={err("subdomain")}
      >
        <Input
          name="subdomain"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={subdomain}
          onChange={(e) => setSubdomain(e.currentTarget.value)}
          onBlur={onBlur("subdomain")}
        />
      </Field>
      <Field label="Tagline" hint="Optional. One line under their name; they can change it later." error={err("tagline")}>
        <Input name="tagline" defaultValue={kept.tagline} maxLength={NEW_SPECIALIST_LIMITS.tagline} onBlur={onBlur("tagline")} />
      </Field>

      {state && !state.ok && state !== dismissed && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-error">
          <Icon name="error" size={18} className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
