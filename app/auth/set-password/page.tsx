"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Field, Input } from "@/components/forms/fields";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.replace("/dashboard/owner");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy px-5">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-8">
        <div className="flex flex-col items-center gap-2">
          <Image src="/logo/logo-primary.png" alt="All Abode Property Solutions" width={160} height={80} className="h-16 w-auto" />
          <p className="label-caps text-gold">Owner Portal</p>
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold text-navy">Set your password</h1>
        <p className="mt-2 text-center text-sm text-slate">
          Your account is ready. Choose a password to access your owner dashboard.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-5">
          <Field label="New password" required>
            <Input name="password" type="password" autoComplete="new-password" required />
          </Field>
          <Field label="Confirm password" required>
            <Input name="confirm" type="password" autoComplete="new-password" required />
          </Field>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
            {loading ? "Saving…" : "Set password and continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
