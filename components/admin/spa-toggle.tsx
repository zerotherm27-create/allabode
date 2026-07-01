"use client";

import { useState, useTransition } from "react";
import { toggleSpaAuthorizationReceived } from "@/app/admin/agreement-actions";

export function SpaToggle({ ownerId, initial }: { ownerId: string; initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setChecked(next);
          startTransition(async () => {
            await toggleSpaAuthorizationReceived(ownerId, next);
          });
        }}
        className="h-4 w-4 accent-navy"
      />
      SPA / Authorization Letter received from owner
    </label>
  );
}
