import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PersonDetail, isTabKey } from "@/components/admin/person-detail";
import { getPersonHistory, type PersonRecord } from "@/lib/admin/person-history";

export default async function AdminOwnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("owners")
    .select("id,name,email,phone,auth_user_id,spa_authorization_received")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const person = data as PersonRecord;
  const history = await getPersonHistory(supabase, "owner", person);

  return (
    <PersonDetail
      party="owner"
      person={person}
      history={history}
      tab={isTabKey(tab) ? tab : "overview"}
      editHref={`/admin/owners/${id}/edit`}
    />
  );
}
