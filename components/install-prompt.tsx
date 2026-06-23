"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "a2hs-dismissed";

/** Dismissible "install app" affordance. Renders nothing unless installable. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  // { show, isIOS } is detected after mount (client-only) to avoid a hydration mismatch.
  const [ui, setUi] = useState<{ show: boolean; isIOS: boolean }>({ show: false, isIOS: false });

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setUi((s) => ({ ...s, show: true }));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari doesn't fire beforeinstallprompt — show the manual hint immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only detection, post-mount
    setUi({ show: ios, isIOS: ios });

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const { show, isIOS } = ui;
  if (!show) return null;

  const dismiss = () => {
    setUi((s) => ({ ...s, show: false }));
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    setUi((s) => ({ ...s, show: false }));
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4 shadow-[var(--shadow-lift)]">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-navy text-white">
          <Icon name="install_mobile" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy">Install All Abode</p>
          {isIOS && !deferred ? (
            <p className="mt-0.5 text-xs text-slate">
              Tap <Icon name="ios_share" size={14} className="align-text-bottom" /> Share, then
              &ldquo;Add to Home Screen&rdquo;.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate">Add it to your home screen for an app-like experience.</p>
          )}
          {!isIOS && deferred && (
            <button
              type="button"
              onClick={install}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
            >
              <Icon name="download" size={16} /> Install
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-navy"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  );
}
