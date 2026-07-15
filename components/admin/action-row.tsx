"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { Icon } from "@/components/icon";

type RunOpts = { pendingLabel?: string };

type ActionRowContextValue = {
  isPending: boolean;
  pendingKey: string | null;
  pendingLabel: string | null;
  run: (key: string, fn: () => Promise<void> | void, opts?: RunOpts) => void;
};

const ActionRowContext = createContext<ActionRowContextValue | null>(null);

function useActionRow(): ActionRowContextValue {
  const ctx = useContext(ActionRowContext);
  if (!ctx) throw new Error("ActionButton/ActionForm must be used inside <ActionRow>");
  return ctx;
}

/** Shares one pending flag across every ActionButton/ActionForm in its subtree, so
 *  clicking one locks the rest instead of leaving them clickable mid-action. */
export function ActionRow({ children }: { children: ReactNode }) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [isTransitionPending, startTransition] = useTransition();

  const run = (key: string, fn: () => Promise<void> | void, opts?: RunOpts) => {
    setPendingKey(key);
    setPendingLabel(opts?.pendingLabel ?? null);
    startTransition(async () => {
      try {
        await fn();
      } finally {
        setPendingKey(null);
        setPendingLabel(null);
      }
    });
  };

  return (
    <ActionRowContext.Provider
      value={{ isPending: isTransitionPending, pendingKey, pendingLabel, run }}
    >
      {children}
    </ActionRowContext.Provider>
  );
}

const disabledCls = "disabled:opacity-50 disabled:cursor-not-allowed";

/** Zero-extra-field action button (e.g. someAction.bind(null, id)). */
export function ActionButton({
  actionKey,
  action,
  label,
  icon,
  className,
  pendingLabel,
  confirmMessage,
}: {
  actionKey: string;
  action: () => Promise<void> | void;
  label: string;
  icon?: string;
  className: string;
  pendingLabel?: string;
  confirmMessage?: string;
}) {
  const { isPending, pendingKey, run } = useActionRow();
  const thisPending = pendingKey === actionKey;
  const shownLabel = thisPending ? pendingLabel ?? "Working…" : label;

  return (
    <button
      type="button"
      disabled={isPending}
      className={`${className} ${disabledCls}`}
      onClick={() => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        run(actionKey, action, { pendingLabel });
      }}
    >
      {thisPending ? (
        <Icon name="progress_activity" size={18} className="animate-spin" />
      ) : (
        icon && <Icon name={icon} size={18} />
      )}
      {shownLabel}
    </button>
  );
}

const ActionFormContext = createContext<{ actionKey: string; pendingLabel?: string } | null>(null);

/** Action that needs extra field(s) read from sibling inputs at submit time
 *  (e.g. a "reason" text input next to the submit button). */
export function ActionForm({
  actionKey,
  action,
  className,
  confirmMessage,
  pendingLabel,
  children,
}: {
  actionKey: string;
  action: (formData: FormData) => Promise<void> | void;
  className?: string;
  confirmMessage?: string;
  pendingLabel?: string;
  children: ReactNode;
}) {
  const { run } = useActionRow();

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        const fd = new FormData(e.currentTarget);
        run(actionKey, () => action(fd), { pendingLabel });
      }}
    >
      <ActionFormContext.Provider value={{ actionKey, pendingLabel }}>
        {children}
      </ActionFormContext.Provider>
    </form>
  );
}

/** Submit button for use inside <ActionForm> — shares the row's pending lock. */
export function ActionSubmitButton({
  label,
  icon,
  className,
}: {
  label: string;
  icon?: string;
  className: string;
}) {
  const { isPending, pendingKey } = useActionRow();
  const formCtx = useContext(ActionFormContext);
  if (!formCtx) throw new Error("ActionSubmitButton must be used inside <ActionForm>");
  const thisPending = pendingKey === formCtx.actionKey;
  const shownLabel = thisPending ? formCtx.pendingLabel ?? "Working…" : label;

  return (
    <button type="submit" disabled={isPending} className={`${className} ${disabledCls}`}>
      {thisPending ? (
        <Icon name="progress_activity" size={18} className="animate-spin" />
      ) : (
        icon && <Icon name={icon} size={18} />
      )}
      {shownLabel}
    </button>
  );
}
