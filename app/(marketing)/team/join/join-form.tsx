"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Field, Input } from "@/components/forms/fields";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/url";
import { validateSubdomain } from "@/lib/team/subdomain";

type Mode = "own" | "under_broker";
type Errors = Partial<Record<"full_name" | "email" | "password" | "phone" | "subdomain" | "license_no", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function check(name: keyof Errors, value: string, mode: Mode): string {
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
    case "subdomain": {
      const r = validateSubdomain(value);
      return r.ok ? "" : r.error;
    }
    case "license_no":
      return mode === "own" && v.length < 3 ? "Enter your PRC licence number." : "";
  }
}

export function JoinForm() {
  const [mode, setMode] = useState<Mode>("own");
  const [errors, setErrors] = useState<Errors>({});
  const [subdomain, setSubdomain] = useState("");
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
    return (e: React.FocusEvent<HTMLInputElement>) => setErr(name, check(name, e.target.value, mode));
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
    const names: (keyof Errors)[] = ["full_name", "email", "password", "phone", "subdomain", "license_no"];
    const next: Errors = {};
    for (const n of names) {
      const msg = check(n, get(n), mode);
      if (msg) next[n] = msg;
    }
    setErrors(next);
    if (Object.keys(next).length) {
      const first = names.find((n) => next[n]);
      (e.currentTarget.elements.namedItem(first!) as HTMLElement | null)?.focus();
      return;
    }
    const sub = validateSubdomain(get("subdomain"));
    if (!sub.ok) return;

    setLoading(true);
    const { error } = await createClient().auth.signUp({
      email: get("email").trim(),
      password: get("password"),
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        data: {
          specialist_application: true,
          full_name: get("full_name").trim(),
          phone: get("phone").trim(),
          requested_subdomain: sub.value,
          license_mode: mode,
          license_no: mode === "own" ? get("license_no").trim() : "",
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
          We sent a confirmation link. Confirm your address, then{" "}
          <Link href="/portal/login" className="font-medium text-navy-700 hover:text-gold">sign in</Link>.
          Your application stays pending until our team approves it.
        </p>
        <p className="mt-3 text-sm text-slate">
          Already have an account?{" "}
          <Link href="/portal/login" className="font-medium text-navy-700 hover:text-gold">Sign in</Link>
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
          You are signed in as {signedInAs}. Apply with a different email address, or sign out first.
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

  const radio =
    "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-line px-4 py-2 text-sm text-ink " +
    "transition-colors hover:border-navy-700 has-[:checked]:border-navy has-[:checked]:bg-surface-gray " +
    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus";

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={checking} className="flex flex-col gap-5">
      <fieldset disabled={checking} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
        <Field label="Full name" required error={errors.full_name}>
          <Input name="full_name" autoComplete="name" placeholder="Ram Santos" onBlur={onBlur("full_name")} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" onBlur={onBlur("email")} />
        </Field>
        <Field label="Password" required hint="At least 6 characters." error={errors.password}>
          <Input name="password" type="password" autoComplete="new-password" onBlur={onBlur("password")} />
        </Field>
        <Field label="Mobile number" required error={errors.phone}>
          <Input name="phone" type="tel" autoComplete="tel" placeholder="0917 123 4567" onBlur={onBlur("phone")} />
        </Field>
        <Field
          label="Requested web address"
          required
          hint={`Your page will be ${subdomain.trim().toLowerCase() || "yourname"}.allabodeph.com`}
          error={errors.subdomain}
        >
          <Input
            name="subdomain"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="ramsantos"
            value={subdomain}
            onChange={(e) => {
              setSubdomain(e.target.value);
              if (e.target.value || errors.subdomain) setErr("subdomain", check("subdomain", e.target.value, mode));
            }}
            onBlur={onBlur("subdomain")}
          />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium text-navy">Licence</legend>
          <label className={radio}>
            <input type="radio" name="license_mode" value="own" checked={mode === "own"}
              onChange={() => setMode("own")} className="size-4 accent-navy" />
            I hold my own PRC licence
          </label>
          <label className={radio}>
            <input type="radio" name="license_mode" value="under_broker" checked={mode === "under_broker"}
              onChange={() => { setMode("under_broker"); setErr("license_no", ""); }} className="size-4 accent-navy" />
            I am accredited under a licensed broker
          </label>
      </fieldset>

      {mode === "own" && (
        <Field label="PRC licence number" required error={errors.license_no}>
          <Input name="license_no" autoComplete="off" onBlur={onBlur("license_no")} />
        </Field>
      )}

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
            Sending
          </>
        ) : (
          "Submit application"
        )}
      </Button>
      </fieldset>

      <p className="text-center text-sm text-slate">
        Already applied?{" "}
        <Link href="/portal/login" className="font-medium text-navy-700 hover:text-gold">Sign in</Link>
      </p>
    </form>
  );
}
