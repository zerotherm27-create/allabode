"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { confirmUnsubscribe, type UnsubscribeState } from "@/app/unsubscribe/actions";

const initial: UnsubscribeState = { result: null };

export function UnsubscribeConfirmForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(confirmUnsubscribe, initial);

  if (state.result === "done") {
    return (
      <div role="status">
        <h1 className="font-display text-xl font-bold text-navy">You have been unsubscribed</h1>
        <p className="mt-2 text-sm text-slate">
          You will not receive any more follow-up emails about your inquiry. If you need anything, you can still
          reply to a previous email or contact All Abode Property Solutions directly.
        </p>
      </div>
    );
  }

  if (state.result === "invalid") {
    return (
      <div role="alert">
        <h1 className="font-display text-xl font-bold text-navy">This link is not valid</h1>
        <p className="mt-2 text-sm text-slate">
          It may be incomplete. Please use the unsubscribe link from your most recent email, or contact All Abode
          Property Solutions and we will remove you.
        </p>
      </div>
    );
  }

  return (
    <form action={action}>
      <h1 className="font-display text-xl font-bold text-navy">Stop follow-up emails?</h1>
      <p className="mt-2 text-sm text-slate">
        Confirm below and we will stop sending follow-up emails about your inquiry to this address.
      </p>
      <input type="hidden" name="token" value={token} />
      {state.result === "error" ? (
        <p role="alert" className="mt-4 text-sm text-sold">
          Something went wrong on our side. Please try again in a moment.
        </p>
      ) : null}
      <Button type="submit" className="mt-6 min-h-11 w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Unsubscribing..." : "Unsubscribe"}
      </Button>
    </form>
  );
}
