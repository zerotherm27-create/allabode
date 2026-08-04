"use client";

import { inputCls } from "@/components/admin/form-kit";

export type InvoiceLineItemDraft = { description: string; quantity: number; unit_price: number };

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function emptyLineItem(): InvoiceLineItemDraft {
  return { description: "", quantity: 1, unit_price: 0 };
}

export function InvoiceLineItemsEditor({
  items,
  onChange,
}: {
  items: InvoiceLineItemDraft[];
  onChange: (items: InvoiceLineItemDraft[]) => void;
}) {
  function setItem(i: number, patch: Partial<InvoiceLineItemDraft>) {
    onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }
  function removeItem(i: number) {
    if (items.length <= 1) return;
    onChange(items.filter((_, j) => j !== i));
  }
  const total = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);

  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => (
        <div
          key={i}
          className="grid grid-cols-2 items-center gap-2 rounded-md border border-line bg-cream/40 p-2.5 sm:grid-cols-[2fr_0.7fr_1fr_1fr_1.75rem]"
        >
          <input
            aria-label="Description"
            placeholder="Description"
            value={it.description}
            onChange={(e) => setItem(i, { description: e.target.value })}
            className={`${inputCls} col-span-2 sm:col-span-1`}
          />
          <input
            aria-label="Quantity"
            type="number" min={0} step="1"
            value={it.quantity}
            onChange={(e) => setItem(i, { quantity: Number(e.target.value) || 0 })}
            className={inputCls}
          />
          <input
            aria-label="Unit price"
            type="number" min={0} step="0.01"
            value={it.unit_price}
            onChange={(e) => setItem(i, { unit_price: Number(e.target.value) || 0 })}
            className={inputCls}
          />
          <span className="text-right text-sm font-medium text-navy">{peso(it.quantity * it.unit_price)}</span>
          <button
            type="button"
            aria-label="Remove item"
            onClick={() => removeItem(i)}
            disabled={items.length <= 1}
            className="self-center text-sm font-semibold text-slate hover:text-error disabled:opacity-30"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange([...items, emptyLineItem()])}
          className="text-xs font-semibold text-navy-700 underline"
        >
          + Add item
        </button>
        <p className="text-sm font-semibold text-navy">Total: {peso(total)}</p>
      </div>
    </div>
  );
}
