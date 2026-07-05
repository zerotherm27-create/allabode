import type { SupabaseClient } from "@supabase/supabase-js";

export type ViewingStatus = "Requested" | "Confirmed" | "Cancelled" | "Completed" | "No-show";

export const VIEWING_STATUSES: ViewingStatus[] = [
  "Requested",
  "Confirmed",
  "Cancelled",
  "Completed",
  "No-show",
];

export const VIEWING_STATUS_COLOR: Record<ViewingStatus, string> = {
  Requested: "bg-gold/10 text-gold-bright",
  Confirmed: "bg-available/10 text-available",
  Cancelled: "bg-surface-gray text-slate",
  Completed: "bg-navy/10 text-navy",
  "No-show": "bg-sold/10 text-sold",
};

export type AvailableSlot = { slotStart: string; slotEnd: string };

/** Open slot windows for a listing between two dates (YYYY-MM-DD) — no PII. */
export async function getAvailableSlots(
  supabase: SupabaseClient,
  listingId: string,
  fromDate: string,
  toDate: string
): Promise<AvailableSlot[]> {
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_listing_id: listingId,
    p_from: fromDate,
    p_to: toDate,
  });
  if (error || !data) return [];
  return (data as { slot_start: string; slot_end: string }[]).map((s) => ({
    slotStart: s.slot_start,
    slotEnd: s.slot_end,
  }));
}

export async function createViewingBooking(
  supabase: SupabaseClient,
  input: {
    listingId: string;
    name: string;
    email: string;
    phone?: string;
    slotStart: string;
    slotEnd: string;
  }
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase.rpc("create_viewing_booking", {
    p_listing_id: input.listingId,
    p_name: input.name,
    p_email: input.email,
    p_phone: input.phone ?? null,
    p_slot_start: input.slotStart,
    p_slot_end: input.slotEnd,
  });
  if (error) return { error: error.message };
  return { id: data as string };
}
