"use server";

import { createClient } from "@/lib/supabase/server";

export type AdminSearchResultType =
  | "owner" | "tenant" | "property" | "unit" | "vendor" | "invoice" | "ticket";

export type AdminSearchResult = {
  type: AdminSearchResultType;
  id: string;
  label: string;
  sublabel: string | null;
  href: string;
};

const MAX_PER_ENTITY = 5;

// Escapes ilike wildcard metacharacters for a single-column `.ilike(col, pattern)`
// value (safe here since it's one query-param argument, not concatenated into a
// raw filter string like `.or()` below).
function escapeIlikeValue(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

// `.or()` parses its whole argument as one PostgREST filter string, where `,`
// separates conditions and `.` separates column/operator/value — wrapping the
// value in double quotes takes it literally, so escape `\`/`"` plus the ilike
// wildcards inside the quoted form.
function escapeOrValue(term: string): string {
  const inner = term
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return `"%${inner}%"`;
}

export async function searchAdmin(rawQuery: string): Promise<AdminSearchResult[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const orPattern = escapeOrValue(query);
  const ilikePattern = `%${escapeIlikeValue(query)}%`;
  const supabase = await createClient();

  const [owners, tenants, properties, units, vendors, invoices, tickets] = await Promise.all([
    supabase.from("owners").select("id,name,email")
      .or(`name.ilike.${orPattern},email.ilike.${orPattern}`).limit(MAX_PER_ENTITY),
    supabase.from("tenants").select("id,name,email")
      .or(`name.ilike.${orPattern},email.ilike.${orPattern}`).limit(MAX_PER_ENTITY),
    supabase.from("properties").select("id,name,address")
      .or(`name.ilike.${orPattern},address.ilike.${orPattern}`).limit(MAX_PER_ENTITY),
    supabase.from("units").select("id,unit_label,properties(name)")
      .ilike("unit_label", ilikePattern).limit(MAX_PER_ENTITY),
    supabase.from("vendors").select("id,name")
      .ilike("name", ilikePattern).limit(MAX_PER_ENTITY),
    supabase.from("invoices").select("id,invoice_number")
      .ilike("invoice_number", ilikePattern).limit(MAX_PER_ENTITY),
    supabase.from("tickets").select("id,ticket_number,subject")
      .or(`ticket_number.ilike.${orPattern},subject.ilike.${orPattern}`).limit(MAX_PER_ENTITY),
  ]);

  const out: AdminSearchResult[] = [];

  for (const o of (owners.data ?? []) as { id: string; name: string; email: string }[])
    out.push({ type: "owner", id: o.id, label: o.name, sublabel: o.email, href: `/admin/owners/${o.id}/edit` });

  for (const t of (tenants.data ?? []) as { id: string; name: string; email: string }[])
    out.push({ type: "tenant", id: t.id, label: t.name, sublabel: t.email, href: `/admin/tenants/${t.id}/edit` });

  for (const p of (properties.data ?? []) as { id: string; name: string; address: string | null }[])
    out.push({ type: "property", id: p.id, label: p.name, sublabel: p.address, href: `/admin/properties/${p.id}/edit` });

  for (const u of (units.data ?? []) as { id: string; unit_label: string; properties: { name: string } | { name: string }[] | null }[]) {
    const prop = Array.isArray(u.properties) ? u.properties[0] : u.properties;
    out.push({ type: "unit", id: u.id, label: u.unit_label, sublabel: prop?.name ?? null, href: `/admin/units/${u.id}/edit` });
  }

  for (const v of (vendors.data ?? []) as { id: string; name: string }[])
    out.push({ type: "vendor", id: v.id, label: v.name, sublabel: null, href: `/admin/vendors/${v.id}/edit` });

  for (const i of (invoices.data ?? []) as { id: string; invoice_number: string }[])
    out.push({ type: "invoice", id: i.id, label: i.invoice_number, sublabel: null, href: `/admin/invoices/${i.id}` });

  for (const tk of (tickets.data ?? []) as { id: string; ticket_number: string; subject: string }[])
    out.push({ type: "ticket", id: tk.id, label: tk.subject, sublabel: tk.ticket_number, href: `/admin/tickets/${tk.id}` });

  return out;
}
