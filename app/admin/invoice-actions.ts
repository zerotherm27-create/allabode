"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { renderPaymentReceiptPdf, METHOD_LABEL } from "@/lib/pdf/payment-receipt";
import { sendEmail } from "@/lib/email";

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
// Record a payment directly against a lease (no invoice required)
// Auto-generates a PDF acknowledgement receipt and emails the tenant.
// ============================================================
export async function recordPaymentOnLease(leaseId: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const amount     = n(fd, "amount") ?? 0;
  const method     = s(fd, "method") ?? "cash";
  const reference  = s(fd, "reference");
  const paymentFor = s(fd, "payment_for");
  const notes      = s(fd, "notes");
  const receivedAt = s(fd, "received_at") ?? new Date().toISOString().slice(0, 10);

  const { data: lease } = await supabase
    .from("leases").select("tenant_id").eq("id", leaseId).maybeSingle();
  if (!lease) throw new Error("Lease not found");

  const { data: payment, error } = await supabase.from("payments").insert({
    lease_id:    leaseId,
    tenant_id:   (lease as { tenant_id: string }).tenant_id,
    amount,
    method,
    reference,
    status:      "verified",
    received_at: receivedAt,
    recorded_by: user?.id ?? null,
    payment_for: paymentFor ?? null,
    notes,
  }).select("id").single();
  if (error) throw new Error(error.message);

  // Generate PDF receipt + email tenant (best-effort; never fails the action)
  try {
    await generateAndSendPaymentReceipt(supabase, payment.id, leaseId, user?.id ?? null);
  } catch (err) {
    console.warn("[receipt] generateAndSendPaymentReceipt failed:", err);
  }

  await logAudit(supabase, {
    action: "payment.recorded", entityType: "lease", entityId: leaseId,
    actorId: user?.id, metadata: { amount, method },
  });

  revalidatePath(`/admin/leases/${leaseId}/edit`);
  revalidatePath("/admin/leases");
}

// ── Receipt helpers ──────────────────────────────────────────

type DbClient = Awaited<ReturnType<typeof createClient>>;

function formatReceiptDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

async function generateAndSendPaymentReceipt(
  supabase: DbClient,
  paymentId: string,
  leaseId: string,
  actorId: string | null
): Promise<void> {
  // Fetch payment row
  const { data: rawPayment } = await supabase
    .from("payments")
    .select("id, amount, method, reference, payment_for, received_at, tenant_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!rawPayment) return;

  const pay = rawPayment as {
    id: string; amount: number; method: string;
    reference: string | null; payment_for: string | null;
    received_at: string; tenant_id: string | null;
  };

  // Fetch tenant
  const { data: tenantRaw } = pay.tenant_id
    ? await supabase.from("tenants").select("name, email").eq("id", pay.tenant_id).maybeSingle()
    : { data: null };

  const tenant = tenantRaw as { name: string; email: string } | null;
  if (!tenant?.email) return;

  // Fetch property address via lease → unit → property
  let propertyAddress = "";
  const { data: leaseRaw } = await supabase
    .from("leases")
    .select("units(unit_label, properties(name, address))")
    .eq("id", leaseId)
    .maybeSingle();
  if (leaseRaw) {
    const lr = leaseRaw as {
      units?: {
        unit_label?: string;
        properties?: { name?: string; address?: string } | null;
      } | null;
    };
    const unit = lr.units;
    const prop = unit?.properties ?? null;
    const propName = prop?.address ?? prop?.name ?? "";
    const unitLabel = unit?.unit_label ?? "";
    propertyAddress = [propName, unitLabel].filter(Boolean).join(" ");
  }

  // Fetch recorded-by staff name
  let receivedBy = "All Abode Staff";
  if (actorId) {
    const { data: actorRaw } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", actorId)
      .maybeSingle();
    if (actorRaw) {
      const a = actorRaw as { full_name?: string | null; email?: string | null };
      receivedBy = a.full_name ?? a.email ?? "All Abode Staff";
    }
  }

  const formattedDate  = formatReceiptDate(pay.received_at);
  const receiptNumber  = `REC-${paymentId.slice(0, 8).toUpperCase()}`;

  // Render PDF
  const buffer = await renderPaymentReceiptPdf({
    receiptNumber,
    date:            formattedDate,
    tenantName:      tenant.name,
    propertyAddress,
    amount:          Number(pay.amount),
    method:          pay.method,
    paymentFor:      pay.payment_for,
    remarks:         pay.reference,
    receivedBy,
  });

  // Upload to finance-docs bucket
  const pdfPath = `receipts/payment-${paymentId}.pdf`;
  await supabase.storage
    .from("finance-docs")
    .upload(pdfPath, buffer, { contentType: "application/pdf", upsert: true });

  // Save path on the payment row
  await supabase.from("payments").update({ receipt_pdf_path: pdfPath }).eq("id", paymentId);

  // Signed URL valid for 7 days so the tenant can download from the email
  const { data: signed } = await supabase.storage
    .from("finance-docs")
    .createSignedUrl(pdfPath, 60 * 60 * 24 * 7);

  // Email tenant
  await sendEmail({
    to:      tenant.email,
    subject: `Payment Acknowledgement Receipt — ${formattedDate}`,
    html:    buildReceiptEmail({
      receiptNumber,
      tenantName:    tenant.name,
      propertyAddress,
      amount:        Number(pay.amount),
      methodLabel:   METHOD_LABEL[pay.method] ?? pay.method,
      paymentFor:    pay.payment_for,
      remarks:       pay.reference,
      date:          formattedDate,
      receivedBy,
      receiptUrl:    signed?.signedUrl ?? null,
    }),
  });

  await logAudit(supabase, {
    action: "payment.receipt_sent", entityType: "payment", entityId: paymentId,
    actorId, metadata: { tenant_email: tenant.email, receipt_number: receiptNumber },
  });
}

function buildReceiptEmail({
  receiptNumber, tenantName, propertyAddress, amount,
  methodLabel, paymentFor, remarks, date, receivedBy, receiptUrl,
}: {
  receiptNumber: string; tenantName: string; propertyAddress: string;
  amount: number; methodLabel: string; paymentFor?: string | null;
  remarks?: string | null; date: string; receivedBy: string;
  receiptUrl: string | null;
}): string {
  const pesoFmt = (n: number) =>
    `PHP ${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const row = (label: string, value?: string | null) =>
    value
      ? `<tr>
           <td style="padding:10px 0;color:#5b6573;font-size:13px;width:42%;border-bottom:1px solid #e2e6ec;vertical-align:top;">${label}</td>
           <td style="padding:10px 0;color:#0a2540;font-weight:bold;font-size:13px;border-bottom:1px solid #e2e6ec;">${value}</td>
         </tr>`
      : "";

  const downloadBtn = receiptUrl
    ? `<p style="margin:28px 0 0;">
         <a href="${receiptUrl}"
            style="display:inline-block;background:#0a2540;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:6px;font-weight:bold;font-size:14px;">
           &#8681;&nbsp; Download PDF Receipt
         </a>
       </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:32px auto;border-radius:10px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#0a2540;padding:28px 36px;text-align:center;">
      <p style="margin:0;color:#b4975a;font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">All Abode Property Solutions</p>
      <h1 style="margin:10px 0 4px;color:#ffffff;font-size:20px;letter-spacing:2px;font-weight:bold;text-transform:uppercase;">Acknowledgement Receipt</h1>
      <p style="margin:0;color:rgba(255,255,255,0.45);font-size:11px;">${receiptNumber}</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:36px;">
      <p style="margin:0 0 28px;color:#374151;font-size:14px;line-height:1.7;">
        Dear <strong style="color:#0a2540;">${tenantName}</strong>,<br><br>
        We are pleased to confirm that your payment has been received and verified by All Abode Property Solutions. Please see the details below.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
        ${row("Date", date)}
        ${row("Property", propertyAddress)}
        ${row("Amount Received", `<span style="font-size:16px;">${pesoFmt(amount)}</span>`)}
        ${row("Mode of Payment", methodLabel)}
        ${row("Payment For", paymentFor)}
        ${row("Remarks", remarks)}
      </table>

      <div style="margin-top:24px;padding:16px 20px;background:#f8f6f1;border-left:4px solid #b4975a;border-radius:0 6px 6px 0;">
        <p style="margin:0;color:#5b6573;font-size:12px;line-height:1.6;">
          <strong style="color:#0a2540;">Received by:</strong>&nbsp; ${receivedBy}<br>
          <strong style="color:#0a2540;">Date:</strong>&nbsp; ${date}<br>
          <span style="font-size:11px;color:#9ca3af;">Authorized Representative</span>
        </p>
      </div>

      ${downloadBtn}

      <p style="margin:28px 0 0;color:#9ca3af;font-size:11px;line-height:1.7;">
        This is an automated notification from All Abode Property Solutions. Please keep this email for your records.<br>
        ${receiptUrl ? "The PDF download link is valid for 7 days." : ""}
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#0a2540;padding:20px 36px;text-align:center;">
      <p style="margin:0;color:rgba(255,255,255,0.45);font-size:11px;line-height:1.7;">
        &copy; All Abode Property Solutions &bull; PRC Licensed Real Estate Firm<br>
        This is your official acknowledgement receipt.
      </p>
    </div>

  </div>
</body>
</html>`;
}

// ============================================================
// Delete a payment record
// ============================================================
export async function updatePayment(paymentId: string, leaseId: string, fd: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const amount      = n(fd, "amount");
  const method      = s(fd, "method");
  const receivedAt  = s(fd, "received_at");
  const reference   = s(fd, "reference");
  const notes       = s(fd, "notes");
  if (!amount || !receivedAt) throw new Error("Amount and date are required.");

  const { error } = await supabase.from("payments").update({
    amount, method, received_at: receivedAt, reference, notes,
  }).eq("id", paymentId);
  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    action: "payment.updated", entityType: "payment", entityId: paymentId, actorId: user?.id,
  });

  revalidatePath(`/admin/leases/${leaseId}/edit`);
  redirect(`/admin/leases/${leaseId}/edit`);
}

export async function deletePayment(paymentId: string, leaseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) throw new Error(error.message);

  await logAudit(supabase, {
    action: "payment.deleted", entityType: "payment", entityId: paymentId, actorId: user?.id,
  });

  revalidatePath(`/admin/leases/${leaseId}/edit`);
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
