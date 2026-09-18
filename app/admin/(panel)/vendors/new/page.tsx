import Link from "next/link";
import { Icon } from "@/components/icon";
import { VendorForm } from "@/components/admin/pm-forms";
import { ErrorBanner } from "@/components/admin/form-kit";
import { createVendor } from "@/app/admin/pm-actions";

export default async function NewVendorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/vendors" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to vendors
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New vendor</h1>
      <div className="mt-6">
        <ErrorBanner message={error} />
        <VendorForm action={createVendor} />
      </div>
    </div>
  );
}
