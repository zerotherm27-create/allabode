"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const supabase = createAdminClient();
  const { error } = await supabase.from(table).insert(row);
  if (error) throw new Error(error.message);
  revalidatePath(listPath);
  redirect(listPath);
}
async function updateRow(table: string, id: string, row: Record<string, unknown>, listPath: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from(table).update(row).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(listPath);
  redirect(listPath);
}
async function deleteRow(table: string, id: string, listPath: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(listPath);
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
    notice_period_days: n(fd, "notice_period_days"),
    status: s(fd, "status") ?? "draft",
    terms: s(fd, "terms"),
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
export async function createLease(fd: FormData) { await insertRow("leases", leaseRow(fd), "/admin/leases"); }
export async function updateLease(id: string, fd: FormData) { await updateRow("leases", id, leaseRow(fd), "/admin/leases"); }
export async function deleteLease(id: string) { await deleteRow("leases", id, "/admin/leases"); }
