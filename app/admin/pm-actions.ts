"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { unitIdsToResyncForLeaseChange } from "@/lib/pm/lease-occupancy";
import { blockedDeleteMessage } from "@/lib/admin/delete-errors";

// ---- field coercion helpers ----
function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}
function n(fd: FormData, k: string): number | null {
  const v = s(fd, k);
  if (v == null) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function b(fd: FormData, k: string): boolean {
  return fd.get(k) === "on";
}

// ---- generic CRUD over a table ----
async function insertRow(table: string, row: Record<string, unknown>, listPath: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(table).insert(row);
  if (error) throw new Error(error.message);
  revalidatePath(listPath);
  redirect(listPath);
}
async function updateRow(table: string, id: string, row: Record<string, unknown>, listPath: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(table).update(row).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(listPath);
  redirect(listPath);
}
async function deleteRow(table: string, id: string, listPath: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      redirect(`${listPath}?error=${encodeURIComponent(blockedDeleteMessage(table))}`);
    }
    throw new Error(error.message);
  }
  revalidatePath(listPath);
  redirect(listPath);
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function syncUnitOccupancy(supabase: SupabaseClient, unitIds: string[]) {
  await Promise.all(unitIds.map(async (unitId) => {
    const { count, error: countError } = await supabase
      .from("leases")
      .select("id", { count: "exact", head: true })
      .eq("unit_id", unitId)
      .eq("status", "active");
    if (countError) throw new Error(countError.message);

    const nextStatus = (count ?? 0) > 0 ? "Occupied" : "Vacant";
    const query = supabase.from("units").update({ status: nextStatus }).eq("id", unitId);
    const { error } = nextStatus === "Vacant"
      ? await query.eq("status", "Occupied")
      : await query;
    if (error) throw new Error(error.message);
  }));
}

function allowTestLeaseDelete() {
  return process.env.ALLOW_TEST_LEASE_DELETE === "true";
}

// ---- row builders ----
function ownerRow(fd: FormData) {
  return {
    name: s(fd, "name") ?? "Unnamed",
    email: s(fd, "email"),
    phone: s(fd, "phone"),
    address: s(fd, "address"),
    bank_name: s(fd, "bank_name"),
    bank_account_name: s(fd, "bank_account_name"),
    bank_account_no: s(fd, "bank_account_no"),
    management_fee_percent: n(fd, "management_fee_percent"),
    notes: s(fd, "notes"),
  };
}
function tenantRow(fd: FormData) {
  return {
    name: s(fd, "name") ?? "Unnamed",
    email: s(fd, "email"),
    phone: s(fd, "phone"),
    notes: s(fd, "notes"),
  };
}
function vendorRow(fd: FormData) {
  return {
    name: s(fd, "name") ?? "Unnamed",
    tin: s(fd, "tin"),
    address: s(fd, "address"),
    is_approved: b(fd, "is_approved"),
    is_blocked: b(fd, "is_blocked"),
    notes: s(fd, "notes"),
  };
}
function propertyRow(fd: FormData) {
  return {
    owner_id: s(fd, "owner_id"),
    name: s(fd, "name") ?? "Unnamed",
    address: s(fd, "address"),
    city: s(fd, "city"),
    province: s(fd, "province"),
    property_type: s(fd, "property_type") ?? "Condo",
    status: s(fd, "status") ?? "Active",
    management_start_date: s(fd, "management_start_date"),
    notes: s(fd, "notes"),
  };
}
function unitRow(fd: FormData) {
  return {
    property_id: s(fd, "property_id"),
    unit_label: s(fd, "unit_label") ?? "Unit",
    bedrooms: n(fd, "bedrooms"),
    bathrooms: n(fd, "bathrooms"),
    floor_area: n(fd, "floor_area"),
    base_rent: n(fd, "base_rent"),
    status: s(fd, "status") ?? "Vacant",
    notes: s(fd, "notes"),
  };
}
function leaseRow(fd: FormData) {
  return {
    unit_id: s(fd, "unit_id"),
    tenant_id: s(fd, "tenant_id"),
    start_date: s(fd, "start_date"),
    end_date: s(fd, "end_date"),
    rent_amount: n(fd, "rent_amount") ?? 0,
    billing_cycle: s(fd, "billing_cycle") ?? "monthly",
    deposit: n(fd, "deposit"),
    advance: n(fd, "advance"),
    remittance_due_date: s(fd, "remittance_due_date"),
    notice_period_days: n(fd, "notice_period_days"),
    status: s(fd, "status") ?? "draft",
    terms: s(fd, "terms"),
    lease_type:   s(fd, "lease_type")   ?? "long_term",
    mgmt_fee_pct: n(fd, "mgmt_fee_pct") ?? 5,
    vat_pct:      n(fd, "vat_pct")      ?? 12,
  };
}

// ---- owners ----
export async function createOwner(fd: FormData) { await insertRow("owners", ownerRow(fd), "/admin/owners"); }
export async function updateOwner(id: string, fd: FormData) { await updateRow("owners", id, ownerRow(fd), "/admin/owners"); }
export async function deleteOwner(id: string) { await deleteRow("owners", id, "/admin/owners"); }

// ---- tenants ----
export async function createTenant(fd: FormData) { await insertRow("tenants", tenantRow(fd), "/admin/tenants"); }
export async function updateTenant(id: string, fd: FormData) { await updateRow("tenants", id, tenantRow(fd), "/admin/tenants"); }
export async function deleteTenant(id: string) { await deleteRow("tenants", id, "/admin/tenants"); }

// ---- vendors ----
export async function createVendor(fd: FormData) { await insertRow("vendors", vendorRow(fd), "/admin/vendors"); }
export async function updateVendor(id: string, fd: FormData) { await updateRow("vendors", id, vendorRow(fd), "/admin/vendors"); }
export async function deleteVendor(id: string) { await deleteRow("vendors", id, "/admin/vendors"); }

// ---- properties ----
export async function createProperty(fd: FormData) { await insertRow("properties", propertyRow(fd), "/admin/properties"); }
export async function updateProperty(id: string, fd: FormData) { await updateRow("properties", id, propertyRow(fd), "/admin/properties"); }
export async function deleteProperty(id: string) { await deleteRow("properties", id, "/admin/properties"); }

// ---- units ----
export async function createUnit(fd: FormData) { await insertRow("units", unitRow(fd), "/admin/units"); }
export async function updateUnit(id: string, fd: FormData) { await updateRow("units", id, unitRow(fd), "/admin/units"); }
export async function deleteUnit(id: string) { await deleteRow("units", id, "/admin/units"); }

// ---- leases ----
export async function createLease(fd: FormData) {
  const supabase = await createClient();
  const row = leaseRow(fd);
  const { error } = await supabase.from("leases").insert(row);
  if (error) throw new Error(error.message);

  await syncUnitOccupancy(supabase, unitIdsToResyncForLeaseChange({
    previousUnitId: null,
    nextUnitId: row.unit_id,
  }));
  revalidatePath("/admin/leases");
  revalidatePath("/admin/units");
  redirect("/admin/leases");
}

export async function updateLease(id: string, fd: FormData) {
  const supabase = await createClient();
  const { data: previous, error: readError } = await supabase
    .from("leases")
    .select("unit_id")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const row = leaseRow(fd);
  const { error } = await supabase.from("leases").update(row).eq("id", id);
  if (error) throw new Error(error.message);

  await syncUnitOccupancy(supabase, unitIdsToResyncForLeaseChange({
    previousUnitId: (previous as { unit_id?: string | null } | null)?.unit_id,
    nextUnitId: row.unit_id,
  }));
  revalidatePath("/admin/leases");
  revalidatePath("/admin/units");
  redirect("/admin/leases");
}

export async function deleteLease(id: string) {
  const supabase = await createClient();
  const { data: previous, error: readError } = await supabase
    .from("leases")
    .select("unit_id")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  if (allowTestLeaseDelete()) {
    const { error: paymentIntentError } = await supabase
      .from("payment_intents")
      .delete()
      .eq("lease_id", id);
    if (paymentIntentError) throw new Error(paymentIntentError.message);

    const { error: ticketError } = await supabase
      .from("tickets")
      .delete()
      .eq("lease_id", id);
    if (ticketError) throw new Error(ticketError.message);

    const { error: invoiceError } = await supabase
      .from("invoices")
      .delete()
      .eq("lease_id", id);
    if (invoiceError) throw new Error(invoiceError.message);
  }

  const { error } = await supabase.from("leases").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      const message = allowTestLeaseDelete()
        ? "This lease still has related records and could not be deleted. Delete or detach the related test records, then try again."
        : "This lease has invoices, payments, or tickets attached, so it cannot be deleted. Change its status to ended, terminated, or archived instead.";
      redirect(`/admin/leases?error=${encodeURIComponent(message)}`);
    }
    throw new Error(error.message);
  }

  await syncUnitOccupancy(supabase, unitIdsToResyncForLeaseChange({
    previousUnitId: (previous as { unit_id?: string | null } | null)?.unit_id,
    nextUnitId: null,
  }));
  revalidatePath("/admin/leases");
  revalidatePath("/admin/units");
  redirect("/admin/leases");
}

// ---- charge templates ----
export async function createChargeTemplate(unitId: string, fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("charge_templates").insert({
    unit_id:       unitId,
    name:          s(fd, "name") ?? "Item",
    amount:        n(fd, "amount") ?? 0,
    billing_note:  s(fd, "billing_note"),
    template_type: s(fd, "template_type") ?? "utility",
    applies_to:    s(fd, "applies_to") ?? "both",
    sort_order:    n(fd, "sort_order") ?? 0,
    is_active:     true,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/units/${unitId}/edit`);
  redirect(`/admin/units/${unitId}/edit`);
}

export async function updateChargeTemplate(id: string, unitId: string, fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("charge_templates").update({
    name:          s(fd, "name") ?? "Item",
    amount:        n(fd, "amount") ?? 0,
    billing_note:  s(fd, "billing_note"),
    template_type: s(fd, "template_type") ?? "utility",
    applies_to:    s(fd, "applies_to") ?? "both",
    sort_order:    n(fd, "sort_order") ?? 0,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/units/${unitId}/edit`);
  redirect(`/admin/units/${unitId}/edit`);
}

export async function deleteChargeTemplate(id: string, unitId: string) {
  const supabase = await createClient();
  await supabase.from("charge_templates").delete().eq("id", id);
  revalidatePath(`/admin/units/${unitId}/edit`);
}

export async function toggleChargeTemplate(id: string, unitId: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("charge_templates").update({ is_active: active }).eq("id", id);
  revalidatePath(`/admin/units/${unitId}/edit`);
}
