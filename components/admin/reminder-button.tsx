"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { sendReminder, type ReminderState } from "@/app/admin/reminder-actions";

export function ReminderButton({
  party, personId, itemId,
}: {
  party: "tenant" | "owner";
  personId: string;
  itemId: string;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ReminderState>({});

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending || state.ok}
        onClick={() => start(async () => setState(await sendReminder(party, personId, itemId)))}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-navy px-3 text-xs font-semibold text-navy hover:bg-surface-gray disabled:opacity-60 press"
      >
        <Icon name={state.ok ? "check_circle" : "notifications"} size={16} />
        {pending ? "Sending…" : state.ok ? "Reminder sent" : "Send reminder"}
      </button>
      {state.error && <span role="alert" className="text-xs text-error">{state.error}</span>}
    </span>
  );
}
