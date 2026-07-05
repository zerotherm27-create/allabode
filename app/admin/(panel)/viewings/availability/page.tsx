import Link from "next/link";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { AvailabilityForm } from "@/components/admin/availability-form";
import type { AvailabilityDayInput } from "@/app/admin/viewing-actions";

type Row = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  is_active: boolean;
};

export default async function ViewingAvailabilityPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("viewing_availability")
    .select("day_of_week,start_time,end_time,slot_minutes,is_active")
    .is("listing_id", null);
  const rows = (data ?? []) as Row[];
  const byDay = new Map(rows.map((r) => [r.day_of_week, r]));

  const days: AvailabilityDayInput[] = Array.from({ length: 7 }, (_, i) => {
    const existing = byDay.get(i);
    return {
      dayOfWeek: i,
      isActive: existing?.is_active ?? false,
      startTime: existing?.start_time?.slice(0, 5) ?? "09:00",
      endTime: existing?.end_time?.slice(0, 5) ?? "17:00",
      slotMinutes: existing?.slot_minutes ?? 30,
    };
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/viewings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy"
      >
        <Icon name="arrow_back" size={18} />
        Back to viewings
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Viewing availability</h1>
      <p className="mt-1 text-sm text-slate">
        Set the weekly windows visitors can pick a viewing slot from. Applies to all listings by default.
      </p>
      <div className="mt-6">
        <AvailabilityForm initial={days} />
      </div>
    </div>
  );
}
