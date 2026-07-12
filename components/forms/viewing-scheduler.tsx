"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Field, Input } from "@/components/forms/fields";
import { fetchAvailableSlots, submitViewingBooking } from "@/app/booking-actions";

type Slot = { slotStart: string; slotEnd: string };

function dateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}
function dateLabel(key: string): string {
  return new Date(`${key}T12:00:00+08:00`).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ViewingScheduler({ listingId }: { listingId: string }) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const mountedAt = useRef<number | null>(null);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const to = new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10);
    fetchAvailableSlots(listingId, from, to)
      .then((s) => {
        if (!cancelled) setSlots(s);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load available times — please try again later.");
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const byDate = new Map<string, Slot[]>();
  for (const s of slots ?? []) {
    const key = dateKey(s.slotStart);
    const list = byDate.get(key) ?? [];
    list.push(s);
    byDate.set(key, list);
  }
  const dates = Array.from(byDate.keys()).sort();

  async function handleSubmit() {
    setError("");
    if (!selectedSlot) {
      setError("Please choose a viewing time.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }
    setPending(true);
    try {
      const result = await submitViewingBooking({
        listingId,
        name,
        email,
        phone: phone || undefined,
        slotStart: selectedSlot.slotStart,
        slotEnd: selectedSlot.slotEnd,
        website,
        elapsedMs: mountedAt.current == null ? undefined : Date.now() - mountedAt.current,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
    } catch {
      setError("Couldn't submit your request — please try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-line bg-surface p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-available/10 text-available">
          <Icon name="event_available" size={28} fill={1} />
        </span>
        <p className="mt-3 font-display text-lg font-semibold text-navy">Viewing requested</p>
        <p className="mt-1 text-sm text-slate">
          We&#x2019;ve sent a confirmation to {email}. A licensed agent will confirm your slot shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
      <h3 className="font-display text-lg font-semibold text-navy">Schedule a Viewing</h3>

      {loadError && (
        <p role="alert" className="mt-2 text-sm text-error">
          {loadError}
        </p>
      )}
      {slots === null && !loadError && <p className="mt-2 text-sm text-slate">Loading available times…</p>}
      {slots !== null && dates.length === 0 && (
        <p className="mt-2 text-sm text-slate">
          No open viewing slots right now — please use the inquiry form instead and we&#x2019;ll arrange a time.
        </p>
      )}

      {dates.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {dates.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  selectedDate === d ? "border-navy bg-navy text-white" : "border-line text-navy hover:bg-surface-gray"
                }`}
              >
                {dateLabel(d)}
              </button>
            ))}
          </div>

          {selectedDate && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(byDate.get(selectedDate) ?? []).map((s) => (
                <button
                  key={s.slotStart}
                  type="button"
                  onClick={() => setSelectedSlot(s)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    selectedSlot?.slotStart === s.slotStart
                      ? "border-gold bg-gold/10 text-navy"
                      : "border-line text-navy hover:bg-surface-gray"
                  }`}
                >
                  {timeLabel(s.slotStart)}
                </button>
              ))}
            </div>
          )}

          {selectedSlot && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Mobile / Viber / WhatsApp">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm text-error">
              {error}
            </p>
          )}

          {selectedSlot && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
            >
              {pending ? <Icon name="progress_activity" size={18} className="animate-spin" /> : null}
              {pending ? "Submitting…" : "Request this time"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
