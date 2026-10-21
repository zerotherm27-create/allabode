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

  // How many property specialists send their own version of this email.
  // Fail-soft: before the overrides migration is run this is simply hidden.
  let ownVersions = 0;
  if (t.audience === "lead") {
    const { count, error } = await supabase
      .from("specialist_template_overrides")
      .select("specialist_id", { count: "exact", head: true })
      .eq("template_id", id);
    if (!error) ownVersions = count ?? 0;
  }

  return (
    <div>
      <Link href="/admin/follow-ups" className="text-sm text-navy-700 hover:underline">Follow-up emails</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-navy">{t.name}</h1>
      {ownVersions > 0 && (
        <p className="mt-2 text-sm text-slate">
          <span className="font-semibold text-navy">
            {ownVersions} property specialist{ownVersions === 1 ? "" : "s"}
          </span>{" "}
          {ownVersions === 1 ? "sends their" : "send their"} own version of this email to their leads. Your version is
          used for everyone else; the unsubscribe link and company details are always added.
        </p>
      )}
      <div className="mt-6">
        <FollowUpTemplateEditor template={t} siteUrl={getPublicSiteUrl()} />
      </div>
    </div>
  );
}
