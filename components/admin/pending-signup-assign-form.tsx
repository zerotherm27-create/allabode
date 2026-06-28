"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  assignPendingSignupWithState,
  type AssignPendingSignupState,
} from "@/app/admin/pending-signups/actions";

type AssignRole = "owner" | "tenant" | "staff";

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-semibold text-navy hover:bg-surface-gray disabled:cursor-wait disabled:opacity-60"
    >
      {pending && <Icon name="progress_activity" size={14} className="animate-spin" />}
      {pending ? "Assigning..." : label}
    </button>
  );
}

export function PendingSignupAssignForm({
  userId,
  name,
  role,
  label,
}: {
  userId: string;
  name: string;
  role: AssignRole;
  label: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AssignPendingSignupState, FormData>(
    assignPendingSignupWithState,
    {}
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="name" value={name} />
      <SubmitButton label={label} pending={pending} />
      {state.message && !state.ok && (
        <p role="alert" className="max-w-44 text-right text-xs text-error">
          {state.message}
        </p>
      )}
      {state.message && state.ok && (
        <p role="status" className="max-w-44 text-right text-xs text-available">
          {state.message}
        </p>
      )}
    </form>
  );
}
