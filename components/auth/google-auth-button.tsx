"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";
import { getAuthRedirectUrl } from "@/lib/url";

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.7 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C39.5 37.5 44 31.5 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}

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
        {loading ? (
          <Icon name="progress_activity" size={20} className="animate-spin" />
        ) : (
          <GoogleLogo size={20} />
        )}
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
