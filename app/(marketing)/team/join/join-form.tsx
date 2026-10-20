"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Field, Input } from "@/components/forms/fields";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/url";

type Errors = Partial<Record<"full_name" | "email" | "password" | "phone", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function check(name: keyof Errors, value: string): string {
  const v = value.trim();
  switch (name) {
    case "full_name":
      return v.length < 2 ? "Enter your full name." : "";
    case "email":
      return EMAIL_RE.test(v) ? "" : "Enter a valid email address.";
    case "password":
      return value.length < 6 ? "Use at least 6 characters." : "";
    case "phone":
      return v.replace(/\D/g, "").length < 10 ? "Enter a mobile number with at least 10 digits." : "";
  }
}

export function JoinForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    Promise.resolve()
      .then(() => createClient().auth.getUser())
      .then(({ data }) => setSignedInAs(data.user?.email ?? (data.user ? "your account" : null)))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  function setErr(name: keyof Errors, msg: string) {
    setErrors((prev) => ({ ...prev, [name]: msg || undefined }));
  }

  function onBlur(name: keyof Errors) {
    return (e: React.FocusEvent<HTMLInputElement>) => setErr(name, check(name, e.target.value));
  }

  async function signOut() {
    setSignOutError("");
    setSigningOut(true);
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      setSignedInAs(null);
    } catch {
      setSignOutError("Could not sign out. Try again.");
    } finally {
      setSigningOut(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    const names: (keyof Errors)[] = ["full_name", "email", "password", "phone"];
    const next: Errors = {};
    for (const n of names) {
      const msg = check(n, get(n));
      if (msg) next[n] = msg;
    }
    setErrors(next);
    if (Object.keys(next).length) {
      const first = names.find((n) => next[n]);
      (e.currentTarget.elements.namedItem(first!) as HTMLElement | null)?.focus();
      return;
    }

    setLoading(true);
    const { error } = await createClient().auth.signUp({
      email: get("email").trim(),
      password: get("password"),
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        // Only for display; the account is linked to the invitation by its
        // confirmed email (link_specialist_account), never by this metadata.
        data: {
          full_name: get("full_name").trim(),
          phone: get("phone").trim(),
        },
      },
    });
    setLoading(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setConfirm(true);
  }

  if (confirm) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-available/10 text-available">
          <Icon name="mark_email_read" size={26} />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-navy">Check your email</h2>
        <p className="mt-2 text-sm text-slate">
          Check your email to confirm, then{" "}
          <Link href="/portal/login" className="font-medium text-navy-700 hover:text-gold">sign in</Link>.
          Your specialist account opens once your email is confirmed.
        </p>
      </div>
    );
  }

  if (signedInAs) {
    return (
      <div role="status" className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-gold/15 text-gold-ink">
          <Icon name="person" size={26} />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-navy">You are already signed in</h2>
        <p className="mt-2 text-sm text-slate">
          You are signed in as {signedInAs}. To activate a different invitation, sign out first.
        </p>
        <Button type="button" variant="ghost" size="lg" className="mt-6 w-full" onClick={signOut} disabled={signingOut}>
          {signingOut ? (
            <>
              <Icon name="progress_activity" size={20} className="animate-spin" />
              Signing out
            </>
          ) : (
            "Sign out"
          )}
        </Button>
        {signOutError && (
          <p role="alert" className="mt-3 flex items-center justify-center gap-1.5 text-sm text-error">
            <Icon name="error" size={18} />
            {signOutError}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={checking} className="flex flex-col gap-5">
      <fieldset disabled={checking} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
        <Field label="Full name" required error={errors.full_name}>
          <Input name="full_name" autoComplete="name" placeholder="Ram Santos" onBlur={onBlur("full_name")} />
        </Field>
        <Field label="Email" required hint="Use the email address you gave All Abode." error={errors.email}>
          <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" onBlur={onBlur("email")} />
        </Field>
        <Field label="Password" required hint="At least 6 characters." error={errors.password}>
          <Input name="password" type="password" autoComplete="new-password" onBlur={onBlur("password")} />
        </Field>
        <Field label="Mobile number" required error={errors.phone}>
          <Input name="phone" type="tel" autoComplete="tel" placeholder="0917 123 4567" onBlur={onBlur("phone")} />
        </Field>
      {formError && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-error">
          <Icon name="error" size={18} />
          {formError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Icon name="progress_activity" size={20} className="animate-spin" />
            Activating
          </>
        ) : (
          "Activate account"
        )}
      </Button>
      </fieldset>

      <p className="text-center text-sm text-slate">
        Already activated?{" "}
        <Link href="/portal/login" className="font-medium text-navy-700 hover:text-gold">Sign in</Link>
      </p>
      <p className="rounded-md bg-surface-gray px-4 py-3 text-center text-sm text-slate">
        Not invited yet? Interested in joining?{" "}
        <Link href="/contact" className="font-medium text-navy-700 hover:text-gold">Contact us</Link>
      </p>
    </form>
  );
}
