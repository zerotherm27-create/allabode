"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

type State = "hidden" | "off" | "on" | "denied" | "busy";

function keyToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Opt-in lead alerts on this device. Hidden where push isn't supported (e.g. iOS Safari outside the installed app). */
export function EnableAlertsButton() {
  const [state, setState] = useState<State>("hidden");

  useEffect(() => {
    if (!PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (cancelled) return;
        setState(sub ? "on" : Notification.permission === "denied" ? "denied" : "off");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const subscribe = () =>
        reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToUint8Array(PUBLIC_KEY!) });
      const save = (s: PushSubscription) =>
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s.toJSON()),
        });
      let sub = (await reg.pushManager.getSubscription()) ?? (await subscribe());
      let res = await save(sub);
      if (res.status === 409) {
        // This browser was registered by another account: start a fresh subscription for this one.
        await sub.unsubscribe();
        sub = await subscribe();
        res = await save(sub);
      }
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  if (state === "hidden") return null;
  const on = state === "on";
  return (
    <button
      type="button"
      onClick={on ? disable : enable}
      disabled={state === "busy" || state === "denied"}
      title={
        state === "denied"
          ? "Notifications are blocked in your browser settings"
          : on
            ? "Lead alerts are on for this device. Click to turn off."
            : "Get a notification on this device when a new lead arrives"
      }
      className="flex min-h-10 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-navy-700 hover:bg-surface-gray disabled:opacity-60"
    >
      <Icon name={on ? "notifications_active" : "notifications_off"} size={18} />
      <span className="hidden md:inline">{on ? "Alerts on" : state === "denied" ? "Alerts blocked" : "Enable alerts"}</span>
    </button>
  );
}
