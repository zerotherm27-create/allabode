export type LineItemCategory = "furnishing" | "repairs" | "others";

export type QuotationLineItem = {
  category: LineItemCategory;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  notes: string;
};

export type ProgressMilestone = {
  description: string;
  percentageOrAmount: string;
  triggerCondition: string;
};

export const LINE_ITEM_CATEGORIES: { value: LineItemCategory; label: string }[] = [
  { value: "furnishing", label: "Unit Furnishing" },
  { value: "repairs", label: "Repairs & Improvement" },
  { value: "others", label: "Others (Renovation / Fit-out)" },
];

export const LINE_ITEM_CATEGORY_LABEL: Record<LineItemCategory, string> = {
  furnishing: "Unit Furnishing",
  repairs: "Repairs & Improvement",
  others: "Others (Renovation / Fit-out)",
};

export function computeCategoryTotals(lineItems: QuotationLineItem[]): Record<LineItemCategory, number> {
  const totals: Record<LineItemCategory, number> = { furnishing: 0, repairs: 0, others: 0 };
  for (const item of lineItems) {
    totals[item.category] = (totals[item.category] ?? 0) + (Number(item.amount) || 0);
  }
  return totals;
}

export function computeGrandTotal(lineItems: QuotationLineItem[]): number {
  const totals = computeCategoryTotals(lineItems);
  return totals.furnishing + totals.repairs + totals.others;
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
