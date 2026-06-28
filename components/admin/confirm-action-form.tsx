"use client";

import type { ReactNode } from "react";

export function ConfirmActionForm({
  action,
  message,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        if (!confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
