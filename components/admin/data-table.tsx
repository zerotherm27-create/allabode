import type { ReactNode } from "react";

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  /** Used as the card title on mobile (defaults to the first column). */
  primary?: boolean;
  /** Right-align on desktop; rendered as a full-width footer row on mobile (e.g. actions). */
  align?: "right";
};

/**
 * Responsive admin list: a real `<table>` from `md` up, and stacked cards below `md`
 * (no horizontal scrolling on phones). `cell` render functions pass through anything,
 * including server-action `<form>` buttons. Brand tokens only.
 */
export function DataTable<T>({
  rows,
  columns,
  getKey,
  empty,
  minWidth = "720px",
}: {
  rows: T[];
  columns: Column<T>[];
  getKey: (row: T) => string;
  empty: ReactNode;
  minWidth?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface px-4 py-10 text-center text-sm text-slate">
        {empty}
      </div>
    );
  }

  const primaryIdx = Math.max(0, columns.findIndex((c) => c.primary));

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface md:block">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead className="border-b border-line bg-surface-gray text-slate">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className={`px-4 py-3 font-medium ${c.align === "right" ? "text-right" : ""}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={getKey(row)}>
                {columns.map((c, i) => (
                  <td key={i} className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <div key={getKey(row)} className="rounded-lg border border-line bg-surface p-4">
            <div className="font-medium text-navy">{columns[primaryIdx].cell(row)}</div>
            <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
              {columns.map((c, i) => {
                if (i === primaryIdx) return null;
                if (c.align === "right") {
                  return (
                    <div key={i} className="flex items-center justify-end pt-1">
                      {c.cell(row)}
                    </div>
                  );
                }
                return (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <span className="text-xs text-slate">{c.header}</span>
                    <span className="text-right text-sm text-ink">{c.cell(row)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
