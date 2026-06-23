"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}
function n(fd: FormData, k: string): number | null {
  const v = s(fd, k);
  if (!v) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function nextDueDate(frequencyType: string, frequencyDays: number | null, lastDone: string | null): string | null {
  const base = lastDone ? new Date(lastDone) : new Date();
  const freqMap: Record<string, number> = {
    monthly: 30, quarterly: 90, semi_annual: 180, annual: 365,
  };
  const days = frequencyDays ?? freqMap[frequencyType] ?? 30;
  const next = new Date(base.getTime() + days * 86400000);
  return next.toISOString().slice(0, 10);
}

// ---- Maintenance Plans ----

export async function createMaintenancePlan(fd: FormData) {
  const supabase = createAdminClient();
  const frequency_type = s(fd, "frequency_type") ?? "monthly";
  const frequency_days = n(fd, "frequency_days");
  const last_done_at   = s(fd, "last_done_at");

  const { error } = await supabase.from("maintenance_plans").insert({
    property_id:         s(fd, "property_id")!,
    unit_id:             s(fd, "unit_id"),
    title:               s(fd, "title")!,
    category:            s(fd, "category") ?? "general",
    frequency_type,
    frequency_days,
    last_done_at,
    next_due_at:         nextDueDate(frequency_type, frequency_days, last_done_at),
    preferred_vendor_id: s(fd, "preferred_vendor_id"),
    estimated_cost:      n(fd, "estimated_cost"),
    notes:               s(fd, "notes"),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/maintenance");
  redirect("/admin/maintenance");
}

export async function markPlanDone(planId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("maintenance_plans")
    .select("frequency_type,frequency_days").eq("id", planId).maybeSingle();
  if (!data) throw new Error("Plan not found");

  const today = new Date().toISOString().slice(0, 10);
  const plan  = data as { frequency_type: string; frequency_days: number | null };
  const next  = nextDueDate(plan.frequency_type, plan.frequency_days, today);

  const { error } = await supabase.from("maintenance_plans").update({
    last_done_at: today,
    next_due_at:  next,
  }).eq("id", planId);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "maintenance_plan.done", entityType: "maintenance_plan", entityId: planId });
  revalidatePath("/admin/maintenance");
}

// ---- Work Orders ----

export async function createWorkOrder(fd: FormData) {
  const supabase = createAdminClient();
  const { data: num } = await supabase.rpc("generate_work_order_number");
  if (!num) throw new Error("Could not generate work order number");

  const { data, error } = await supabase.from("work_orders").insert({
    work_order_number:   num,
    property_id:         s(fd, "property_id")!,
    unit_id:             s(fd, "unit_id"),
    ticket_id:           s(fd, "ticket_id"),
    maintenance_plan_id: s(fd, "maintenance_plan_id"),
    vendor_id:           s(fd, "vendor_id"),
    title:               s(fd, "title")!,
    description:         s(fd, "description"),
    priority:            s(fd, "priority") ?? "normal",
    scheduled_date:      s(fd, "scheduled_date"),
    estimated_cost:      n(fd, "estimated_cost"),
    notes:               s(fd, "notes"),
  }).select("id").single();
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "work_order.created", entityType: "work_order", entityId: data.id });
  redirect(`/admin/work-orders/${data.id}`);
}

export async function updateWorkOrderStatus(workOrderId: string, fd: FormData) {
  const supabase = createAdminClient();
  const status       = s(fd, "status");
  const actual_cost  = n(fd, "actual_cost");
  const notes        = s(fd, "notes");

  const updates: Record<string, unknown> = { status };
  if (status === "completed" || status === "verified") {
    updates.completed_date = new Date().toISOString().slice(0, 10);
  }
  if (actual_cost !== null) updates.actual_cost = actual_cost;
  if (notes)               updates.notes = notes;

  const { error } = await supabase.from("work_orders").update(updates).eq("id", workOrderId);
  if (error) throw new Error(error.message);

  await logAudit(supabase, { action: "work_order.status_changed", entityType: "work_order", entityId: workOrderId, metadata: { status } });
  revalidatePath(`/admin/work-orders/${workOrderId}`);
  revalidatePath("/admin/work-orders");
}
