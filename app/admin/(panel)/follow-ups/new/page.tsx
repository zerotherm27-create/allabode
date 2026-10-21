import Link from "next/link";
import { FollowUpTemplateEditor } from "@/components/admin/follow-up-template-editor";
import { getPublicSiteUrl } from "@/lib/url";

export const metadata = { title: "New follow-up email" };

export default function NewFollowUpPage() {
  return (
    <div>
      <Link href="/admin/follow-ups" className="text-sm text-navy-700 hover:underline">Follow-up emails</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-navy">New email</h1>
      <div className="mt-6">
        <FollowUpTemplateEditor
          siteUrl={getPublicSiteUrl()}
          template={{
            id: null,
            template_key: "",
            name: "",
            subject: "",
            body: "",
            delay_days: 0,
            position: 0,
            audience: "lead",
            is_active: false,
          }}
        />
      </div>
    </div>
  );
}
