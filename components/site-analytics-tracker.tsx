"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getConsent, CONSENT_EVENT } from "@/lib/cookie-consent";

const HEARTBEAT_INTERVAL_MS = 15_000;

function recordVisit(path: string) {
  try {
    const utmSource = new URLSearchParams(window.location.search).get("utm_source") || undefined;
    fetch("/api/site/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, referrer: document.referrer, utmSource }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never let analytics break a real page load
  }
}

function sendHeartbeat() {
  try {
    navigator.sendBeacon?.("/api/site/heartbeat");
  } catch {
    // ignore
  }
}

/** Mounted once in the root layout. Self-excludes the admin panel — staff
 *  browsing their own dashboard shouldn't inflate visitor analytics — and,
 *  like the GA/Meta Analytics component, only runs once the visitor has
 *  accepted cookies via the CookieConsent banner. */
export function SiteAnalyticsTracker() {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = () => setAllowed(getConsent() === "accepted");
    check();
    window.addEventListener(CONSENT_EVENT, check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener(CONSENT_EVENT, check);
      window.removeEventListener("storage", check);
    };
  }, []);

  const excluded = !allowed || (pathname?.startsWith("/admin") ?? false);

  useEffect(() => {
    if (excluded) return;
    recordVisit(pathname);
  }, [pathname, excluded]);

  useEffect(() => {
    if (excluded) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    const onHide = () => {
      if (document.visibilityState === "hidden") sendHeartbeat();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", sendHeartbeat);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", sendHeartbeat);
    };
  }, [excluded]);

  return null;
}
