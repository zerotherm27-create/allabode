"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Field, Input } from "@/components/forms/fields";
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
    const { error } = await createClient().auth.signInWithPassword({
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
        <div className="text-center">
          <span className="font-display text-xl font-bold text-navy">
            All Abode
            <span className="text-gold">.</span>
          </span>
          <p className="label-caps mt-1 text-gold">Admin</p>
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold text-navy">
          Sign in
        </h1>
        <p className="mt-2 text-center text-sm text-slate">
          Staff access only.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-5">
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
