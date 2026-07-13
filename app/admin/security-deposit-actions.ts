"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

// ─── Security deposits ────────────────────────────────────────────

export async function recordDeposit(leaseId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const amountHeld  = parseFloat(str(formData, "amount_held") ?? "0");
  const monthsHeld  = parseFloat(str(formData, "months_held") ?? "2");
  const receivedAt  = str(formData, "received_at");
  const method      = str(formData, "payment_method");
  const notes       = str(formData, "notes");
  const depositType = str(formData, "deposit_type") === "advance" ? "advance" : "security";
  if (!receivedAt || isNaN(amountHeld) || amountHeld <= 0) throw new Error("Amount and date are required.");

  // Resolve tenant_id, owner_id, unit_id from the lease
  const { data: lease } = await supabase
    .from("leases")
    .select("tenant_id,unit_id,units(property_id,properties(owner_id))")
    .eq("id", leaseId)
    .maybeSingle();
  if (!lease) throw new Error("Lease not found.");

  type LeaseWithUnit = { tenant_id: string | null; unit_id: string; units: { property_id: string; properties: { owner_id: string } | null } | null };
  const l = lease as unknown as LeaseWithUnit;
  const unitId  = l.unit_id;
  const ownerId = (l.units?.properties as { owner_id?: string } | null)?.owner_id ?? null;
  const tenantId   = l.tenant_id;

  const { data: dep, error } = await supabase
    .from("security_deposits")
    .insert({
      lease_id: leaseId,
      tenant_id: tenantId,
      owner_id: ownerId,
      unit_id: unitId,
      deposit_type: depositType,
      months_held: monthsHeld,
      amount_held: amountHeld,
      received_at: receivedAt,
      payment_method: method,
      notes,
      status: "held",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    action: "deposit.recorded",
    entityType: "security_deposit",
    entityId: (dep as { id: string }).id,
    actorId: user?.id,
    metadata: { leaseId, amountHeld, monthsHeld, depositType },
  });

  revalidatePath(`/admin/leases/${leaseId}/edit`);
  revalidatePath("/admin/security-deposits");
}

export async function processDepositReturn(depositId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const returnedAmount = parseFloat(str(formData, "returned_amount") ?? "0");
  const returnedAt     = str(formData, "returned_at");
  const returnNotes    = str(formData, "return_notes");
  if (!returnedAt) throw new Error("Return date is required.");

  // Parse deductions: desc_0/amount_0 … desc_4/amount_4
  const deductions: { description: string; amount: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const desc = ((formData.get(`ded_desc_${i}`) as string | null) ?? "").trim();
    const amt  = parseFloat((formData.get(`ded_amount_${i}`) as string | null) ?? "");
    if (desc && !isNaN(amt) && amt > 0) deductions.push({ description: desc, amount: amt });
  }

  const { data: dep } = await supabase
    .from("security_deposits")
    .select("amount_held")
    .eq("id", depositId)
    .maybeSingle();
  const amountHeld = Number((dep as { amount_held?: number } | null)?.amount_held ?? 0);
  const dedTotal   = deductions.reduce((s, d) => s + d.amount, 0);
  const status     = returnedAmount < amountHeld - dedTotal + 0.01 ? "partially_returned" : "returned";

  await supabase.from("security_deposits").update({
    status,
    returned_amount:   returnedAmount,
    return_deductions: deductions,
    returned_at:       returnedAt,
    return_notes:      returnNotes,
  }).eq("id", depositId);

  await logAudit(supabase, {
    action: "deposit.returned",
    entityType: "security_deposit",
    entityId: depositId,
    actorId: user?.id,
    metadata: { returnedAmount, deductions, status },
  });

  revalidatePath(`/admin/security-deposits/${depositId}`);
  revalidatePath("/admin/security-deposits");
}

export async function processDepositForfeiture(depositId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const forfeitedAmount = parseFloat(str(formData, "forfeited_amount") ?? "0");
  const forfeitedAt     = str(formData, "forfeited_at");
  const reason          = str(formData, "forfeiture_reason");
  if (!forfeitedAt || !reason) throw new Error("Date and reason are required.");

  await supabase.from("security_deposits").update({
    status:           "forfeited",
    forfeited_amount: forfeitedAmount,
    forfeiture_reason: reason,
    forfeited_at:     forfeitedAt,
  }).eq("id", depositId);

  await logAudit(supabase, {
    action: "deposit.forfeited",
    entityType: "security_deposit",
    entityId: depositId,
    actorId: user?.id,
    metadata: { forfeitedAmount, reason },
  });

  revalidatePath(`/admin/security-deposits/${depositId}`);
  revalidatePath("/admin/security-deposits");
}

// ─── Lease commissions ────────────────────────────────────────────

export async function recordCommission(leaseId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const amount          = parseFloat(str(formData, "amount") ?? "0");
  const commissionType  = str(formData, "commission_type") ?? "new_lease";
  const description     = str(formData, "description");
  const notes           = str(formData, "notes");
  if (isNaN(amount) || amount <= 0) throw new Error("Amount is required.");

  // Resolve owner from lease
  const { data: lease } = await supabase
    .from("leases")
    .select("unit_id,units(property_id,properties(owner_id))")
    .eq("id", leaseId)
    .maybeSingle();
  type LU = { unit_id: string; units: { property_id: string; properties: { owner_id: string } | null } | null };
  const l = lease as LU | null;
  const ownerId = (l?.units?.properties as { owner_id?: string } | null)?.owner_id ?? null;

  const { data: comm, error } = await supabase
    .from("lease_commissions")
    .insert({
      lease_id: leaseId,
      owner_id: ownerId,
      commission_type: commissionType,
      description,
      amount,
      notes,
      status: "pending",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    action: "commission.recorded",
    entityType: "lease_commission",
    entityId: (comm as { id: string }).id,
    actorId: user?.id,
    metadata: { leaseId, amount, commissionType },
  });

  revalidatePath(`/admin/leases/${leaseId}/edit`);
  revalidatePath("/admin/security-deposits");
}

export async function waiveCommission(commissionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("lease_commissions")
    .update({ status: "waived" })
    .eq("id", commissionId)
    .eq("status", "pending");

  await logAudit(supabase, {
    action: "commission.waived",
    entityType: "lease_commission",
    entityId: commissionId,
    actorId: user?.id,
  });

  revalidatePath("/admin/security-deposits");
}

export async function updateDeposit(depositId: string, leaseId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const amountHeld = parseFloat(str(formData, "amount_held") ?? "0");
  const monthsHeld = parseFloat(str(formData, "months_held") ?? "2");
  const receivedAt = str(formData, "received_at");
  const method     = str(formData, "payment_method");
  const notes      = str(formData, "notes");
  const depositType = str(formData, "deposit_type") === "advance" ? "advance" : "security";
  if (!receivedAt || isNaN(amountHeld) || amountHeld <= 0) throw new Error("Amount and date are required.");

  await supabase.from("security_deposits").update({
    amount_held: amountHeld, months_held: monthsHeld, deposit_type: depositType,
    received_at: receivedAt, payment_method: method, notes,
  }).eq("id", depositId).eq("status", "held");

  await logAudit(supabase, {
    action: "deposit.updated", entityType: "security_deposit", entityId: depositId, actorId: user?.id,
  });

  revalidatePath(`/admin/security-deposits/${depositId}`);
  revalidatePath(`/admin/leases/${leaseId}/edit`);
  redirect(`/admin/security-deposits/${depositId}`);
}

export async function updateCommission(commissionId: string, leaseId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const amount         = parseFloat(str(formData, "amount") ?? "0");
  const commissionType = str(formData, "commission_type") ?? "new_lease";
  const description    = str(formData, "description");
  const notes          = str(formData, "notes");
  if (isNaN(amount) || amount <= 0) throw new Error("Amount is required.");

  await supabase.from("lease_commissions").update({
    amount, commission_type: commissionType, description, notes,
  }).eq("id", commissionId).eq("status", "pending");

  await logAudit(supabase, {
    action: "commission.updated", entityType: "lease_commission", entityId: commissionId, actorId: user?.id,
  });

  revalidatePath(`/admin/leases/${leaseId}/edit`);
  redirect(`/admin/leases/${leaseId}/edit`);
}

export async function deleteDeposit(depositId: string, leaseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("security_deposits").delete().eq("id", depositId);
  await logAudit(supabase, {
    action: "deposit.deleted",
    entityType: "security_deposit",
    entityId: depositId,
    actorId: user?.id,
  });

  revalidatePath(`/admin/leases/${leaseId}/edit`);
  revalidatePath("/admin/security-deposits");
  redirect("/admin/security-deposits");
}
