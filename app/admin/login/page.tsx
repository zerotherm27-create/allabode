"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Field, Input } from "@/components/forms/fields";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/admin");
    router.refresh();
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
          <p className="label-caps text-gold">Admin Portal</p>
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold text-navy">
          Sign in
        </h1>
        <p className="mt-2 text-center text-sm text-slate">
          Staff access only.
        </p>

        <div className="mt-7">
          <GoogleAuthButton
            next="/admin"
            label="Continue with Google"
            signOutBefore
            queryParams={{ prompt: "select_account" }}
          />
        </div>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs font-medium uppercase tracking-wider text-slate">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <Field label="Email" required>
            <Input name="email" type="email" autoComplete="email" placeholder="you@allabodeph.com" required />
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
      </div>
    </div>
  );
}
