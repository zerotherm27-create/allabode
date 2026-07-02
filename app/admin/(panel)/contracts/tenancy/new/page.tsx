import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { TenancyTermsForm, type UnitOption } from "@/components/admin/tenancy-terms-form";
import { createTenancyAgreement } from "@/app/admin/tenancy-actions";

type UnitRow = {
  id: string;
  unit_label: string;
  base_rent: number | null;
  properties: { name: string; address: string | null } | null;
};

export default async function NewTenancyContractPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("id,unit_label,base_rent,properties(name,address)")
    .order("unit_label");

  const units: UnitOption[] = ((data ?? []) as unknown as UnitRow[]).map((u) => ({
    id: u.id,
    unitLabel: u.unit_label,
    baseRent: u.base_rent !== null ? Number(u.base_rent) : null,
    propertyName: u.properties?.name ?? "",
    propertyAddress: u.properties?.address ?? "",
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/contracts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to contracts
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Send a Tenancy Agreement</h1>
      <p className="mt-1 text-sm text-slate">
        You set all the lease terms here. The tenant only fills in their personal details and government ID on the
        signing link, then the landlord signs via their own link (or a designated signatory countersigns).
      </p>
      <div className="mt-6">
        <TenancyTermsForm
          action={createTenancyAgreement}
          units={units}
          submitLabel="Create & send to tenant"
        />
      </div>
    </div>
  );
}
