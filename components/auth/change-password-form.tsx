"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Field, Input } from "@/components/forms/fields";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    form.reset();
    setSuccess("Password updated successfully.");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-5">
      <Field label="New password" required hint="Use at least 6 characters.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={6} />
      </Field>
      <Field label="Confirm new password" required>
        <Input name="confirmPassword" type="password" autoComplete="new-password" required minLength={6} />
      </Field>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-error">
          <Icon name="error" size={18} />
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="flex items-center gap-1.5 text-sm text-available">
          <Icon name="check_circle" size={18} fill={1} />
          {success}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full sm:w-auto">
        {loading ? (
          <>
            <Icon name="progress_activity" size={20} className="animate-spin" />
            Updating...
          </>
        ) : (
          "Update password"
        )}
      </Button>
    </form>
  );
}
