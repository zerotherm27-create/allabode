import Link from "next/link";
import { Icon } from "@/components/icon";
import { TenantForm } from "@/components/admin/pm-forms";
import { ErrorBanner } from "@/components/admin/form-kit";
import { createTenant } from "@/app/admin/pm-actions";

export default async function NewTenantPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/tenants" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to tenants
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New tenant</h1>
      <div className="mt-6">
        <ErrorBanner message={error} />
        <TenantForm action={createTenant} />
      </div>
    </div>
  );
}
