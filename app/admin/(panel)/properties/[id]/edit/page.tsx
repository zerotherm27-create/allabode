import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { PropertyForm, type PropertyValues } from "@/components/admin/pm-forms";
import { updateProperty } from "@/app/admin/pm-actions";
import { createClient } from "@/lib/supabase/server";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: row }, { data: ownerData }] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle(),
    supabase.from("owners").select("id,name").order("name"),
  ]);
  if (!row) notFound();
  const initial = row as PropertyValues;
  const owners = ((ownerData ?? []) as { id: string; name: string }[]).map((o) => ({ id: o.id, label: o.name }));

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/properties" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to properties
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Edit property</h1>
      <p className="mt-1 text-sm text-slate">{initial.name}</p>
      <div className="mt-6"><PropertyForm action={updateProperty.bind(null, id)} initial={initial} owners={owners} /></div>
    </div>
  );
}
