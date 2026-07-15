"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

const CONSENT_KEY = "cookie-consent";

/** First-visit cookie notice. Renders nothing once a choice has been recorded. */
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CONSENT_KEY)) return;
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only detection, post-mount
    setShow(true);
  }, []);

  if (!show) return null;

  const respond = (choice: "accepted" | "declined") => {
    setShow(false);
    try {
      localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-[var(--shadow-lift)] sm:flex-row sm:items-center">
        <Icon name="info" size={22} className="hidden shrink-0 text-navy sm:block" />
        <p className="flex-1 text-sm text-slate">
          We use only essential cookies required for account sign-in — no tracking or advertising cookies. See our{" "}
          <a href="/cookie-policy" className="text-navy-700 underline underline-offset-2 hover:text-gold-ink">
            Cookie Policy
          </a>.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => respond("declined")}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:bg-surface-gray"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => respond("accepted")}
            className="rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
