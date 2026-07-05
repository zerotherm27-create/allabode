"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { setAvailability, type AvailabilityDayInput } from "@/app/admin/viewing-actions";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOT_LENGTHS = [15, 30, 45, 60];

export function AvailabilityForm({ initial }: { initial: AvailabilityDayInput[] }) {
  const [days, setDays] = useState(initial);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function update(i: number, patch: Partial<AvailabilityDayInput>) {
    setSaved(false);
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  async function handleSave() {
    setError("");
    setPending(true);
    try {
      await setAvailability(days);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save availability.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-col gap-4">
        {days.map((d, i) => (
          <div
            key={d.dayOfWeek}
            className="grid grid-cols-1 items-center gap-3 border-b border-line/60 pb-4 last:border-0 last:pb-0 sm:grid-cols-[120px_1fr_1fr_110px]"
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={d.isActive}
                onChange={(e) => update(i, { isActive: e.target.checked })}
                className="h-4 w-4 accent-navy"
              />
              <span className="text-sm font-medium text-navy">{DAY_NAMES[d.dayOfWeek]}</span>
            </label>
            <input
              type="time"
              value={d.startTime}
              disabled={!d.isActive}
              onChange={(e) => update(i, { startTime: e.target.value })}
              className="h-10 rounded-md border border-line bg-surface px-2 text-sm disabled:opacity-50"
            />
            <input
              type="time"
              value={d.endTime}
              disabled={!d.isActive}
              onChange={(e) => update(i, { endTime: e.target.value })}
              className="h-10 rounded-md border border-line bg-surface px-2 text-sm disabled:opacity-50"
            />
            <select
              value={d.slotMinutes}
              disabled={!d.isActive}
              onChange={(e) => update(i, { slotMinutes: Number(e.target.value) })}
              className="h-10 rounded-md border border-line bg-surface px-2 text-sm disabled:opacity-50"
            >
              {SLOT_LENGTHS.map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-error">
          {error}
        </p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
        >
          {pending ? <Icon name="progress_activity" size={18} className="animate-spin" /> : null}
          {pending ? "Saving…" : "Save availability"}
        </button>
        {saved && <span className="text-sm text-available">Saved.</span>}
      </div>
    </div>
  );
}
