import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { LeaseForm, type LeaseValues } from "@/components/admin/pm-forms";
import { updateLease } from "@/app/admin/pm-actions";
import { createClient } from "@/lib/supabase/server";

type UnitOpt = { id: string; unit_label: string; properties: { name: string } | { name: string }[] | null };

export default async function EditLeasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: row }, { data: unitData }, { data: tenantData }] = await Promise.all([
    supabase.from("leases").select("*").eq("id", id).maybeSingle(),
    supabase.from("units").select("id,unit_label,properties(name)").order("created_at", { ascending: false }),
    supabase.from("tenants").select("id,name").order("name"),
  ]);
  if (!row) notFound();
  const initial = row as LeaseValues;
  const units = ((unitData ?? []) as UnitOpt[]).map((u) => {
    const p = Array.isArray(u.properties) ? u.properties[0] : u.properties;
    return { id: u.id, label: `${p?.name ?? "Property"} — ${u.unit_label}` };
  });
  const tenants = ((tenantData ?? []) as { id: string; name: string }[]).map((t) => ({ id: t.id, label: t.name }));

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/leases" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to leases
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Edit lease</h1>
      <div className="mt-6"><LeaseForm action={updateLease.bind(null, id)} initial={initial} units={units} tenants={tenants} /></div>
    </div>
  );
}
