"use server";

import { createHash } from "crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAvailableSlots, createViewingBooking, type AvailableSlot } from "@/lib/viewings";
import { sendEmail } from "@/lib/email";
import { LEAD_MIN_SUBMIT_MS } from "@/lib/leads/constants";

const BOOKING_RATE_LIMIT_PER_WINDOW = 5;
const BOOKING_RATE_LIMIT_WINDOW_MINUTES = 30;

const NAME_MAX = 120;
const EMAIL_MAX = 254;
const PHONE_MAX = 30;

function isEmail(v: string): boolean {
  return v.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function escapeHtml(v: string): string {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Reuses the leads rate limiter (already migrated) under a namespaced key — no separate migration needed. */
async function checkBookingRateLimit(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const ip = await clientIp();
  const key = createHash("sha256").update(`booking:${ip}`).digest("hex");
  const { data, error } = await supabase.rpc("lead_rate_limit_check", {
    p_key: key,
    p_limit: BOOKING_RATE_LIMIT_PER_WINDOW,
    p_window_minutes: BOOKING_RATE_LIMIT_WINDOW_MINUTES,
  });
  if (error) return true; // fail open — a broken rate limiter shouldn't block real bookings
  return data === true;
}

export async function fetchAvailableSlots(
  listingId: string,
  fromDate: string,
  toDate: string
): Promise<AvailableSlot[]> {
  const supabase = await createClient();
  return getAvailableSlots(supabase, listingId, fromDate, toDate);
}

export async function submitViewingBooking(input: {
  listingId: string;
  name: string;
  email: string;
  phone?: string;
  slotStart: string;
  slotEnd: string;
  /** Anti-bot signals — see components/forms/viewing-scheduler.tsx. "website" matches
   *  the leads honeypot convention (lib/leads/constants.ts LEAD_HONEYPOT_FIELD) but is
   *  a typed field here rather than a dynamic key, so no shared string constant is needed. */
  website?: string;
  elapsedMs?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // Bot trap: fail silently so an automated client can't tell which check tripped.
  const tripped =
    Boolean(input.website) ||
    (typeof input.elapsedMs === "number" && input.elapsedMs < LEAD_MIN_SUBMIT_MS);
  if (tripped) return { ok: true };

  const name = input.name.trim().slice(0, NAME_MAX);
  if (name.length < 2) return { ok: false, error: "Please enter your name." };
  if (!isEmail(input.email)) return { ok: false, error: "Please enter a valid email." };
  const email = input.email.trim();
  const phone = input.phone?.trim().slice(0, PHONE_MAX) || undefined;

  const supabase = await createClient();

  const allowed = await checkBookingRateLimit(supabase);
  if (!allowed) return { ok: false, error: "Too many requests. Please try again later." };

  const result = await createViewingBooking(supabase, {
    listingId: input.listingId,
    name,
    email,
    phone,
    slotStart: input.slotStart,
    slotEnd: input.slotEnd,
  });
  if ("error" in result) return { ok: false, error: result.error };

  const { data: listing } = await supabase
    .from("listings")
    .select("title")
    .eq("id", input.listingId)
    .maybeSingle();
  const listingTitle = (listing as { title?: string } | null)?.title ?? "the property";

  const when = new Date(input.slotStart).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "full",
    timeStyle: "short",
  });
  await sendEmail({
    to: email,
    subject: `Viewing request received — ${listingTitle}`,
    html:
      `<p>Hi ${escapeHtml(name)},</p>` +
      `<p>We've received your request to view <strong>${escapeHtml(listingTitle)}</strong> on ${when}. ` +
      `A licensed agent will confirm shortly.</p>`,
  });

  return { ok: true };
}
