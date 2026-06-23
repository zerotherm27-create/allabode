import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { UnitForm, type UnitValues } from "@/components/admin/pm-forms";
import { updateUnit } from "@/app/admin/pm-actions";
import { createClient } from "@/lib/supabase/server";

export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: row }, { data: propData }] = await Promise.all([
    supabase.from("units").select("*").eq("id", id).maybeSingle(),
    supabase.from("properties").select("id,name").order("name"),
  ]);
  if (!row) notFound();
  const initial = row as UnitValues;
  const properties = ((propData ?? []) as { id: string; name: string }[]).map((p) => ({ id: p.id, label: p.name }));

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/units" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to units
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Edit unit</h1>
      <p className="mt-1 text-sm text-slate">{initial.unit_label}</p>
      <div className="mt-6"><UnitForm action={updateUnit.bind(null, id)} initial={initial} properties={properties} /></div>
    </div>
  );
}
