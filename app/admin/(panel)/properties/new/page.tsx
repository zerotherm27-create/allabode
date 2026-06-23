import Link from "next/link";
import { Icon } from "@/components/icon";
import { PropertyForm } from "@/components/admin/pm-forms";
import { createProperty } from "@/app/admin/pm-actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewPropertyPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("owners").select("id,name").order("name");
  const owners = ((data ?? []) as { id: string; name: string }[]).map((o) => ({ id: o.id, label: o.name }));

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/properties" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to properties
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New property</h1>
      <div className="mt-6"><PropertyForm action={createProperty} owners={owners} /></div>
    </div>
  );
}
