import Link from "next/link";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai/client";
import { ReceiptUploadForm } from "./upload-form";

export default async function NewReceiptPage() {
  const supabase = await createClient();
  const [{ data: props }, { data: owners }, { data: vendors }, { data: unitsRaw }, { data: tenantsRaw }] = await Promise.all([
    supabase.from("properties").select("id,name").order("name"),
    supabase.from("owners").select("id,name").order("name"),
    supabase.from("vendors").select("id,name").order("name"),
    supabase.from("units").select("id,unit_label").order("unit_label"),
    supabase.from("tenants").select("id,name").order("name"),
  ]);

  type Opt = { id: string; name: string };
  const units = (unitsRaw ?? []).map((u) => ({ id: u.id, name: (u as { unit_label: string }).unit_label })) as Opt[];
  const tenants = (tenantsRaw ?? []) as Opt[];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/receipts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to receipts
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Upload receipt</h1>
      <ReceiptUploadForm
        aiEnabled={isAiConfigured()}
        properties={(props ?? []) as Opt[]}
        owners={(owners ?? []) as Opt[]}
        vendors={(vendors ?? []) as Opt[]}
        units={units}
        tenants={tenants}
      />
    </div>
  );
}
