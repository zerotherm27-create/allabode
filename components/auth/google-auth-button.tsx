"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";
import { getAuthRedirectUrl } from "@/lib/url";

export function GoogleAuthButton({
  next,
  label = "Continue with Google",
  signOutBefore = false,
  queryParams,
}: {
  next: string;
  label?: string;
  signOutBefore?: boolean;
  queryParams?: Record<string, string>;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function continueWithGoogle() {
    setError("");
    setLoading(true);
    const supabase = createClient();
    if (signOutBefore) await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(next),
        queryParams,
      },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-navy transition-colors hover:bg-surface-gray disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Icon name={loading ? "progress_activity" : "account_circle"} size={20} className={loading ? "animate-spin" : ""} />
        {loading ? "Opening Google..." : label}
      </button>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-error">
          <Icon name="error" size={18} />
          {error}
        </p>
      )}
    </div>
  );
}
