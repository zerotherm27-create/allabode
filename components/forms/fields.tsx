"use client";

import { Icon } from "@/components/icon";
import {
  type ComponentProps,
  type ReactNode,
  createContext,
  useContext,
  useId,
} from "react";

const FieldCtx = createContext<{ id: string; errorId: string; invalid: boolean }>(
  { id: "", errorId: "", invalid: false }
);

const fieldBase =
  "w-full rounded-md border bg-surface px-4 text-base text-ink placeholder:text-slate-soft " +
  "transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] " +
  "focus:outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15 " +
  "disabled:cursor-not-allowed disabled:bg-surface-gray disabled:opacity-60 " +
  "aria-[invalid=true]:border-error aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-error/15";

export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <FieldCtx.Provider value={{ id, errorId, invalid: !!error }}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-navy">
          {label}
          {required && (
            <span className="ml-0.5 text-error" aria-hidden>
              *
            </span>
          )}
        </label>
        {hint && (
          <p id={hintId} className="text-xs text-slate">
            {hint}
          </p>
        )}
        {children}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1 text-sm text-error"
          >
            <Icon name="error" size={16} />
            {error}
          </p>
        )}
      </div>
    </FieldCtx.Provider>
  );
}

export function Input({
  className = "",
  ...props
}: ComponentProps<"input">) {
  const { id, errorId, invalid } = useContext(FieldCtx);
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? errorId : undefined}
      className={`${fieldBase} h-12 ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  rows = 5,
  ...props
}: ComponentProps<"textarea">) {
  const { id, errorId, invalid } = useContext(FieldCtx);
  return (
    <textarea
      id={id}
      rows={rows}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? errorId : undefined}
      className={`${fieldBase} resize-y py-3 ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: ComponentProps<"select">) {
  const { id, errorId, invalid } = useContext(FieldCtx);
  return (
    <div className="relative">
      <select
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        className={`${fieldBase} h-12 appearance-none pr-10 ${className}`}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate">
        <Icon name="expand_more" size={20} />
      </span>
    </div>
  );
}
