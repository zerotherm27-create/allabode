"use server";

import { createClient } from "@/lib/supabase/server";
import { getAvailableSlots, createViewingBooking, type AvailableSlot } from "@/lib/viewings";
import { sendEmail } from "@/lib/email";

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
  listingTitle: string;
  name: string;
  email: string;
  phone?: string;
  slotStart: string;
  slotEnd: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const result = await createViewingBooking(supabase, input);
  if ("error" in result) return { ok: false, error: result.error };

  const when = new Date(input.slotStart).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "full",
    timeStyle: "short",
  });
  await sendEmail({
    to: input.email,
    subject: `Viewing request received — ${input.listingTitle}`,
    html:
      `<p>Hi ${input.name},</p>` +
      `<p>We've received your request to view <strong>${input.listingTitle}</strong> on ${when}. ` +
      `A licensed agent will confirm shortly.</p>`,
  });

  return { ok: true };
}
