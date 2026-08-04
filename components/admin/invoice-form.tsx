"use client";

import { useState } from "react";
import Link from "next/link";
import { F, Group, inputCls, SubmitButton } from "@/components/admin/form-kit";
import { InvoiceLineItemsEditor, type InvoiceLineItemDraft } from "@/components/admin/invoice-line-items-editor";

export type LeaseOption = {
  id: string;
  label: string;
  tenant_name: string;
  unit_label: string;
  property_name: string;
  rent_amount: number;
};

const peso = (n: number) => `₱${Number(n).toLocaleString("en-PH")}`;

function defaultDates() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return {
    start:   new Date(y, m, 1).toISOString().slice(0, 10),
    end:     new Date(y, m + 1, 0).toISOString().slice(0, 10),
    due:     new Date(y, m + 1, 5).toISOString().slice(0, 10),
  };
}

export function InvoiceForm({
  action,
  leases,
  defaultLeaseId,
}: {
  action: (fd: FormData) => void;
  leases: LeaseOption[];
  defaultLeaseId?: string;
}) {
  const d = defaultDates();
  const initialLease = defaultLeaseId ? (leases.find((l) => l.id === defaultLeaseId) ?? null) : null;
  const [selected, setSelected] = useState<LeaseOption | null>(initialLease);
  const [start, setStart] = useState(d.start);
  const [end, setEnd]     = useState(d.end);
  const [due, setDue]     = useState(d.due);
  const [items, setItems] = useState<InvoiceLineItemDraft[]>(
    initialLease ? [{ description: "Monthly Rent", quantity: 1, unit_price: initialLease.rent_amount }] : []
  );

  function selectLease(l: LeaseOption | null) {
    setSelected(l);
    setItems(l ? [{ description: "Monthly Rent", quantity: 1, unit_price: l.rent_amount }] : []);
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="line_items" value={JSON.stringify(items)} />
      <Group title="Lease">
        <F label="Lease" span>
          <select
            name="lease_id"
            required
            className={inputCls}
            defaultValue={defaultLeaseId ?? ""}
            onChange={(e) =>
              selectLease(leases.find((l) => l.id === e.target.value) ?? null)
            }
          >
            <option value="">— select a lease —</option>
            {leases.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </F>
        {selected && (
          <div className="sm:col-span-2 grid grid-cols-3 gap-4 rounded-md bg-surface-gray px-4 py-3 text-sm">
            <div>
              <p className="text-xs text-slate">Tenant</p>
              <p className="font-medium text-navy">{selected.tenant_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate">Unit</p>
              <p className="font-medium text-navy">{selected.unit_label}</p>
            </div>
            <div>
              <p className="text-xs text-slate">Rent</p>
              <p className="font-medium text-navy">{peso(selected.rent_amount)}</p>
            </div>
          </div>
        )}
      </Group>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Line items</legend>
        {items.length === 0 && (
          <p className="mb-3 text-sm text-slate">Select a lease to auto-fill rent, or add an item below.</p>
        )}
        <InvoiceLineItemsEditor items={items} onChange={setItems} />
      </fieldset>

      <Group title="Billing period">
        <F label="Period start">
          <input
            name="billing_period_start" type="date" required
            value={start} onChange={(e) => setStart(e.target.value)}
            className={inputCls}
          />
        </F>
        <F label="Period end">
          <input
            name="billing_period_end" type="date" required
            value={end} onChange={(e) => setEnd(e.target.value)}
            className={inputCls}
          />
        </F>
        <F label="Due date">
          <input
            name="due_date" type="date" required
            value={due} onChange={(e) => setDue(e.target.value)}
            className={inputCls}
          />
        </F>
      </Group>

      <Group title="Notes">
        <F label="Notes (optional)" span>
          <textarea name="notes" rows={3} className={`${inputCls} h-auto py-2`} />
        </F>
      </Group>

      <div className="flex items-center gap-3">
        <SubmitButton label="Create invoice" />
        <Link href="/admin/invoices" className="text-sm font-medium text-slate hover:text-navy">
          Cancel
        </Link>
      </div>
    </form>
  );
}
