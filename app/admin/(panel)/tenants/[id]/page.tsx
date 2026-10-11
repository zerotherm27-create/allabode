import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PersonDetail, isTabKey } from "@/components/admin/person-detail";
import { getPersonHistory, type PersonRecord } from "@/lib/admin/person-history";

export default async function AdminTenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data } = await supabase.from("tenants").select("id,name,email,phone,auth_user_id").eq("id", id).maybeSingle();
  if (!data) notFound();
  const person = data as PersonRecord;
  const history = await getPersonHistory(supabase, "tenant", person);

  return (
    <PersonDetail
      party="tenant"
      person={person}
      history={history}
      tab={isTabKey(tab) ? tab : "overview"}
      editHref={`/admin/tenants/${id}/edit`}
    />
  );
}
