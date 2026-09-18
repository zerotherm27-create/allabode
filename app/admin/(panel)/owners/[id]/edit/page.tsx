import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { OwnerForm, type OwnerValues } from "@/components/admin/pm-forms";
import { ErrorBanner } from "@/components/admin/form-kit";
import { updateOwner } from "@/app/admin/pm-actions";
import { createClient } from "@/lib/supabase/server";

export default async function EditOwnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("owners").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const initial = data as OwnerValues;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/owners" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to owners
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Edit owner</h1>
      <p className="mt-1 text-sm text-slate">{initial.name}</p>
      <div className="mt-6">
        <ErrorBanner message={error} />
        <OwnerForm action={updateOwner.bind(null, id)} initial={initial} />
      </div>
    </div>
  );
}
