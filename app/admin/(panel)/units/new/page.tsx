import Link from "next/link";
import { Icon } from "@/components/icon";
import { UnitForm } from "@/components/admin/pm-forms";
import { ErrorBanner } from "@/components/admin/form-kit";
import { createUnit } from "@/app/admin/pm-actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewUnitPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("properties").select("id,name").order("name");
  const properties = ((data ?? []) as { id: string; name: string }[]).map((p) => ({ id: p.id, label: p.name }));

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/units" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to units
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New unit</h1>
      <div className="mt-6">
        <ErrorBanner message={error} />
        <UnitForm action={createUnit} properties={properties} />
      </div>
    </div>
  );
}
