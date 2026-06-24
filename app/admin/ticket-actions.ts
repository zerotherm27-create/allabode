"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { computeSlaDeadline } from "@/lib/tickets";

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

export async function createTicketFromAdmin(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const property_id = s(fd, "property_id");
  const category    = s(fd, "category");
  const priority    = s(fd, "priority") ?? "normal";
  const subject     = s(fd, "subject");
  const description = s(fd, "description");

  if (!property_id || !category || !subject || !description)
    throw new Error("Missing required fields");

  const { data: num } = await supabase.rpc("generate_ticket_number");
  if (!num) throw new Error("Could not generate ticket number");

  const sla_due_at = computeSlaDeadline(priority, new Date()).toISOString();

  const row: Record<string, unknown> = {
    ticket_number:       num,
    property_id,
    category,
    priority,
    subject,
    description,
    sla_due_at,
    reported_by_staff:   user?.id ?? null,
    unit_id:             s(fd, "unit_id"),
    lease_id:            s(fd, "lease_id"),
    tenant_id:           s(fd, "tenant_id"),
    owner_id:            s(fd, "owner_id"),
    subcategory:         s(fd, "subcategory"),
  };

  const { data, error } = await supabase.from("tickets").insert(row).select("id").single();
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "ticket.created", entityType: "ticket", entityId: data.id });
  redirect(`/admin/tickets/${data.id}`);
}

export async function updateTicketStatus(ticketId: string, fd: FormData) {
  const supabase = await createClient();
  const status = s(fd, "status");
  if (!status) throw new Error("Status required");

  const updates: Record<string, unknown> = { status };
  if (status === "resolved") updates.resolved_at = new Date().toISOString();
  if (status === "closed")   updates.closed_at   = new Date().toISOString();

  const { error } = await supabase.from("tickets").update(updates).eq("id", ticketId);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "ticket.status_changed", entityType: "ticket", entityId: ticketId, metadata: { status } });
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
}

export async function assignTicket(ticketId: string, fd: FormData) {
  const supabase = await createClient();
  const assigned_to = s(fd, "assigned_to");
  const vendor_id   = s(fd, "vendor_id");

  const { error } = await supabase.from("tickets").update({
    assigned_to: assigned_to || null,
    vendor_id:   vendor_id   || null,
    status:      "assigned",
  }).eq("id", ticketId);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "ticket.assigned", entityType: "ticket", entityId: ticketId });
  revalidatePath(`/admin/tickets/${ticketId}`);
}

export async function addComment(ticketId: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = s(fd, "body");
  if (!body) throw new Error("Comment body required");

  const is_internal = fd.get("is_internal") === "on";

  const { error } = await supabase.from("ticket_comments").insert({
    ticket_id:      ticketId,
    author_user_id: user?.id ?? null,
    author_name:    user?.email ?? "Staff",
    author_role:    "staff",
    body,
    is_internal,
  });
  if (error) throw new Error(error.message);

  if (!is_internal) {
    await supabase.from("tickets").update({ first_response_at: new Date().toISOString() })
      .eq("id", ticketId).is("first_response_at", null);
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
}

export async function addTenantComment(ticketId: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = s(fd, "body");
  if (!body) throw new Error("Comment body required");

  const { data: tenantRow } = await supabase.from("tenants").select("name")
    .eq("auth_user_id", user?.id ?? "").maybeSingle();
  const author_name = (tenantRow as { name?: string } | null)?.name ?? "Tenant";

  const { error } = await supabase.from("ticket_comments").insert({
    ticket_id:      ticketId,
    author_user_id: user?.id ?? null,
    author_name,
    author_role:    "tenant",
    body,
    is_internal:    false,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/tenant/tickets/${ticketId}`);
}

export async function createTicketFromPortal(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: tenantRow } = await supabase.from("tenants").select("id,name")
    .eq("auth_user_id", user.id).maybeSingle();
  if (!tenantRow) throw new Error("No tenant record found");

  const { data: leaseRow } = await supabase.from("leases")
    .select("id,unit_id,units(property_id)")
    .eq("tenant_id", (tenantRow as { id: string }).id)
    .in("status", ["active", "renewal_pending"])
    .maybeSingle();

  const category    = s(fd, "category");
  const priority    = s(fd, "priority") ?? "normal";
  const subject     = s(fd, "subject");
  const description = s(fd, "description");

  if (!category || !subject || !description)
    throw new Error("Missing required fields");

  const lease = leaseRow as { id: string; unit_id: string; units: { property_id: string }[] | { property_id: string } | null } | null;
  const unitRow = Array.isArray(lease?.units) ? lease?.units[0] : lease?.units;
  const property_id = (unitRow as { property_id?: string } | null)?.property_id;
  if (!property_id) throw new Error("No active lease with a property found");

  const { data: num } = await supabase.rpc("generate_ticket_number");
  if (!num) throw new Error("Could not generate ticket number");

  const sla_due_at = computeSlaDeadline(priority, new Date()).toISOString();

  const { data, error } = await supabase.from("tickets").insert({
    ticket_number: num,
    property_id,
    unit_id:       lease?.unit_id ?? null,
    lease_id:      lease?.id ?? null,
    tenant_id:     (tenantRow as { id: string }).id,
    category,
    priority,
    subject,
    description,
    sla_due_at,
  }).select("id").single();
  if (error) throw new Error(error.message);

  redirect(`/dashboard/tenant/tickets/${data.id}`);
}
