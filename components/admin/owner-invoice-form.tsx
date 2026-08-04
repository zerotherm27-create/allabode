"use client";

import { useState } from "react";
import Link from "next/link";
import { F, Group, inputCls, SubmitButton } from "@/components/admin/form-kit";
import { InvoiceLineItemsEditor, emptyLineItem, type InvoiceLineItemDraft } from "@/components/admin/invoice-line-items-editor";

export type UnitOption = {
  id: string;
  label: string;
  unit_label: string;
  property_name: string;
  owner_name: string;
};

function defaultDueDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15).toISOString().slice(0, 10);
}

export function OwnerInvoiceForm({
  action,
  units,
}: {
  action: (fd: FormData) => void;
  units: UnitOption[];
}) {
  const [selected, setSelected] = useState<UnitOption | null>(null);
  const [due, setDue] = useState(defaultDueDate());
  const [items, setItems] = useState<InvoiceLineItemDraft[]>([emptyLineItem()]);

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="line_items" value={JSON.stringify(items)} />
      <Group title="Unit">
        <F label="Unit" span>
          <select
            name="unit_id"
            required
            className={inputCls}
            defaultValue=""
            onChange={(e) => setSelected(units.find((u) => u.id === e.target.value) ?? null)}
          >
            <option value="">— select a unit —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        </F>
        {selected && (
          <div className="sm:col-span-2 grid grid-cols-3 gap-4 rounded-md bg-surface-gray px-4 py-3 text-sm">
            <div>
              <p className="text-xs text-slate">Property</p>
              <p className="font-medium text-navy">{selected.property_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate">Unit</p>
              <p className="font-medium text-navy">{selected.unit_label}</p>
            </div>
            <div>
              <p className="text-xs text-slate">Owner</p>
              <p className="font-medium text-navy">{selected.owner_name}</p>
            </div>
          </div>
        )}
      </Group>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-2 font-display text-sm font-semibold text-navy">Line items</legend>
        <InvoiceLineItemsEditor items={items} onChange={setItems} />
      </fieldset>

      <Group title="Due date">
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
