"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

function FacebookLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z" />
    </svg>
  );
}

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

  function shareToFacebook() {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=520");
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={shareToFacebook}
        aria-label="Share this listing on Facebook"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-navy transition-colors hover:bg-surface-gray"
      >
        <FacebookLogo size={20} />
      </button>
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
    </div>
  );
}
