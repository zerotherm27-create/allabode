"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setAutomationRule } from "@/app/admin/automation-actions";

/** Activate / Pause switch for one automation. Flips at once, reverts with a message if the save fails. */
export function AutomationToggle({ code, name, active, warn }: { code: string; name: string; active: boolean; warn?: string }) {
  const [on, setOn] = useOptimistic(active);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function toggle() {
    if (!on) {
      const msg = `Activate "${name}"? ${warn ?? "It will start running automatically on its schedule."}`;
      if (!window.confirm(msg)) return;
    }
    setError("");
    start(async () => {
      setOn(!on);
      const r = await setAutomationRule(code, !on);
      if (!r.ok) setError(r.message);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2.5">
        <span className={`text-xs font-medium ${on ? "text-available" : "text-slate"}`}>{on ? "Active" : "Paused"}</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`${name}: ${on ? "pause" : "activate"}`}
          disabled={pending}
          onClick={toggle}
          className="group -my-2.5 inline-flex min-h-11 min-w-11 items-center justify-center focus-visible:outline-none"
        >
          <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-[var(--dur-mid)] group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-navy-700 group-disabled:opacity-60 ${on ? "bg-navy" : "bg-line-strong"}`}>
            <span aria-hidden="true" className={`inline-block size-5 rounded-full bg-surface shadow-sm transition-transform duration-[var(--dur-mid)] ease-[var(--ease-out)] ${on ? "translate-x-[1.375rem]" : "translate-x-0.5"}`} />
          </span>
        </button>
      </div>
      {error && <p role="alert" className="max-w-[16rem] text-right text-xs text-error">{error}</p>}
    </div>
  );
}
