"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";
import { assignInquiry, type AssignInquiryState } from "@/app/admin/inquiry-actions";

export function InquiryAssignForm({
  inquiryId,
  current,
  specialists,
}: {
  inquiryId: string;
  current: string | null;
  specialists: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<AssignInquiryState, FormData>(
    assignInquiry.bind(null, inquiryId),
    { ok: false, message: "" },
  );
  const selectId = `assign-${inquiryId}`;
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="text-xs font-medium text-slate">
          Assigned specialist
        </label>
        <select
          id={selectId}
          name="specialist_id"
          defaultValue={current ?? ""}
          className="h-11 rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
        >
          <option value="">Unassigned</option>
          {specialists.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center gap-1.5 rounded-md border border-line px-4 text-sm font-semibold text-navy hover:bg-surface-gray disabled:cursor-wait disabled:opacity-60"
      >
        {pending && <Icon name="progress_activity" size={16} className="animate-spin" />}
        {pending ? "Saving..." : "Save assignment"}
      </button>
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={`text-xs ${state.ok ? "text-available" : "text-error"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
