import { View } from "@react-pdf/renderer";
import type { ComponentProps, ReactNode } from "react";

type ViewStyle = ComponentProps<typeof View>["style"];

/**
 * Bordered table that never splits awkwardly across pages.
 *  - rows are individually unbreakable;
 *  - the header row always travels with the first data row (no stranded header);
 *  - a table of `maxUnbroken` rows or fewer moves to the next page as a whole when it won't fit;
 *    a longer one may break between rows.
 * No vertical margin on `style` (react-pdf mis-splits bordered Views that have margins).
 */
export function KeepTable({
  style, header, rows, maxUnbroken = 12,
}: {
  style: ViewStyle;
  header?: ReactNode;
  rows: ReactNode[];
  maxUnbroken?: number;
}) {
  const all = header ? [header, ...rows] : rows;
  const body = rows.length + (header ? 1 : 0);
  return (
    <View style={style} wrap={body > maxUnbroken}>
      {all.map((r, i) => {
        // header + first data row form one unbreakable group
        if (header && i === 0) return <View key={i} wrap={false}>{r}{rows[0] ?? null}</View>;
        if (header && i === 1) return null;
        return <View key={i} wrap={false}>{r}</View>;
      })}
    </View>
  );
}
