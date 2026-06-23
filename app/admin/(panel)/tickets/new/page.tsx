import Link from "next/link";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { createTicketFromAdmin } from "@/app/admin/ticket-actions";
import { F, Group, SubmitButton, inputCls } from "@/components/admin/form-kit";
import { TICKET_CATEGORIES } from "@/lib/tickets";

export default async function NewTicketPage() {
  const supabase = await createClient();
  const [{ data: propData }, { data: vendorData }] = await Promise.all([
    supabase.from("properties").select("id,name").order("name"),
    supabase.from("vendors").select("id,name").order("name"),
  ]);

  const properties = (propData ?? []) as { id: string; name: string }[];
  const vendors    = (vendorData ?? []) as { id: string; name: string }[];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to tickets
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New ticket</h1>
      <p className="mt-1 text-sm text-slate">File a ticket on behalf of a tenant or owner.</p>

      <form action={createTicketFromAdmin} className="mt-6 flex flex-col gap-6">
        <Group title="Property">
          <F label="Property">
            <select name="property_id" className={inputCls} required>
              <option value="">Select property…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </F>
        </Group>

        <Group title="Ticket details">
          <F label="Category">
            <select name="category" className={inputCls} required>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </F>
          <F label="Priority">
            <select name="priority" className={inputCls} defaultValue="normal">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </F>
          <F label="Subject" span>
            <input name="subject" className={inputCls} required placeholder="Brief summary of the issue" />
          </F>
          <F label="Description" span>
            <textarea name="description" className={`${inputCls} h-auto py-2.5`} required rows={4} placeholder="Detailed description…" />
          </F>
        </Group>

        {vendors.length > 0 && (
          <Group title="Assignment (optional)">
            <F label="Assign vendor">
              <select name="vendor_id" className={inputCls}>
                <option value="">No vendor yet</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </F>
          </Group>
        )}

        <SubmitButton label="Create ticket" />
      </form>
    </div>
  );
}
