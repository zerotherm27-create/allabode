import type { RankedItem } from "@/lib/analytics/aggregate";

/** Horizontal ranked list with a proportional background-fill bar — legible
 *  for a small number of categories without a categorical color palette. */
export function RankedBarList({
  title,
  items,
  emptyLabel = "No data yet",
}: {
  title: string;
  items: RankedItem[];
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h3 className="font-display text-sm font-semibold text-navy">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.map((item) => (
            <li key={item.label} className="relative overflow-hidden rounded-md">
              <div
                className="absolute inset-y-0 left-0 rounded-md bg-navy/8"
                style={{ width: `${Math.max(item.pct, 2)}%` }}
                aria-hidden="true"
              />
              <div className="relative flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="truncate text-navy">{item.label}</span>
                <span className="shrink-0 tabular-nums text-slate">
                  {item.count.toLocaleString()}
                  <span className="ml-1.5 text-slate-soft">{item.pct.toFixed(0)}%</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
