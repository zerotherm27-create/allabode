"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

export function ListingShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Share sheet dismissed — not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — nothing more we can do.
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={share}
        aria-label="Share this listing"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-navy transition-colors hover:bg-surface-gray"
      >
        <Icon name="share" size={20} />
      </button>
      {copied && (
        <span
          role="status"
          className="absolute right-0 top-full mt-2 whitespace-nowrap rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white"
        >
          Link copied
        </span>
      )}
    </div>
  );
}
