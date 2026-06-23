import Link from "next/link";
import { Icon } from "@/components/icon";
import { OwnerForm } from "@/components/admin/pm-forms";
import { createOwner } from "@/app/admin/pm-actions";

export default function NewOwnerPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/owners" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to owners
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New owner</h1>
      <div className="mt-6"><OwnerForm action={createOwner} /></div>
    </div>
  );
}
