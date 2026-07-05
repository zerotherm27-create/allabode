"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { refreshNearbyPlaces } from "@/app/admin/actions";

export function RefreshNearbyPlacesButton({
  listingId,
  lastUpdated,
}: {
  listingId: string;
  lastUpdated?: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleClick() {
    setError("");
    setDone(false);
    setPending(true);
    try {
      const result = await refreshNearbyPlaces(listingId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
    } catch {
      setError("Couldn't refresh nearby places — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-navy disabled:opacity-50"
      >
        <Icon
          name={pending ? "progress_activity" : "travel_explore"}
          size={16}
          className={pending ? "animate-spin" : ""}
        />
        {pending ? "Refreshing…" : "Refresh nearby places"}
      </button>
      {lastUpdated && !pending && (
        <p className="mt-1 text-xs text-slate">
          Last refreshed{" "}
          {new Date(lastUpdated).toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}
      {done && <p className="mt-1 text-xs text-available">Nearby places updated.</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
