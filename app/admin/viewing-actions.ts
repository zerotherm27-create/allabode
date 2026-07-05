"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export type AvailabilityDayInput = {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
  slotMinutes: number;
};

/** Replaces the single site-wide weekly schedule wholesale (small admin-configured table). */
export async function setAvailability(days: AvailabilityDayInput[]) {
  const supabase = await createClient();
  const { error: delErr } = await supabase.from("viewing_availability").delete().is("listing_id", null);
  if (delErr) throw new Error(delErr.message);

  const rows = days
    .filter((d) => d.isActive)
    .map((d) => ({
      listing_id: null,
      day_of_week: d.dayOfWeek,
      start_time: d.startTime,
      end_time: d.endTime,
      slot_minutes: d.slotMinutes,
      is_active: true,
    }));
  if (rows.length > 0) {
    const { error } = await supabase.from("viewing_availability").insert(rows);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/admin/viewings/availability");
}

async function loadBookingContact(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
) {
  const { data: booking } = await supabase
    .from("viewing_bookings")
    .select("name, email, slot_start, listing_id")
    .eq("id", id)
    .maybeSingle();
  if (!booking) return null;
  const { data: listing } = await supabase
    .from("listings")
    .select("title")
    .eq("id", booking.listing_id)
    .maybeSingle();
  return { ...booking, listingTitle: listing?.title ?? "the property" };
}

export async function confirmBooking(id: string) {
  const supabase = await createClient();
  const contact = await loadBookingContact(supabase, id);
  const { error } = await supabase.from("viewing_bookings").update({ status: "Confirmed" }).eq("id", id);
  if (error) throw new Error(error.message);

  if (contact) {
    const when = new Date(contact.slot_start).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      dateStyle: "full",
      timeStyle: "short",
    });
    await sendEmail({
      to: contact.email,
      subject: `Viewing confirmed — ${contact.listingTitle}`,
      html: `<p>Hi ${contact.name},</p><p>Your viewing for <strong>${contact.listingTitle}</strong> on ${when} is confirmed. See you then!</p>`,
    });
  }
  revalidatePath("/admin/viewings");
  revalidatePath(`/admin/viewings/${id}`);
}

export async function cancelBooking(id: string) {
  const supabase = await createClient();
  const contact = await loadBookingContact(supabase, id);
  const { error } = await supabase.from("viewing_bookings").update({ status: "Cancelled" }).eq("id", id);
  if (error) throw new Error(error.message);

  if (contact) {
    await sendEmail({
      to: contact.email,
      subject: `Viewing cancelled — ${contact.listingTitle}`,
      html:
        `<p>Hi ${contact.name},</p>` +
        `<p>Unfortunately your requested viewing for <strong>${contact.listingTitle}</strong> has been cancelled. ` +
        `Please get in touch if you&#x2019;d like to arrange another time.</p>`,
    });
  }
  revalidatePath("/admin/viewings");
  revalidatePath(`/admin/viewings/${id}`);
}

export async function completeBooking(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("viewing_bookings").update({ status: "Completed" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/viewings");
  revalidatePath(`/admin/viewings/${id}`);
}
