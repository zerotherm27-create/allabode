"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { LEAD_HONEYPOT_FIELD } from "@/lib/leads/constants";
import type { ContactRequest } from "@/lib/chat/listing-cards";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const CONTACT_METHODS = ["Email", "Phone call", "Viber", "WhatsApp"] as const;

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void }
  ) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Explicit render: the form mounts after page load, so Turnstile's auto-scan would miss it. */
function TurnstileBox({ onToken }: { onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let widgetId: string | undefined;
    let cancelled = false;
    const mount = () => {
      if (cancelled || !ref.current || !window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: onToken,
        "expired-callback": () => onToken(""),
      });
    };
    if (window.turnstile) {
      mount();
    } else {
      let script = document.querySelector<HTMLScriptElement>("script[data-chat-turnstile]");
      if (!script) {
        script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.dataset.chatTurnstile = "1";
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount);
    }
    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [onToken]);
  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} />;
}

const inputClass =
  "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15";

export function ChatLeadForm({
  ctx,
  sent = false,
  onDone,
}: {
  ctx: ContactRequest;
  /** Already submitted earlier (the panel unmounts when closed, so the widget remembers). */
  sent?: boolean;
  onDone: () => void;
}) {
  const [state, setState] = useState<"idle" | "submitting" | "success">(sent ? "success" : "idle");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [token, setToken] = useState("");
  const mountedAt = useRef<number | null>(null);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "submitting") return;
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const errs: Record<string, string> = {};
    if (name.length < 2) errs.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email.";
    if (phone.replace(/\D/g, "").length < 7) errs.phone = "Enter a valid phone number.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    if (!data.get("consent")) {
      setError("Please accept the terms to continue.");
      return;
    }
    if (TURNSTILE_SITE_KEY && !token) {
      setError("Please complete the verification check.");
      return;
    }
    setError("");
    setState("submitting");
    const note = String(data.get("message") ?? "").trim().slice(0, 1000);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "inquiry",
          consent: true,
          // Same single-checkbox consent as the site's other lead forms.
          consentFollowup: true,
          [LEAD_HONEYPOT_FIELD]: data.get(LEAD_HONEYPOT_FIELD),
          elapsedMs: mountedAt.current == null ? undefined : Date.now() - mountedAt.current,
          turnstileToken: token || undefined,
          name,
          email,
          phone,
          message: `[Via website chat] ${note}`.trim(),
          preferredContactMethod: data.get("preferredContactMethod"),
          listing: ctx.listing,
          listingId: ctx.listingId,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Something went wrong.");
      }
      setState("success");
      onDone();
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    }
  }

  if (state === "success") {
    return (
      <div role="status" className="flex items-start gap-2 rounded-md border border-line bg-surface p-3 text-sm text-ink">
        <Icon name="check_circle" size={20} className="mt-0.5 shrink-0 text-navy-700" />
        <p>Thank you! A property specialist will reach out to you within one business day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-2.5 rounded-md border border-line bg-surface p-3">
      <p className="text-sm font-semibold text-ink">
        {ctx.listing ? `Talk to a specialist about ${ctx.listing}` : "Talk to a property specialist"}
      </p>
      {/* Honeypot: hidden from people, same field name the other lead forms use. */}
      <input type="text" name={LEAD_HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div>
        <input name="name" autoComplete="name" placeholder="Full name" aria-label="Full name" aria-invalid={!!fieldErrors.name} maxLength={120} className={inputClass} />
        {fieldErrors.name && <p role="alert" className="mt-1 text-xs text-error">{fieldErrors.name}</p>}
      </div>
      <div>
        <input name="email" type="email" autoComplete="email" placeholder="Email" aria-label="Email" aria-invalid={!!fieldErrors.email} maxLength={254} className={inputClass} />
        {fieldErrors.email && <p role="alert" className="mt-1 text-xs text-error">{fieldErrors.email}</p>}
      </div>
      <div>
        <input name="phone" type="tel" autoComplete="tel" placeholder="Mobile / Viber / WhatsApp" aria-label="Mobile number" aria-invalid={!!fieldErrors.phone} maxLength={30} className={inputClass} />
        {fieldErrors.phone && <p role="alert" className="mt-1 text-xs text-error">{fieldErrors.phone}</p>}
      </div>
      <select name="preferredContactMethod" defaultValue="Email" aria-label="Preferred contact method" className={inputClass}>
        {CONTACT_METHODS.map((m) => (
          <option key={m} value={m}>
            Contact me by {m.toLowerCase()}
          </option>
        ))}
      </select>
      <textarea name="message" rows={2} maxLength={1000} placeholder="Anything we should know? (optional)" aria-label="Message (optional)" className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15" />

      <TurnstileBox onToken={setToken} />

      <label className="flex cursor-pointer items-start gap-2 text-xs text-slate">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm border-line accent-navy" />
        <span>
          I agree to let All Abode collect and process my information to respond to my inquiry, and to receive follow-up
          emails about it from All Abode and the property specialist handling it (every email has an unsubscribe link). See
          the{" "}
          <Link href="/privacy-policy" target="_blank" className="text-navy-700 underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      {error && (
        <p role="alert" className="flex items-center gap-1 text-xs text-error">
          <Icon name="error" size={16} />
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "submitting"}
        className="flex h-10 items-center justify-center gap-2 rounded-md bg-navy px-4 text-sm font-semibold text-white transition-colors duration-[var(--dur-fast)] hover:bg-navy-800 disabled:opacity-60"
      >
        {state === "submitting" ? (
          <>
            <Icon name="progress_activity" size={18} className="animate-spin" />
            Sending…
          </>
        ) : (
          "Request a callback"
        )}
      </button>
    </form>
  );
}
