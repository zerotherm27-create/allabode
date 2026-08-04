import Link from "next/link";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { createOwnerInvoice } from "@/app/admin/invoice-actions";
import { OwnerInvoiceForm, type UnitOption } from "@/components/admin/owner-invoice-form";

type UnitRow = {
  id: string;
  unit_label: string;
  properties: { name: string; owner_id: string | null; owners: { name: string } | null } | null;
};

export default async function NewOwnerInvoicePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("id,unit_label,properties(name,owner_id,owners(name))")
    .order("unit_label", { ascending: true });

  const units: UnitOption[] = ((data ?? []) as unknown as UnitRow[])
    .filter((u) => u.properties?.owner_id)
    .map((u) => {
      const propName = u.properties?.name ?? "Property";
      const ownerName = u.properties?.owners?.name ?? "Owner";
      return {
        id:            u.id,
        label:         `${propName} — ${u.unit_label} (${ownerName})`,
        unit_label:    u.unit_label,
        property_name: propName,
        owner_name:    ownerName,
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
      <h1 className="font-display text-2xl font-bold text-navy">New owner invoice</h1>
      <p className="mt-1 text-sm text-slate">
        Select a unit — the invoice is billed directly to the property owner, not a tenant.
      </p>
      <div className="mt-6">
        <OwnerInvoiceForm action={createOwnerInvoice} units={units} />
      </div>
    </div>
  );
}
