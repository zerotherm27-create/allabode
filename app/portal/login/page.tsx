"use client";

import { Suspense, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Field, Input } from "@/components/forms/fields";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initError =
    params.get("error") === "link_expired"
      ? "Confirmation link has expired. Please sign in to continue."
      : "";
  const [error, setError] = useState(initError);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    // Navigate to /portal — the server component there runs link_portal_account
    // with a properly refreshed session (via middleware) and redirects to the
    // correct dashboard. Calling a server action here is unreliable because the
    // fresh auth cookie may not be visible to the action in the same request cycle.
    router.replace("/portal");
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
        <h1 className="mt-6 text-center font-display text-2xl font-bold text-navy">Sign in</h1>
        <p className="mt-2 text-center text-sm text-slate">
          For property owners and tenants of All Abode.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-5">
          <Field label="Email" required>
            <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          </Field>
          <Field label="Password" required>
            <Input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
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
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate">
          No account yet?{" "}
          <Link href="/portal/signup" className="font-medium text-navy-700 hover:text-gold">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
