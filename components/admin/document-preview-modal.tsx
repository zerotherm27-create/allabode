"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { Icon } from "@/components/icon";

export function DocumentPreviewButton({
  documentId,
  title,
  mimeType,
}: {
  documentId: string;
  title: string;
  mimeType: string | null;
}) {
  const [open, setOpen] = useState(false);
  const src = `/api/portal/documents/${documentId}`;
  const isImage = !!mimeType?.startsWith("image/");

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-navy"
          title="Preview"
        >
          <Icon name="visibility" size={18} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex h-[85vh] w-[90vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <Dialog.Title className="truncate font-display text-sm font-semibold text-navy">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="flex size-8 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-navy" title="Close">
                <Icon name="close" size={18} />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-auto bg-surface-gray">
            {open && isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={title} className="mx-auto max-h-full max-w-full object-contain" />
            ) : open ? (
              <iframe src={src} title={title} className="h-full w-full border-0" />
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
