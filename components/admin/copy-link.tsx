"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

export function CopyLink({ link, ownerName }: { link: string; ownerName?: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the link is still visible/selectable below.
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: "All Abode Property Management Agreement",
        text: `Hi${ownerName ? ` ${ownerName}` : ""}, please review and sign your Property Management Agreement:`,
        url: link,
      });
    } catch {
      // User cancelled the share sheet, or it's unsupported — fall back to copy.
      copy();
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-2 rounded-md border border-line bg-surface-gray px-3 py-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 truncate bg-transparent text-sm text-navy outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
        >
          <Icon name={copied ? "check" : "content_copy"} size={15} />
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      {canShare && (
        <button
          type="button"
          onClick={share}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-navy hover:bg-surface-gray"
        >
          <Icon name="ios_share" size={17} />
          Share via&#x2026;
        </button>
      )}
    </div>
  );
}
