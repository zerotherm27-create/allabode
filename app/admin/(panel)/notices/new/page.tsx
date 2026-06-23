import Link from "next/link";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { createNotice } from "@/app/admin/notice-actions";
import { F, Group, SubmitButton, inputCls } from "@/components/admin/form-kit";

export default async function NewNoticePage() {
  const supabase = await createClient();
  const { data: propData } = await supabase.from("properties").select("id,name").order("name");
  const properties = (propData ?? []) as { id: string; name: string }[];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/notices" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to notices
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New notice</h1>
      <p className="mt-1 text-sm text-slate">Broadcast a message to owners, tenants, or all portal users.</p>

      <form action={createNotice} className="mt-6 flex flex-col gap-6">
        <Group title="Notice details">
          <F label="Title" span>
            <input name="title" className={inputCls} required placeholder="e.g. Building maintenance on Saturday" />
          </F>
          <F label="Body" span>
            <textarea name="body" className={`${inputCls} h-auto py-2.5`} required rows={4} placeholder="Full notice text…" />
          </F>
          <F label="Type">
            <select name="notice_type" className={inputCls} defaultValue="info">
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="maintenance">Maintenance</option>
              <option value="urgent">Urgent</option>
            </select>
          </F>
          <F label="Audience">
            <select name="audience" className={inputCls} defaultValue="all">
              <option value="all">All portal users</option>
              <option value="tenants">Tenants only</option>
              <option value="owners">Owners only</option>
            </select>
          </F>
          {properties.length > 0 && (
            <F label="Property (optional — leave blank for org-wide)">
              <select name="property_id" className={inputCls}>
                <option value="">All properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </F>
          )}
          <F label="Expires (optional)">
            <input name="expires_at" type="date" className={inputCls} />
          </F>
        </Group>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="publish_now" className="rounded" defaultChecked />
            Publish immediately
          </label>
        </div>

        <SubmitButton label="Create notice" />
      </form>
    </div>
  );
}
