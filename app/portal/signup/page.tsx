"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Field, Input } from "@/components/forms/fields";
import { createClient } from "@/lib/supabase/client";
import { linkPortalAccount } from "@/app/portal/actions";

export default function PortalSignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    setLoading(true);
    const { data: result, error } = await createClient().auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    // No active session → email confirmation is required for this project.
    if (!result.session) {
      setLoading(false);
      setConfirm(true);
      return;
    }
    const { redirect } = await linkPortalAccount();
    router.replace(redirect);
    router.refresh();
  }

  if (confirm) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-navy px-5">
        <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-available/10 text-available">
            <Icon name="mark_email_read" size={26} />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold text-navy">Check your email</h1>
          <p className="mt-2 text-sm text-slate">
            We sent a confirmation link. Confirm your address, then{" "}
            <Link href="/portal/login" className="font-medium text-navy-700 hover:text-gold">sign in</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy px-5">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-8">
        <div className="flex flex-col items-center gap-2">
          <Image
            src="/logo/logo-primary.png"
            alt="All Abode Property Solutions"
            width={160}
            height={80}
            className="h-16 w-auto"
          />
          <p className="label-caps text-gold">Owner / Tenant Portal</p>
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold text-navy">Create account</h1>
        <p className="mt-2 text-center text-sm text-slate">
          Use the email address All Abode has on file for you.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-5">
          <Field label="Email" required>
            <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          </Field>
          <Field label="Password" required hint="At least 6 characters.">
            <Input name="password" type="password" autoComplete="new-password" placeholder="••••••••" required minLength={6} />
          </Field>
          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-error">
              <Icon name="error" size={18} />
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full">
            {loading ? (
              <>
                <Icon name="progress_activity" size={20} className="animate-spin" />
                Creating…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate">
          Already have an account?{" "}
          <Link href="/portal/login" className="font-medium text-navy-700 hover:text-gold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
