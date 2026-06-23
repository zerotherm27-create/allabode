import Link from "next/link";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai/client";
import { ReceiptUploadForm } from "./upload-form";

export default async function NewReceiptPage() {
  const supabase = await createClient();
  const [{ data: props }, { data: owners }, { data: vendors }] = await Promise.all([
    supabase.from("properties").select("id,name").order("name"),
    supabase.from("owners").select("id,name").order("name"),
    supabase.from("vendors").select("id,name").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/receipts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to receipts
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Upload receipt</h1>
      <ReceiptUploadForm
        aiEnabled={isAiConfigured()}
        properties={(props ?? []) as { id: string; name: string }[]}
        owners={(owners ?? []) as { id: string; name: string }[]}
        vendors={(vendors ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
