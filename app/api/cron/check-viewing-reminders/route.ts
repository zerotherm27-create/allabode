import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyCronSecret, logCronRun } from "@/lib/cron";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

type Booking = {
  id: string;
  name: string;
  email: string;
  slot_start: string;
  listings: { title: string } | { title: string }[] | null;
};

export async function POST(req: NextRequest) {
  const deny = verifyCronSecret(req);
  if (deny) return deny;

  const supabase = await createClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

  const { data: bookings } = await supabase
    .from("viewing_bookings")
    .select("id,name,email,slot_start,listings(title)")
    .eq("status", "Confirmed")
    .is("reminder_sent_at", null)
    .gte("slot_start", windowStart)
    .lte("slot_start", windowEnd);

  let taken = 0;
  const errors: string[] = [];

  for (const booking of (bookings ?? []) as Booking[]) {
    const listing = Array.isArray(booking.listings) ? booking.listings[0] : booking.listings;
    const when = new Date(booking.slot_start).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      dateStyle: "full",
      timeStyle: "short",
    });
    try {
      await sendEmail({
        to: booking.email,
        subject: `Reminder: your viewing tomorrow — ${listing?.title ?? "your requested property"}`,
        html:
          `<p>Hi ${booking.name},</p>` +
          `<p>Just a reminder — your viewing for <strong>${listing?.title ?? "the property"}</strong> is scheduled for ${when}.</p>`,
      });
      await supabase
        .from("viewing_bookings")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", booking.id);
      taken++;
    } catch (e) {
      errors.push(`booking ${booking.id}: ${e}`);
    }
  }

  const status = errors.length === 0 ? "success" : taken > 0 ? "partial" : "failed";
  await logCronRun(supabase, "check_viewing_reminders", {
    processed: bookings?.length ?? 0,
    taken,
    errors,
    status,
  });
  return NextResponse.json({ taken, errors });
}
