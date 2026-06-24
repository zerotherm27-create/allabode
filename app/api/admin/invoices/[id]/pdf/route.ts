import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderInvoicePdf } from "@/lib/pdf/invoice";

type LineRow = { description: string; quantity: number; unit_price: number; amount: number };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data } = await supabase
    .from("invoices")
    .select(`
      id, invoice_number, created_at, issued_at, due_date, status,
      billing_period_start, billing_period_end,
      subtotal, tax_amount, total_amount, amount_paid, notes,
      tenants(name,email),
      units(unit_label,properties(name,address)),
      invoice_lines(description,quantity,unit_price,amount,sort_order)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!data) return new NextResponse("Not found", { status: 404 });

  const inv = data as Record<string, unknown>;
  const tenant = Array.isArray(inv.tenants) ? inv.tenants[0] : inv.tenants as { name: string; email: string | null } | null;
  const unit   = Array.isArray(inv.units)   ? inv.units[0]   : inv.units   as { unit_label: string; properties: { name: string; address: string | null } | null } | null;
  const prop   = unit ? (Array.isArray((unit as { properties: unknown }).properties) ? (unit as { properties: { name: string; address: string | null }[] }).properties[0] : (unit as { properties: { name: string; address: string | null } | null }).properties) : null;
  const rawLines = (Array.isArray(inv.invoice_lines) ? inv.invoice_lines : []) as (LineRow & { sort_order: number })[];
  const lines = rawLines.sort((a, b) => a.sort_order - b.sort_order);

  const pdf = await renderInvoicePdf({
    invoiceNumber:      String(inv.invoice_number),
    createdAt:          String(inv.created_at),
    issuedAt:           inv.issued_at ? String(inv.issued_at) : null,
    dueDate:            String(inv.due_date),
    status:             String(inv.status),
    billingPeriodStart: String(inv.billing_period_start),
    billingPeriodEnd:   String(inv.billing_period_end),
    tenantName:         (tenant as { name?: string } | null)?.name ?? "Tenant",
    tenantEmail:        (tenant as { email?: string | null } | null)?.email ?? null,
    unitLabel:          (unit   as { unit_label?: string } | null)?.unit_label ?? "",
    propertyName:       (prop   as { name?: string } | null)?.name ?? "",
    propertyAddress:    (prop   as { address?: string | null } | null)?.address ?? null,
    lines:              lines.map((l) => ({ description: l.description, quantity: Number(l.quantity), unitPrice: Number(l.unit_price), amount: Number(l.amount) })),
    subtotal:           Number(inv.subtotal),
    taxAmount:          Number(inv.tax_amount),
    totalAmount:        Number(inv.total_amount),
    amountPaid:         Number(inv.amount_paid),
    notes:              inv.notes ? String(inv.notes) : null,
  });

  const filename = `${String(inv.invoice_number).replace(/[^a-z0-9-]/gi, "_")}.pdf`;
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
