import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { TenantForm, type TenantValues } from "@/components/admin/pm-forms";
import { updateTenant } from "@/app/admin/pm-actions";
import { createClient } from "@/lib/supabase/server";

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("tenants").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const initial = data as TenantValues;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/tenants" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to tenants
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Edit tenant</h1>
      <p className="mt-1 text-sm text-slate">{initial.name}</p>
      <div className="mt-6"><TenantForm action={updateTenant.bind(null, id)} initial={initial} /></div>
    </div>
  );
}
