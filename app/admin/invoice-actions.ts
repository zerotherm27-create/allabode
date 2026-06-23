"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

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

type LeaseRow = {
  id: string;
  tenant_id: string;
  unit_id: string;
  rent_amount: number;
  units: { property_id: string; properties: { owner_id: string | null } | null } | null;
};

// ============================================================
// Create a draft invoice from a lease
// ============================================================
export async function createInvoice(fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const leaseId = s(fd, "lease_id");
  if (!leaseId) throw new Error("Lease is required");

  const { data: lease } = await supabase
    .from("leases")
    .select("id,tenant_id,unit_id,rent_amount,units(property_id,properties(owner_id))")
    .eq("id", leaseId)
    .maybeSingle();
  if (!lease) throw new Error("Lease not found");

  const l = lease as unknown as LeaseRow;
  const unit = l.units;
  const property = unit?.properties ?? null;

  const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");
  if (!invoiceNumber) throw new Error("Could not generate invoice number");

  const billingStart = s(fd, "billing_period_start") ?? "";
  const billingEnd   = s(fd, "billing_period_end") ?? "";
  const dueDate      = s(fd, "due_date") ?? "";
  const notes        = s(fd, "notes");
  const rentAmount   = Number(l.rent_amount);

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .insert({
      invoice_number:       invoiceNumber as string,
      lease_id:             leaseId,
      tenant_id:            l.tenant_id,
      unit_id:              l.unit_id,
      property_id:          unit?.property_id ?? "",
      owner_id:             property?.owner_id ?? null,
      billing_period_start: billingStart,
      billing_period_end:   billingEnd,
      due_date:             dueDate,
      status:               "draft",
      subtotal:             rentAmount,
      total_amount:         rentAmount,
      notes,
    })
    .select("id")
    .single();
  if (invErr) throw new Error(invErr.message);

  // Default line: Monthly Rent
  await supabase.from("invoice_lines").insert({
    invoice_id:  inv.id,
    description: "Monthly Rent",
    quantity:    1,
    unit_price:  rentAmount,
    amount:      rentAmount,
    sort_order:  0,
  });

  await logAudit(supabase, {
    action: "invoice.created", entityType: "invoice", entityId: inv.id, actorId: user?.id,
    metadata: { invoice_number: invoiceNumber, lease_id: leaseId },
  });

  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${inv.id}`);
}

// ============================================================
// Issue a draft invoice (makes it visible to the tenant)
// ============================================================
export async function issueInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("invoices")
    .update({ status: "issued", issued_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("status", "draft");
  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    action: "invoice.issued", entityType: "invoice", entityId: invoiceId, actorId: user?.id,
  });
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
}

// ============================================================
// Void an invoice
// ============================================================
export async function voidInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("invoices")
    .update({ status: "voided", voided_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .neq("status", "voided");
  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    action: "invoice.voided", entityType: "invoice", entityId: invoiceId, actorId: user?.id,
  });
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
}

// ============================================================
// Record a payment against an invoice
// ============================================================
export async function recordPaymentOnInvoice(invoiceId: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const amount = n(fd, "amount") ?? 0;
  const method = s(fd, "method") ?? "cash";
  const notes  = s(fd, "notes");

  const { data: invoice } = await supabase
    .from("invoices")
    .select("lease_id,tenant_id,amount_paid,total_amount")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) throw new Error("Invoice not found");

  const { error: payErr } = await supabase.from("payments").insert({
    lease_id:    invoice.lease_id,
    tenant_id:   invoice.tenant_id,
    amount,
    method,
    reference:   `INV-${invoiceId.slice(0, 8)}`,
    status:      "verified",
    received_at: new Date().toISOString().slice(0, 10),
    recorded_by: user?.id ?? null,
    notes,
  });
  if (payErr) throw new Error(payErr.message);

  const newPaid = Number(invoice.amount_paid) + amount;
  const newStatus =
    newPaid >= Number(invoice.total_amount) ? "paid" :
    newPaid > 0 ? "partially_paid" : "issued";

  await supabase.from("invoices")
    .update({ amount_paid: newPaid, status: newStatus })
    .eq("id", invoiceId);

  await logAudit(supabase, {
    action: "invoice.payment_recorded", entityType: "invoice", entityId: invoiceId,
    actorId: user?.id, metadata: { amount, method },
  });

  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
}

// ============================================================
// Bulk-generate monthly invoices for all active leases
// (runs against the current month; skips if already exists)
// ============================================================
export async function generateMonthlyInvoices() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date();
  const billingStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const billingEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const dueDate      = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);

  const { data: leases } = await supabase
    .from("leases")
    .select("id,tenant_id,unit_id,rent_amount,units(property_id,properties(owner_id))")
    .eq("status", "active");

  let created = 0;
  let skipped = 0;

  for (const lease of leases ?? []) {
    const l = lease as unknown as LeaseRow;

    // Skip if invoice already exists for this period
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("lease_id", l.id)
      .eq("billing_period_start", billingStart);
    if ((count ?? 0) > 0) { skipped++; continue; }

    const unit = l.units;
    const property = unit?.properties ?? null;
    const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");
    if (!invoiceNumber) continue;
    const rentAmount = Number(l.rent_amount);

    const { data: inv, error } = await supabase
      .from("invoices")
      .insert({
        invoice_number:       invoiceNumber as string,
        lease_id:             l.id,
        tenant_id:            l.tenant_id,
        unit_id:              l.unit_id,
        property_id:          unit?.property_id ?? "",
        owner_id:             property?.owner_id ?? null,
        billing_period_start: billingStart,
        billing_period_end:   billingEnd,
        due_date:             dueDate,
        status:               "draft",
        subtotal:             rentAmount,
        total_amount:         rentAmount,
      })
      .select("id")
      .single();
    if (error || !inv) continue;

    await supabase.from("invoice_lines").insert({
      invoice_id: inv.id, description: "Monthly Rent",
      quantity: 1, unit_price: rentAmount, amount: rentAmount, sort_order: 0,
    });
    created++;
  }

  await logAudit(supabase, {
    action: "invoice.bulk_generated", entityType: "invoice", entityId: null, actorId: user?.id,
    metadata: { created, skipped, billing_period_start: billingStart },
  });

  revalidatePath("/admin/invoices");
}
