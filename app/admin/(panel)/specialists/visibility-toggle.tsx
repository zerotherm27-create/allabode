"use client";

import { useOptimistic, useState, useTransition } from "react";
import { visibilityCopy } from "@/lib/team/admin-status";
import { setSpecialistVisibility } from "@/app/admin/specialist-actions";

/**
 * Row switch on the specialists list: show or hide one specialist on the public
 * website without opening their profile. It flips instantly and goes back if the
 * save fails (the message shows under it); hiding asks first, same wording as the
 * button on the detail page. Uses the same server action, so the same staff check
 * and the same cache refresh apply. `available` is false until the visibility
 * migration has been run.
 */
export function VisibilityToggle({
  id,
  name,
  visible,
  available,
}: {
  id: string;
  name: string;
  visible: boolean;
  available: boolean;
}) {
  const [shown, setShown] = useOptimistic(visible);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  if (!available) return <span className="text-xs text-slate">Needs migration</span>;

  const copy = visibilityCopy(shown);

  function toggle() {
    if (copy.confirm && !window.confirm(copy.confirm)) return;
    setError("");
    start(async () => {
      setShown(!shown);
      const result = await setSpecialistVisibility(id, !shown);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1 md:items-start">
      <div className="flex items-center gap-2.5">
        <span className={`text-xs font-medium ${shown ? "text-available" : "text-slate"}`}>
          {shown ? "Shown" : "Hidden"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={shown}
          aria-label={`${name} on the website`}
          disabled={pending}
          onClick={toggle}
          className="group -my-2.5 inline-flex min-h-11 min-w-11 items-center justify-center focus-visible:outline-none"
        >
          <span
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-[var(--dur-mid)] group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-navy-700 group-disabled:opacity-60 ${
              shown ? "bg-navy" : "bg-line-strong"
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block size-5 rounded-full bg-surface shadow-sm transition-transform duration-[var(--dur-mid)] ease-[var(--ease-out)] ${
                shown ? "translate-x-[1.375rem]" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      </div>
      {error && (
        <p role="alert" className="max-w-[16rem] text-right text-xs text-error md:text-left">
          {error}
        </p>
      )}
    </div>
  );
}
