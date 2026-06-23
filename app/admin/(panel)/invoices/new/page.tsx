import Link from "next/link";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { createInvoice } from "@/app/admin/invoice-actions";
import { InvoiceForm, type LeaseOption } from "@/components/admin/invoice-form";

type LeaseRow = {
  id: string;
  rent_amount: number;
  units: { unit_label: string; properties: { name: string } | null } | null;
  tenants: { name: string } | null;
};

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leases")
    .select("id,rent_amount,units(unit_label,properties(name)),tenants(name)")
    .in("status", ["active", "renewal_pending", "expiring"])
    .order("created_at", { ascending: false });

  const leases: LeaseOption[] = ((data ?? []) as unknown as LeaseRow[]).map((l) => {
    const unit = Array.isArray(l.units) ? l.units[0] : l.units;
    const property = unit ? (Array.isArray((unit as { properties: unknown }).properties) ? ((unit as { properties: { name: string }[] }).properties)[0] : (unit as { properties: { name: string } | null }).properties) : null;
    const tenant = Array.isArray(l.tenants) ? l.tenants[0] : l.tenants;
    const propName = (property as { name?: string } | null)?.name ?? "Property";
    const unitLabel = (unit as { unit_label?: string } | null)?.unit_label ?? "Unit";
    const tenantName = (tenant as { name?: string } | null)?.name ?? "Tenant";
    return {
      id:            l.id,
      label:         `${propName} — ${unitLabel} (${tenantName})`,
      tenant_name:   tenantName,
      unit_label:    unitLabel,
      property_name: propName,
      rent_amount:   Number(l.rent_amount),
    };
  });

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/invoices"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy"
      >
        <Icon name="arrow_back" size={18} /> Back to invoices
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New invoice</h1>
      <p className="mt-1 text-sm text-slate">
        Select an active lease — a draft invoice is created from the monthly rent amount.
      </p>
      <div className="mt-6">
        <InvoiceForm action={createInvoice} leases={leases} />
      </div>
    </div>
  );
}
