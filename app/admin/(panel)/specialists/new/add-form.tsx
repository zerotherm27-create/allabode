"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Field, Input } from "@/components/forms/fields";
import { addSpecialist, type AddSpecialistState } from "@/app/admin/specialist-actions";
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
          Adding…
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

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
      <p className="min-w-0 flex-1 select-all break-words rounded-md border border-line bg-cream px-3 py-2 text-sm text-ink">
        {text}
      </p>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => setCopied(false));
        }}
        className="press inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-line px-4 text-sm font-medium text-navy hover:bg-surface-gray"
      >
        <Icon name={copied ? "check_circle" : "content_copy"} size={18} />
        {copied ? "Copied" : "Copy"}
      </button>
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
  const onBlur = (n: FieldName) => (e: React.FocusEvent<HTMLInputElement>) =>
    setBlurErrors((prev) => ({ ...prev, [n]: checkField(n, e.currentTarget.value) }));

  if (success) {
    return (
      <div role="status">
        <p className="flex items-center gap-2 font-display text-lg font-semibold text-navy">
          <Icon name="check_circle" size={22} className="text-navy-700" />
          {success.message}
        </p>
        <p className="mt-3 text-sm text-slate">Send them these activation instructions:</p>
        {success.instructions && <CopyLine text={success.instructions} />}
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
        hint="They must sign up at /team/join with exactly this address."
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
