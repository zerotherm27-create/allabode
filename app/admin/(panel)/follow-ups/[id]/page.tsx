import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FollowUpTemplateEditor, type EditorTemplate } from "@/components/admin/follow-up-template-editor";
import { getPublicSiteUrl } from "@/lib/url";
import { isUuid } from "@/lib/admin/follow-up-templates";

export const metadata = { title: "Edit follow-up email" };

export default async function EditFollowUpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_templates")
    .select("id,template_key,name,subject,body,delay_days,position,audience,is_active")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const t = data as EditorTemplate;

  return (
    <div>
      <Link href="/admin/follow-ups" className="text-sm text-navy-700 hover:underline">Follow-up emails</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-navy">{t.name}</h1>
      <div className="mt-6">
        <FollowUpTemplateEditor template={t} siteUrl={getPublicSiteUrl()} />
      </div>
    </div>
  );
}
