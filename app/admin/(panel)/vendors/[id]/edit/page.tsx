import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { VendorForm, type VendorValues } from "@/components/admin/pm-forms";
import { updateVendor } from "@/app/admin/pm-actions";
import { createClient } from "@/lib/supabase/server";

export default async function EditVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("vendors").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const initial = data as VendorValues;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/vendors" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to vendors
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Edit vendor</h1>
      <p className="mt-1 text-sm text-slate">{initial.name}</p>
      <div className="mt-6"><VendorForm action={updateVendor.bind(null, id)} initial={initial} /></div>
    </div>
  );
}
