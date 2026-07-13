export type LineItemCategory = "furnishing" | "repairs" | "others";
export type LineItemPricingMode = "unit" | "lump_sum";

export type QuotationLineItem = {
  category: LineItemCategory;
  pricingMode: LineItemPricingMode;
  /** The kind of item, e.g. "Sofa", "Refrigerator", "Electrical rewiring" — from the suggested picker or typed directly. */
  item: string;
  /** Admin's custom free text — brand, model, color, specifics. */
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
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

/** The itemized sum, unless a manual grand-total override is set (e.g. a package/discounted price) — the override wins. */
export function resolveGrandTotal(lineItems: QuotationLineItem[], grandTotalOverride: number | null): number {
  return grandTotalOverride != null ? grandTotalOverride : computeGrandTotal(lineItems);
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** URL/filename-safe slug — lowercased, non-alphanumerics collapsed to single hyphens. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "quotation";
}
