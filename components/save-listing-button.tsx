"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

const STORAGE_KEY = "allabode:saved-listings";

function readSaved(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Anonymous, client-side "save for later" — no account required. Persists to localStorage only; not synced across devices or to a portal account. */
export function SaveListingButton({ listingId, title }: { listingId: string; title: string }) {
  const [saved, setSaved] = useState(() => readSaved().has(listingId));

  function toggle() {
    const current = readSaved();
    const isSaved = current.has(listingId);
    if (isSaved) {
      current.delete(listingId);
    } else {
      current.add(listingId);
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
    setSaved(!isSaved);
  }

  return (
    <button
      type="button"
      aria-label={saved ? `Remove ${title} from saved listings` : `Save ${title} for later`}
      aria-pressed={saved}
      onClick={toggle}
      className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-navy/70 text-white backdrop-blur-md transition-colors hover:bg-navy-700"
    >
      <Icon name="favorite" size={18} fill={saved ? 1 : 0} className={saved ? "text-gold" : undefined} />
    </button>
  );
}
